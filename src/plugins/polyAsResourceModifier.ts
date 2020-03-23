import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme, ComplexSchema, Operation, OperationGroup, Parameter, VirtualParameter, ImplementationLocation } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { Helper } from "../helper";
import { CliConst, M4Node } from "../schema";
import { Dumper } from "../dumper";
import { Dictionary, values } from '@azure-tools/linq';
import { NodeHelper } from "../nodeHelper";
import { FlattenHelper } from "../flattenHelper";


export class PolyAsResourceModifier {

    constructor(protected session: Session<CodeModel>) {
    }

    public process() {
        this.processPolyAsResource();
    }

    private isPolyAsResource(group: OperationGroup, op: Operation, param: Parameter) {
        return (NodeHelper.isPolyAsResource(param));
    }

    /**
     * a simple object clone by using Json serialize and parse
     * @param obj
     */
    private cloneObject<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj)) as T;
    }

    private cloneObjectTopLevel(obj: any) {
        let r = {};
        for (let key in obj) {
            r[key] = obj[key];
        }
        return r;
    }

    private cloneOperationForSubclass(op: Operation, newDefaultName: string, newCliKey: string, newCliName: string, baseSchema: ObjectSchema, subSchema: ObjectSchema) {

        let polyParam: Parameter = null;

        let cloneParam = (p: Parameter): Parameter => {

            const vp = new Parameter(p.language.default.name, p.language.default.description, p.schema === baseSchema ? subSchema : p.schema, {
                implementation: p.implementation,
                extensions: {},
                language: this.cloneObject(p.language),
                protocol: p.protocol,
            });

            for (let key in p)
                if (isNullOrUndefined(vp[key]))
                    vp[key] = p[key];

            if (p.schema === baseSchema) {
                if (polyParam !== null)
                    throw Error(`Mulitple poly as resource Parameter found: 1) ${polyParam.language.default.name}, 2) ${p.language.default.name}`);
                else {
                    polyParam = vp;
                    NodeHelper.setPolyAsResourceBaseSchema(vp, baseSchema);
                }
            }

            return vp;
        };

        let cloneRequest = (req: Request): Request => {
            let rr = new Request(req);
            rr.extensions = this.cloneObjectTopLevel(rr.extensions);
            rr.language = this.cloneObject(rr.language);
            rr.parameters = rr.parameters.map(p => cloneParam(p));
            rr.updateSignatureParameters();
            return rr;
        }

        let op2 = new Operation(
            newDefaultName,
            '',
            op
        );
        op2.language = this.cloneObject(op2.language);
        op2.language.default.name = newDefaultName;
        NodeHelper.setCliKey(op2, newCliKey);
        NodeHelper.setCliName(op2, newCliName);
        op2.extensions = this.cloneObjectTopLevel(op2.extensions);
        op2.parameters = op2.parameters.map(p => {
            if (this.session.model.findGlobalParameter(pp => pp === p))
                return p;
            else
                return cloneParam(p)
        });
        op2.requests = op2.requests.map(r => cloneRequest(r));
        op2.updateSignatureParameters();
        NodeHelper.setPolyAsResourceParam(op2, polyParam);
        // Do we need to deep copy response? seems no need

        return op2;
    }

    public processPolyAsResource() {

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
                let allPolyParam = request.parameters.filter(p =>
                    p.schema instanceof ObjectSchema && (p.schema as ObjectSchema).discriminator && this.isPolyAsResource(g, op, p));
                if (allPolyParam.length == 0)
                    return;
                if (allPolyParam.length > 1) {
                    throw Error('multiple polymorphism parameter as resource found: ' + allPolyParam.map(p => p.language['cli']));
                }

                let polyParam = allPolyParam[0];
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

                    let op2: Operation = this.cloneOperationForSubclass(op,
                        `${op.language.default.name}_${key}` /*defaultName*/,
                        `${op.language.default.name}_${key}` /*cliKey*/,
                        `${op.language.default.name}#${key}` /*cliName*/,
                        baseSchema, subClass);
                    g.addOperation(op2);
                    Helper.logDebug(`${g.language.default.name}/${op.language.default.name} cloned for subclass ${key}`);

                    let polyParam = NodeHelper.getPolyAsResourceParam(op2);
                    if (isNullOrUndefined(polyParam))
                        throw Error("No poly parameter found? Operation: " + op.language.default.name);

                    let req = getDefaultRequest(op2);
                    if (NodeHelper.getJson(subClass) !== true) {
                        FlattenHelper.flattenParameter(req, polyParam, `${subClass.discriminatorValue}_`);
                    }
                }

                NodeHelper.setHidden(op, true);
            });
        });
    }
}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);

    Helper.dumper.dumpCodeModel('poly-as-resource-pre');

    if ((await session.getValue('cli.polymorphism.expand-as-resource', false)) === true) {
        let rd = new PolyAsResourceModifier(session);
        rd.process();
    }
    else {
        Helper.logWarning("cli.polymorphism.expand-as-resource is not true, poly-resource will be ignored");
    }

    Helper.dumper.dumpCodeModel('poly-as-resource-post');

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}