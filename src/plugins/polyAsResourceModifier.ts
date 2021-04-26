import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, ObjectSchema, Operation, OperationGroup, Parameter, codeModelSchema, getAllProperties } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { NodeHelper, NodeCliHelper, NodeExtensionHelper } from "../nodeHelper";
import { CopyHelper } from "../copyHelper";
import { CliConst, CliCommonSchema } from "../schema";
import { Modifier } from "./modifier/modifier";


export class PolyAsResourceModifier {

    constructor(protected session: Session<CodeModel>) {
    }

    public async process(): Promise<void> {
        await this.modifier();

        this.processPolyAsResource();
    }
    
    private async modifier(): Promise<void> {
        const directives = (await this.session.getValue(CliConst.CLI_DIRECTIVE_KEY, []))
            .filter((dir) => dir[NodeCliHelper.POLY_RESOURCE])
            .map((dir) => this.copyDirectiveOnlyForPolyResource(dir));
        if (directives && directives.length > 0) {
            const modifier = await new Modifier(this.session).init(directives);
            modifier.process();

            const splitOpExtendPoly = (await this.session.getValue(CliConst.CLI_SPLIT_OPERATION_EXTEND_POLY_RESOURCE_KEY, false)) === true;
            if (splitOpExtendPoly) {
                this.modifierForExtendPolyResource();
            }
        } else {
            Helper.logDebug(this.session, 'No poly resource directive is found!');
        }
    }

    private modifierForExtendPolyResource(): void {
        this.session.model.operationGroups.forEach((group) => {
            group.operations.forEach((operation) => {
                const request = this.getDefaultRequest(operation);
                if (isNullOrUndefined(request)) {
                    return;
                }
                const polyParams = new Set<string>(request.parameters?.filter((p) => NodeCliHelper.isPolyAsResource(p))
                    .map((p) => NodeCliHelper.getCliKey(p, null)).filter((cliKey) => !isNullOrUndefined(cliKey)));
                if (isNullOrUndefined(polyParams) || polyParams.size === 0) {
                    return;
                }

                const splittedOps = this.findSplittedOpeations(operation, group);
                splittedOps.forEach((op) => {
                    const req = this.getDefaultRequest(op);
                    if (isNullOrUndefined(req)) {
                        return;
                    }
                    req.parameters?.forEach((p) => {
                        if (polyParams.has(NodeCliHelper.getCliKey(p, null))) {
                            NodeCliHelper.setPolyAsResource(p, true);
                        }
                    });
                });
            });
        });
    }

    private copyDirectiveOnlyForPolyResource(src: CliCommonSchema.CliDirective.Directive): CliCommonSchema.CliDirective.Directive {
        const copy: CliCommonSchema.CliDirective.Directive = {
            select: src.select,
            where: CopyHelper.deepCopy(src.where),
        };
        copy[NodeCliHelper.POLY_RESOURCE] = src[NodeCliHelper.POLY_RESOURCE];
        return copy;
    }

    private processPolyAsResource(): void {

        this.session.model.operationGroups.forEach(g => {
            if (g.operations.findIndex(op => op.requests.length > 1) >= 0)
                throw Error("Multiple requests in one operation found! not supported yet");

            // we need to modify the operations array, so get a copy of it first
            const operations = g.operations.filter(op => op.requests?.length == 1);
            
            operations.forEach(op => {

                const request = this.getDefaultRequest(op);
                if (isNullOrUndefined(request.parameters))
                    return;
                const allPolyParam = this.findPolyParameters(request);
                if (allPolyParam.length == 0) {
                    return;
                }
                if (allPolyParam.length > 1) {
                    throw Error('multiple polymorphism parameter as resource found: op: ' + NodeCliHelper.getCliKey(op, null) + ' dup parameters: ' + allPolyParam.map(p => NodeCliHelper.getCliKey(p, null)));
                }

                const polyParam = allPolyParam[0];
                const baseSchema = polyParam.schema as ObjectSchema;
                const baseDiscriminatorValue = NodeCliHelper.getCliDiscriminatorValue(baseSchema);
                const subClasses = NodeHelper.getSubClasses(baseSchema, false);
                
                if (!isNullOrUndefined(baseDiscriminatorValue) && NodeCliHelper.isPolyAsResourced(polyParam)) {
                    return;
                }
                
                for (const subClass of subClasses) {

                    const discriminatorValue = NodeCliHelper.getCliDiscriminatorValue(subClass);

                    const op2: Operation = this.cloneOperationForSubclass(op, baseSchema, subClass);
                    
                    Helper.logDebug(this.session, `${g.language.default.name}/${op.language.default.name} cloned for subclass ${discriminatorValue}`);
                    if (g.operations.indexOf(op2) === -1) {
                        g.operations.push(op2);
                    }
                }

                NodeCliHelper.setPolyAsResourced(polyParam, true);

                NodeCliHelper.setHidden(op, true);
            });
        });
    }

