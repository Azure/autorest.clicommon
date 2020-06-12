import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme, ComplexSchema, Operation, OperationGroup, Parameter, VirtualParameter, ImplementationLocation } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { Helper } from "../helper";
import { CliConst, M4Node, CliCommonSchema } from "../schema";
import { Dumper } from "../dumper";
import { Dictionary, values } from '@azure-tools/linq';
import { NodeHelper, NodeCliHelper, NodeExtensionHelper } from "../nodeHelper";
import { FlattenHelper } from "../flattenHelper";


export class PolyAsParamModifier {

    constructor(protected session: Session<CodeModel>) {
    }

    public process() {
        this.processPolyAsParam();
    }

    private buildSubclassParamName(baseParam: Parameter, subClassName: string) {
        return `${baseParam.language.default.name}_${subClassName}`;
    }

    /**
     * a simple object clone by using Json serialize and parse
     * @param obj
     */
    private cloneObject<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj)) as T;
    }

    private cloneParamForSubclass(p: Parameter, newParamName: string, newSchema: ObjectSchema) {

        const newParam = new Parameter(newParamName, p.language.default.description, newSchema, {
            implementation: p.implementation,
            extensions: {},
            language: this.cloneObject(p.language),
            protocol: p.protocol,
        });

        newParam.language.default.name = newParamName;

        for (let key in p)
            if (isNullOrUndefined(newParam[key]))
                newParam[key] = p[key];

        NodeExtensionHelper.setPolyAsParamBaseSchema(newParam, p.schema);
        return newParam
    }

    public processPolyAsParam() {

        let getDefaultRequest = (op: Operation) => op.requests[0];

        this.session.model.operationGroups.forEach(g => {
            if (g.operations.findIndex(op => op.requests.length > 1) >= 0)
                throw Error("Multiple requests in one operation found! not supported yet");

            // we need to modify the operations array, so get a copy of it first
            let operations = g.operations.filter(op => op.requests?.length == 1);

            operations.forEach(op => {

                let request = getDefaultRequest(op);
                if (isNullOrUndefined(request.parameters))
                    return;
                let allPolyParam: Parameter[] = request.parameters.filter(p =>
                    p.schema instanceof ObjectSchema &&
                    (p.schema as ObjectSchema).discriminator);
                if (allPolyParam.length == 0)
                    return;

                for (let polyParam of allPolyParam) {
                    if (NodeCliHelper.getComplexity(polyParam.schema) !== CliCommonSchema.CodeModel.Complexity.object_simple) {
                        Helper.logWarning(`Skip on complex poly param: ${NodeCliHelper.getCliKey(polyParam, '<clikey-missing>')}(${NodeCliHelper.getCliKey(polyParam, '<clikey-missing>')})`)
                        continue;
                    }

                    if (NodeHelper.getJson(polyParam)) {
                        Helper.logWarning(`Skip poly object with json flag: ${NodeCliHelper.getCliKey(polyParam, '<clikey-missing>')}(${NodeCliHelper.getCliKey(polyParam, '<clikey-missing>')})`);
                        continue;
                    }

                    let baseSchema = polyParam.schema as ObjectSchema;
                    let allSubClass = baseSchema.discriminator.all;

                    for (let key in allSubClass) {
                        let subClass = allSubClass[key];
                        if (!(subClass instanceof ObjectSchema)) {
                            Helper.logWarning("subclass is not ObjectSchema: " + subClass.language.default.name);
                            continue;
                        }
                        if (NodeHelper.HasSubClass(subClass)) {
                            Helper.logWarning("skip subclass which also has subclass: " + subClass.language.default.name);
                            continue;
                        }

                        let param2: Parameter = this.cloneParamForSubclass(polyParam, this.buildSubclassParamName(polyParam, key), subClass);
                        NodeExtensionHelper.setPolyAsParamOriginalParam(param2, polyParam);
                        request.addParameter(param2);
                    }

                    NodeCliHelper.setPolyAsParamExpanded(polyParam, true);
                }
            });
        });
    }
}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);

    Helper.dumper.dumpCodeModel('poly-as-param-pre');

    if ((await session.getValue('cli.polymorphism.expand-as-param', false)) === true) {
        let rd = new PolyAsParamModifier(session);
        rd.process();
    }

    Helper.dumper.dumpCodeModel('poly-as-param-post');

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}