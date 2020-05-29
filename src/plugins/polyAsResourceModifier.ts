import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, ObjectSchema, Operation, OperationGroup, Parameter } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { NodeHelper } from "../nodeHelper";
import { FlattenHelper } from "../flattenHelper";
import { CopyHelper } from "../copyHelper";


export class PolyAsResourceModifier {

    constructor(protected session: Session<CodeModel>) {
    }

    public process() {
        this.processPolyAsResource();
    }

    private isPolyAsResource(group: OperationGroup, op: Operation, param: Parameter) {
        return (NodeHelper.isPolyAsResource(param));
    }

    private cloneOperationForSubclass(op: Operation, newDefaultName: string, newCliKey: string, newCliName: string, baseSchema: ObjectSchema, subSchema: ObjectSchema) {

        let polyParam: Parameter = null;

        const cloneParam = (p: Parameter): Parameter => {
            const vp = CopyHelper.copyParameter(p, p.schema === baseSchema ? subSchema : p.schema);
            if (p.schema === baseSchema) {
                if (polyParam !== null) {
                    throw Error(`Mulitple poly as resource Parameter found: 1) ${polyParam.language.default.name}, 2) ${p.language.default.name}`);
                } else {
                    polyParam = vp;
                    NodeHelper.setPolyAsResourceBaseSchema(vp, baseSchema);
                }
            }
            return vp;
        };

        const cloneRequest = (req: Request): Request => CopyHelper.copyRequest(req, cloneParam);

        const op2 = CopyHelper.copyOperation(op, this.session.model.globalParameters, cloneRequest, cloneParam);
        op2.language.default.name = newDefaultName;
        NodeHelper.setCliName(op2, newCliName);
        NodeHelper.setCliKey(op2, newCliKey);
        NodeHelper.setPolyAsResourceParam(op2, polyParam);
        NodeHelper.setPolyAsResourceOriginalOperation(op2, op);

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

                for (let subClass of NodeHelper.getSubClasses(baseSchema, true)) {

                    let discriminatorValue = NodeHelper.getCliDiscriminatorValue(subClass);

                    let op2: Operation = this.cloneOperationForSubclass(op,
                        `${op.language.default.name}_${discriminatorValue}` /*defaultName*/,
                        `${NodeHelper.getCliKey(op, op.language.default.name)}#${discriminatorValue}` /*cliKey*/,
                        `${NodeHelper.getCliName(op, op.language.default.name)}#${discriminatorValue}` /*cliName*/,
                        baseSchema, subClass);
                    
                    Helper.logDebug(`${g.language.default.name}/${op.language.default.name} cloned for subclass ${discriminatorValue}`);
                    NodeHelper.addCliOperation(op, op2);

                    let polyParam = NodeHelper.getPolyAsResourceParam(op2);
                    if (isNullOrUndefined(polyParam))
                        throw Error("No poly parameter found? Operation: " + op.language.default.name);

                    let req = getDefaultRequest(op2);
                    if (NodeHelper.getJson(subClass) !== true) {
                        let path = isNullOrUndefined(polyParam['targetProperty']) ? [] : [polyParam['targetProperty']];
                        FlattenHelper.flattenParameter(req, polyParam, path, `${discriminatorValue}_`);
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