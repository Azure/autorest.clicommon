import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, Operation, Request, ObjectSchema } from "@azure-tools/codemodel";
import { Helper } from "../helper";
import { CliConst, CliCommonSchema } from "../schema";
import { NodeHelper, NodeCliHelper, NodeExtensionHelper } from "../nodeHelper";
import { Modifier } from "./modifier/modifier";
import { CopyHelper } from "../copyHelper";
import { isNullOrUndefined } from "util";
import { FlattenHelper } from "../flattenHelper";

export class FlattenModifier {

    constructor(protected session: Session<CodeModel>){
    }

    public async process(flattenEnabled: boolean, polyEnabled: boolean): Promise<void> {
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

    private async modifier(): Promise<void> {
        const directives = await this.session.getValue(CliConst.CLI_FLATTEN_DIRECTIVE_KEY, []);
        const cliDirectives = await this.session.getValue(CliConst.CLI_DIRECTIVE_KEY, []);

        const flattenDirectives = [...directives, ...cliDirectives]
            .filter((dir) => dir[NodeCliHelper.CLI_FLATTEN])
            .map((dir) => this.copyDirectiveOnlyForCliFlatten(dir));
        if (flattenDirectives && flattenDirectives.length > 0) {
            Helper.dumper.dumpCodeModel('flatten-modifier-pre');
            const modifier = await new Modifier(this.session).init(flattenDirectives);
            modifier.process();
            Helper.dumper.dumpCodeModel('flatten-modifier-post');
        } else {
            Helper.logDebug('No flatten directive is found!');
        }
    }

    private copyDirectiveOnlyForCliFlatten(src: CliCommonSchema.CliDirective.Directive): CliCommonSchema.CliDirective.Directive {
        const copy: CliCommonSchema.CliDirective.Directive = {
            select: src.select,
            where: CopyHelper.deepCopy(src.where),
        };
        copy[NodeCliHelper.CLI_FLATTEN] = src[NodeCliHelper.CLI_FLATTEN];
        return copy;
    }
    
    private flattenPolyOperationParam(desc: CliCommonSchema.CodeModel.NodeDescriptor) {
        if (!this.isCliOperation(desc)) {
            return;
        }
        const operation = desc.target as Operation;
        const polyParam = NodeExtensionHelper.getPolyAsResourceParam(operation);
        const subClass = polyParam.schema as ObjectSchema;
        const discriminatorValue = NodeCliHelper.getCliDiscriminatorValue(subClass);
        if (isNullOrUndefined(polyParam)) {
            Helper.logWarning(`operation ${NodeCliHelper.getCliKey(operation, null)} has no poly parameter! Skip flatten`);
            return;
        }

        const request = operation.requests?.[0];
        if (!request) {
            Helper.logWarning(`operation ${NodeCliHelper.getCliKey(operation, null)} has no request! Skip flatten`);
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
        const request = operation.requests?.[0];
        if (isNullOrUndefined(request) || isNullOrUndefined(request.parameters)) {
            return;
        }

        let foundFlattenParam = true;
        while (foundFlattenParam) {

            foundFlattenParam = false;

            for (let i = 0; i < request.parameters.length; i++) {
                const param = request.parameters[i];
                if (!NodeCliHelper.isCliFlatten(param) || NodeExtensionHelper.isCliFlattened(param)) {
                    continue;
                }

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
        if (!Helper.isObjectSchema(paramSchema)) {
            Helper.logWarning(`flatten param ${NodeCliHelper.getCliKey(parameter, null)} is not object! Skip flatten`);
            return false;
        }
        if (NodeHelper.getJson(paramSchema) !== true) {
            
            // Parameter may be shared by other request even schema. To prevent our changes spread to other place, clone the parameter
            const clonedParam = CopyHelper.copyParameter(parameter);
            request.parameters[index] = clonedParam;
            
            const path = isNullOrUndefined(clonedParam['targetProperty']) ? [] : [clonedParam['targetProperty']];
            // Use parameter's default name as perfix
            FlattenHelper.flattenParameter(request, clonedParam, path, `${clonedParam.language.default.name}`);
            
            return true;
        }
        return false;
    }

    private isCliOperation(desc: CliCommonSchema.CodeModel.NodeDescriptor): boolean {
        // CliOperation is not in group.operations. So its index is equal or bigger than operation array(desc.parent)'s length
        return desc.targetIndex >= desc.parent.length;
    }
}

export async function processRequest(host: Host): Promise<void> {

    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("flatten-pre");

    const flattenEnabled = (await session.getValue(CliConst.CLI_FLATTEN_SET_ENABLED_KEY, false)) === true;
    const polyEnabled = (await session.getValue(CliConst.CLI_POLYMORPHISM_EXPAND_AS_RESOURCE_KEY, false)) === true;

    const flattenParam = new FlattenModifier(session);
    if (!flattenEnabled && !polyEnabled) {
        Helper.logDebug(`${CliConst.CLI_FLATTEN_SET_ENABLED_KEY} and ${CliConst.CLI_POLYMORPHISM_EXPAND_AS_RESOURCE_KEY} are not true. Skip flatten params!`);
    } else if (!flattenEnabled && polyEnabled) {
        Helper.logDebug(`${CliConst.CLI_FLATTEN_SET_ENABLED_KEY} is not true, ${CliConst.CLI_POLYMORPHISM_EXPAND_AS_RESOURCE_KEY} is true. Only poly parameter will be flatten!`);
        
    } else if (flattenEnabled && !polyEnabled){
        Helper.logDebug(`${CliConst.CLI_FLATTEN_SET_ENABLED_KEY} is true, ${CliConst.CLI_POLYMORPHISM_EXPAND_AS_RESOURCE_KEY} is not true. Only paramter in flatten-params will be flatten!`);

    } else if (flattenEnabled && polyEnabled) {
        Helper.logDebug(`${CliConst.CLI_FLATTEN_SET_ENABLED_KEY} and ${CliConst.CLI_POLYMORPHISM_EXPAND_AS_RESOURCE_KEY} are true.`);
    }
    
    await flattenParam.process(flattenEnabled, polyEnabled);
    
    
    Helper.dumper.dumpCodeModel("flatten-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}
