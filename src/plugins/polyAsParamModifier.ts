import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, ObjectSchema, Operation, Parameter, codeModelSchema } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { CliCommonSchema } from "../schema";
import { NodeHelper, NodeCliHelper, NodeExtensionHelper } from "../nodeHelper";

export class PolyAsParamModifier {

    constructor(protected session: Session<CodeModel>) {
    }

    public process(): void {
        this.processPolyAsParam();
    }

    private buildSubclassParamName(baseParam: Parameter, subClassName: string): string {
        return `${baseParam.language.default.name}_${subClassName}`;
    }

    /**
     * a simple object clone by using Json serialize and parse
     * @param obj
     */
    private cloneObject<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj)) as T;
    }

    private cloneParamForSubclass(p: Parameter, newParamName: string, newSchema: ObjectSchema): Parameter {

        const newParam = new Parameter(newParamName, p.language.default.description, newSchema, {
            implementation: p.implementation,
            extensions: {},
            language: this.cloneObject(p.language),
            protocol: p.protocol,
        });

        newParam.language.default.name = newParamName;

        for (const key in p)
            if (isNullOrUndefined(newParam[key]))
                newParam[key] = p[key];

        NodeExtensionHelper.setPolyAsParamBaseSchema(newParam, p.schema);
        return newParam;
    }

    public processPolyAsParam(): void {

        const getDefaultRequest = (op: Operation) => op.requests[0];

        this.session.model.operationGroups.forEach(g => {
            if (g.operations.findIndex(op => op.requests.length > 1) >= 0)
                throw Error("Multiple requests in one operation found! not supported yet");

            // we need to modify the operations array, so get a copy of it first
            const operations = g.operations.filter(op => op.requests?.length == 1);

            operations.forEach(op => {

                const request = getDefaultRequest(op);
                if (isNullOrUndefined(request.parameters))
                    return;
                const allPolyParam: Parameter[] = request.parameters.filter(p =>
                    Helper.isObjectSchema(p.schema) &&
                    (p.schema as ObjectSchema).discriminator);
                if (allPolyParam.length == 0)
                    return;

                for (const polyParam of allPolyParam) {
                    if (NodeCliHelper.getComplexity(polyParam.schema) !== CliCommonSchema.CodeModel.Complexity.object_simple) {
                        Helper.logWarning(this.session, `Skip on complex poly param: ${NodeCliHelper.getCliKey(polyParam, '<clikey-missing>')}(${NodeCliHelper.getCliKey(polyParam, '<clikey-missing>')})`);
                        continue;
                    }

                    if (NodeHelper.getJson(polyParam)) {
                        Helper.logWarning(this.session, `Skip poly object with json flag: ${NodeCliHelper.getCliKey(polyParam, '<clikey-missing>')}(${NodeCliHelper.getCliKey(polyParam, '<clikey-missing>')})`);
                        continue;
                    }

                    const baseSchema = polyParam.schema as ObjectSchema;
                    const allSubClass = baseSchema.discriminator.all;

                    for (const key in allSubClass) {
                        const subClass = allSubClass[key];
                        if (!Helper.isObjectSchema(subClass)) {
                            Helper.logWarning(this.session, "subclass is not ObjectSchema: " + subClass.language.default.name);
                            continue;
                        }
                        if (NodeHelper.HasSubClass(subClass as ObjectSchema)) {
                            Helper.logWarning(this.session, "skip subclass which also has subclass: " + subClass.language.default.name);
                            continue;
                        }

                        const param2: Parameter = this.cloneParamForSubclass(polyParam, this.buildSubclassParamName(polyParam, key), subClass as ObjectSchema);
                        NodeExtensionHelper.setPolyAsParamOriginalParam(param2, polyParam);
                        request.addParameter(param2);
                    }

                    NodeCliHelper.setPolyAsParamExpanded(polyParam, true);
                }
            });
        });
    }
}

export async function processRequest(host: Host): Promise<void> {
    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    const dumper = await Helper.getDumper(session);

    dumper.dumpCodeModel('poly-as-param-pre', session.model);

    if ((await session.getValue('cli.polymorphism.expand-as-param', false)) === true) {
        const rd = new PolyAsParamModifier(session);
        rd.process();
    }

    dumper.dumpCodeModel('poly-as-param-post', session.model);

    await Helper.outputToModelerfour(host, session);
    await dumper.persistAsync(host);
}