import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, ObjectSchema, Operation, OperationGroup, Parameter } from "@azure-tools/codemodel";
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
            Helper.dumper.dumpCodeModel('poly-as-resource-modifier-pre');
            const modifier = await new Modifier(this.session).init(directives);
            modifier.process();

            const splitOpExtendPoly = (await this.session.getValue(CliConst.CLI_SPLIT_OPERATION_EXTEND_POLY_RESOURCE_KEY, false)) === true;
            if (splitOpExtendPoly) {
                this.modifierForExtendPolyResource();
            }

            Helper.dumper.dumpCodeModel('poly-as-resource-modifier-post');
        } else {
            Helper.logDebug('No poly resource directive is found!');
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
                    throw Error('multiple polymorphism parameter as resource found: ' + allPolyParam.map(p => p.language['cli']));
                }

                const polyParam = allPolyParam[0];
                const baseSchema = polyParam.schema as ObjectSchema;

                for (const subClass of NodeHelper.getSubClasses(baseSchema, true)) {

                    const discriminatorValue = NodeCliHelper.getCliDiscriminatorValue(subClass);

                    const op2: Operation = this.cloneOperationForSubclass(op, baseSchema, subClass);
                    
                    Helper.logDebug(`${g.language.default.name}/${op.language.default.name} cloned for subclass ${discriminatorValue}`);
                    NodeExtensionHelper.addCliOperation(op, op2);
                }

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
            p.schema instanceof ObjectSchema && (p.schema as ObjectSchema).discriminator && NodeCliHelper.isPolyAsResource(p));
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

    const session = await Helper.init(host);

    Helper.dumper.dumpCodeModel('poly-as-resource-pre');

    if ((await session.getValue('cli.polymorphism.expand-as-resource', false)) === true) {
        const rd = new PolyAsResourceModifier(session);
        await rd.process();
    }
    else {
        Helper.logWarning("cli.polymorphism.expand-as-resource is not true, poly-resource will be ignored");
    }

    Helper.dumper.dumpCodeModel('poly-as-resource-post');

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}