    private findSplittedOpeations(operation: Operation, group: OperationGroup): Operation[] {
        return group.operations.filter((op) => {
            const originalOp = NodeExtensionHelper.getSplitOperationOriginalOperation(op);
            return originalOp && NodeCliHelper.getCliKey(operation, null) === NodeCliHelper.getCliKey(originalOp, '');
        });
    }

    private findPolyParameters(request: Request): Parameter[] {
        if (isNullOrUndefined(request.parameters)) {
            return [];
        }
        return request.parameters?.filter(p =>
            Helper.isObjectSchema(p.schema) && (p.schema as ObjectSchema).discriminator && NodeCliHelper.isPolyAsResource(p) && !NodeCliHelper.isPolyAsResourced(p));
    }

    private getDefaultRequest(operation: Operation): Request {
        return operation.requests?.[0];
    }

    private cloneOperationForSubclass(op: Operation, baseSchema: ObjectSchema, subSchema: ObjectSchema): Operation {

        let polyParam: Parameter = null;
        const discriminatorValue = NodeCliHelper.getCliDiscriminatorValue(subSchema);
        const newDefaultName = Helper.createPolyOperationDefaultName(op, discriminatorValue);
        const newCliKey = Helper.createPolyOperationCliKey(op, discriminatorValue);

        const cloneParam = (p: Parameter): Parameter => {
            const vp = CopyHelper.copyParameter(p, p.schema === baseSchema ? subSchema : p.schema);
            if (p.schema === baseSchema) {
                if (polyParam !== null) {
                    throw Error(`Mulitple poly as resource Parameter found: 1) ${polyParam.language.default.name}, 2) ${p.language.default.name}`);
                } else {
                    polyParam = vp;
                    NodeExtensionHelper.setPolyAsResourceBaseSchema(vp, baseSchema);
                }
            }
            return vp;
        };

        const cloneRequest = (req: Request): Request => CopyHelper.copyRequest(req, cloneParam);

        const op2 = CopyHelper.copyOperation(op, this.session.model.globalParameters, cloneRequest, cloneParam);
        op2.language.default.name = newDefaultName;
        NodeCliHelper.setCliKey(op2, newCliKey);
        NodeExtensionHelper.setPolyAsResourceParam(op2, polyParam);
        NodeExtensionHelper.setPolyAsResourceOriginalOperation(op2, op);
        NodeExtensionHelper.setPolyAsResourceDiscriminatorValue(op2, discriminatorValue);
        return op2;
    }
}

export async function processRequest(host: Host): Promise<void> {
    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    const dumper = await Helper.getDumper(session);

    dumper.dumpCodeModel('poly-as-resource-pre', session.model);

    if ((await session.getValue('cli.polymorphism.expand-as-resource', false)) === true) {
        const rd = new PolyAsResourceModifier(session);
        await rd.process();
    }
    else {
        Helper.logWarning(session, "cli.polymorphism.expand-as-resource is not true, poly-resource will be ignored");
    }

    dumper.dumpCodeModel('poly-as-resource-post', session.model);

    await Helper.outputToModelerfour(host, session);
    await dumper.persistAsync(host);
}