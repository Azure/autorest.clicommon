import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, Operation, Request, ObjectSchema, Parameter } from "@azure-tools/codemodel";
import { Helper } from "../helper";
import { CliConst, CliCommonSchema } from "../schema";
import { NodeHelper } from "../nodeHelper";
import { Modifier } from "./modifier/modifier";
import { CopyHelper } from "../copyHelper";
import { isNullOrUndefined } from "util";
import { FlattenHelper } from "../flattenHelper";

export class FlattenParamModifier {

    constructor(protected session: Session<CodeModel>){
    }

    public async process(flattenEnabled: boolean, polyEnabled: boolean) {
        await this.modifier();

        if (!flattenEnabled && !polyEnabled) {
            return;
        }
        if (polyEnabled) {
            Helper.enumrateOperationGroups(this.session.model.operationGroups, (desc) => this.flattenPolyOperationParam(desc), CliCommonSchema.CodeModel.NodeTypeFlag.operation);
        }
        if (flattenEnabled) {
            Helper.enumrateOperationGroups(this.session.model.operationGroups, (desc) => this.flattenNormalOperationParams(desc), CliCommonSchema.CodeModel.NodeTypeFlag.operation);
        }
    }

    private async modifier() {
        const directives = (await this.session.getValue(CliConst.CLI_DIRECTIVE_KEY, []))
            .filter((dir) => dir[NodeHelper.FLATTEN_PARAMS])
            .map((dir) => this.copyDirectiveOnlyForFlattenParams(dir));
        if (directives && directives.length > 0) {
            Helper.dumper.dumpCodeModel('flatten-param-modifier-pre');
            const modifier = await new Modifier(this.session).init(directives);
            modifier.process();
            Helper.dumper.dumpCodeModel('flatten-param-modifier-post');
        } else {
            Helper.logDebug('No flatten-params directive is found!');
        }
    }

    private copyDirectiveOnlyForFlattenParams(src: CliCommonSchema.CliDirective.Directive): CliCommonSchema.CliDirective.Directive {
        const copy: CliCommonSchema.CliDirective.Directive = {
            select: src.select,
            where: CopyHelper.deepCopy(src.where),
        }
        copy[NodeHelper.FLATTEN_PARAMS] = src[NodeHelper.FLATTEN_PARAMS];
        return copy;
    }
    
    private flattenPolyOperationParam(desc: CliCommonSchema.CodeModel.NodeDescriptor) {
        if (!this.isCliOperation(desc)) {
            return;
        }
        const operation = desc.target as Operation;
        const polyParam = NodeHelper.getPolyAsResourceParam(operation);
        const subClass = polyParam.schema as ObjectSchema;
        const discriminatorValue = NodeHelper.getCliDiscriminatorValue(subClass);
        if (isNullOrUndefined(polyParam)) {
            Helper.logWarning(`operation ${NodeHelper.getCliKey(operation, null)} has no poly parameter! Skip flatten param`);
            return;
        }

        const request = operation.requests?.[0];
        if (!request) {
            Helper.logWarning(`operation ${NodeHelper.getCliKey(operation, null)} has no request! Skip flatten param`);
            return;
        }
        if (NodeHelper.getJson(subClass) !== true) {
            const path = isNullOrUndefined(polyParam['targetProperty']) ? [] : [polyParam['targetProperty']];
            FlattenHelper.flattenParameter(request, polyParam, path, `${discriminatorValue}`);
        }
    }

    private flattenNormalOperationParams(desc: CliCommonSchema.CodeModel.NodeDescriptor) {
        if (this.isCliOperation(desc)) {
            return;
        }
        const operation = desc.target as Operation;
        const flattenParams = new Set<String>(NodeHelper.getFlattenParams(operation));
        if (flattenParams.size === 0) {
            return;
        }
        const request = operation.requests?.[0];
        if (!request || !request.parameters || request.parameters.length === 0) {
            Helper.logWarning(`operation ${NodeHelper.getCliKey(operation, null)} has flatten-params, but request is null or has no parameters! Skip flatten param`);
            return;
        }

        let foundFlattenParam = true;
        while (foundFlattenParam) {

            foundFlattenParam = false;

            for (let i = 0; i < request.parameters.length; i++) {
                const param = request.parameters[i];
                if (!flattenParams.has(NodeHelper.getCliKey(param, null))) {
                    continue;
                }
                // Next round we do not handle it again
                flattenParams.delete(NodeHelper.getCliKey(param, null));

                if (this.flattenNormalOperationParam(request, i)) {
                    // After flatten, index is changed. Break to start another round loop
                    break;
                }
            }
        }
    }

    private flattenNormalOperationParam(request: Request, index: number): boolean {
        const parameter = request.parameters[index];
        const paramSchema = parameter.schema;
        if (!(paramSchema instanceof ObjectSchema)) {
            Helper.logWarning(`flatten param ${NodeHelper.getCliKey(parameter, null)} is not object! Skip flatten param`);
            return false;
        }
        if (NodeHelper.getJson(paramSchema) !== true) {
            
            // Parameter may be shared by other request even schema. To prevent our changes spread to other place, clone the parameter
            const clonedParam = CopyHelper.copyParameter(parameter);
            request.parameters[index] = clonedParam;
            
            let path = isNullOrUndefined(clonedParam['targetProperty']) ? [] : [clonedParam['targetProperty']];
            // Use parameter's default name as perfix
            FlattenHelper.flattenParameter(request, clonedParam, path, `${clonedParam.language.default.name}`);
            
            return true;
        }
        return false;
    }

    private isCliOperation(desc: CliCommonSchema.CodeModel.NodeDescriptor) {
        // CliOperation is not in group.operations. So its index is equal or bigger than operation array(desc.parent)'s length
        return desc.targetIndex >= desc.parent.length;
    }
}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("flatten-param-pre");

    const flattenEnabled = (await session.getValue(CliConst.CLI_FLATTEN_PARAM_ENABLED_KEY, false)) === true;
    const polyEnabled = (await session.getValue(CliConst.CLI_POLYMORPHISM_EXPAND_AS_RESOURCE_KEY, false)) === true;

    const flattenParam = new FlattenParamModifier(session);
    if (!flattenEnabled && !polyEnabled) {
        Helper.logDebug(`cli.flatten-param.cli-flatten-param-enabled and cli.polymorphism.expand-as-resource are not true. Skip flatten params!`);
    } else if (!flattenEnabled && polyEnabled) {
        Helper.logDebug(`cli.flatten-param.cli-flatten-param-enabled is not true, cli.polymorphism.expand-as-resource is true. Only poly parameter will be flatten!`);
        
    } else if (flattenEnabled && !polyEnabled){
        Helper.logDebug(`cli.flatten-param.cli-flatten-param-enabled is true, cli.polymorphism.expand-as-resource is not true. Only paramter in flatten-params will be flatten!`);

    } else if (flattenEnabled && polyEnabled) {
        Helper.logDebug(`cli.flatten-param.cli-flatten-param-enabled and cli.polymorphism.expand-as-resource are true.`);
    }
    
    await flattenParam.process(flattenEnabled, polyEnabled);
    
    
    Helper.dumper.dumpCodeModel("flatten-param-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}
