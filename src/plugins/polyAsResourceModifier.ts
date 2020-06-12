import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, ObjectSchema, Operation, OperationGroup, Parameter } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { NodeHelper } from "../nodeHelper";
import { PolyHelper } from "../polyHelper";
import { FlattenHelper } from "../flattenHelper";
import { CopyHelper } from "../copyHelper";
import { CliConst, CliCommonSchema } from "../schema";
import { Modifier } from "./modifier/modifier";
import { CommonNamer } from "./namer";


export class PolyAsResourceModifier {

    constructor(protected session: Session<CodeModel>) {
    }

    public async process() {
        await this.modifier();
        this.processPolyAsResource();
    }

    private async modifier() {
        const directives = (await this.session.getValue(CliConst.CLI_DIRECTIVE_KEY, []))
            .filter((dir) => dir[NodeHelper.POLY_RESOURCE])
            .map((dir) => this.copyDirectiveOnlyForPolyResource(dir));
        if (directives && directives.length > 0) {
            Helper.dumper.dumpCodeModel('poly-as-resource-modifier-pre');
            const modifier = await new Modifier(this.session).init(directives);
            modifier.process();
            Helper.dumper.dumpCodeModel('poly-as-resource-modifier-post');
        } else {
            Helper.logDebug('No poly resource directive is found!');
        }
    }

    private copyDirectiveOnlyForPolyResource(src: CliCommonSchema.CliDirective.Directive): CliCommonSchema.CliDirective.Directive {
        const copy: CliCommonSchema.CliDirective.Directive = {
            select: src.select,
            where: CopyHelper.deepCopy(src.where),
        }
        copy[NodeHelper.POLY_RESOURCE] = src[NodeHelper.POLY_RESOURCE];
        return copy;
    }

    private processPolyAsResource() {

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

                    let op2: Operation = this.cloneOperationForSubclass(op, baseSchema, subClass);
                    
                    Helper.logDebug(`${g.language.default.name}/${op.language.default.name} cloned for subclass ${discriminatorValue}`);
                    NodeHelper.addCliOperation(op, op2);
                }

                NodeHelper.setHidden(op, true);
            });
        });
    }

    private isPolyAsResource(group: OperationGroup, op: Operation, param: Parameter) {
        return (NodeHelper.isPolyAsResource(param));
    }

    private cloneOperationForSubclass(op: Operation, baseSchema: ObjectSchema, subSchema: ObjectSchema) {

        let polyParam: Parameter = null;
        const discriminatorValue = NodeHelper.getCliDiscriminatorValue(subSchema);
        const newDefaultName = PolyHelper.createPolyOperationDefaultName(op, discriminatorValue);
        const newCliKey = PolyHelper.createPolyOperationCliKey(op, discriminatorValue)

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
        NodeHelper.setCliKey(op2, newCliKey);
        NodeHelper.setPolyAsResourceParam(op2, polyParam);
        NodeHelper.setPolyAsResourceOriginalOperation(op2, op);
        NodeHelper.setPolyAsResourceDiscriminatorValue(op2, discriminatorValue);
        return op2;
    }
}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);

    Helper.dumper.dumpCodeModel('poly-as-resource-pre');

    if ((await session.getValue('cli.polymorphism.expand-as-resource', false)) === true) {
        let rd = new PolyAsResourceModifier(session);
        await rd.process();
    }
    else {
        Helper.logWarning("cli.polymorphism.expand-as-resource is not true, poly-resource will be ignored");
    }

    Helper.dumper.dumpCodeModel('poly-as-resource-post');

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}