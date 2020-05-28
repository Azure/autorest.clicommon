import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, Request, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme, Operation, Parameter, OperationGroup } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { Helper } from "../helper";
import { CliConst, M4Node, CliCommonSchema } from "../schema";
import { NodeHelper } from "../nodeHelper";
import { Modifier } from "./modifier/modifier";

interface FlattenConfig {
    maxComplexity: number;
    maxLevel: number;
    maxPropCount: number;
    maxPolyAsResourcePropCount: number;
    maxPolyAsParamPropCount: number;
    maxArrayPropCount: number;
    overwriteSwagger: boolean;
    nodeDescripter: CliCommonSchema.CodeModel.NodeDescriptor;
}

export class ExpandOperation{

    constructor(protected session: Session<CodeModel>){
    }

    public async process() {

        await this.modifier();

        for (const group of this.session.model.operationGroups) {
            const existedNames = new Set<string>(group.operations.map((op) => op.language.default.name.toLowerCase()));
            const expandedGroupOperations = [];
            for (const operation of group.operations) {
                const expandNames = NodeHelper.getCliExpandOperationNames(operation);
                if (!expandNames) {
                    continue;
                }
                const expandedOperations = this.expandOperations(expandNames, operation, existedNames);
                
                expandedOperations.forEach((expandedOperation) => {
                    // Link src operation to expanded operation
                    NodeHelper.addCliOperation(operation, expandedOperation);
                    // Link expaneded operation to src opreation
                    NodeHelper.setExpandOperationOriginalOperation(expandedOperation, operation);
    
                    expandedGroupOperations.push(expandedOperation);
                });

                NodeHelper.setHidden(operation, true);
            }
            expandedGroupOperations.forEach((op) => group.addOperation(op));
        }
    }

    private async modifier() {
        const directives = await this.session.getValue(CliConst.CLI_EXPAND_OPERATION_DIRECTIVE_KEY, null);
        if (directives) {
            Helper.dumper.dumpCodeModel('modifier-pre');
            const modifier = await new Modifier(this.session).init(directives);
            modifier.process();
            Helper.dumper.dumpCodeModel('modifier-post');
        } else {
            Helper.logDebug('No cli-expand-operation-directive is found!');
        }
    }

    private expandOperations(expandNames: string[], srcOperation: Operation, existedNames: Set<string>): Operation[] {
        const expandOperations = [];
        for (const expandName of expandNames) {
            if (existedNames.has(expandName.toLowerCase())) {
                Helper.logWarning(`Operation ${expandName} has already existed in group! Skip expand!`);
                continue;
            }
            const derivedOperation = this.expandOperation(expandName, srcOperation);
            expandOperations.push(derivedOperation);
        }
        return expandOperations;
    }
    
    private expandOperation(expandName: string, srcOperation: Operation): Operation {
        const operation = new Operation(srcOperation.language.default.name, '', srcOperation);
        operation.language = this.deepClone(srcOperation.language);
        operation.language.default.name = expandName;
        // Expanded operation's cli key in format: <SrcOperationKey>#<ExpandName>
        NodeHelper.setCliKey(operation, `${NodeHelper.getCliKey(srcOperation, srcOperation.language.default.name)}#${expandName}`);
        NodeHelper.clearCliExpandOperationNames(operation);
        operation.extensions = this.clone(srcOperation.extensions);
        operation.parameters = srcOperation.parameters.map((op) => this.session.model.findGlobalParameter((gp) => gp == op) ? op : this.cloneParameter(op));
        operation.requests = operation.requests?.map((req) => this.cloneRequest(req));
        operation.updateSignatureParameters();

        return operation;
    }

    private cloneRequest(source: Request): Request {
        const clonedReq = new Request(source);
        clonedReq.extensions = this.clone(source.extensions);
        clonedReq.language = this.deepClone(source.language);
        clonedReq.parameters = clonedReq.parameters?.map((p) => this.cloneParameter(p));
        clonedReq.updateSignatureParameters();
        return clonedReq;
    }

    private cloneParameter(source: Parameter): Parameter {
        const clonedParam = new Parameter(source.language.default.name, source.language.default.description, source.schema, {
            implementation: source.implementation,
            extensions: {},
            language: this.deepClone(source.language),
            protocol: source.protocol,
        });

        for (const property in source) {
            if (isNullOrUndefined(clonedParam[property])) {
                clonedParam[property] = source[property];
            }
        }

        return clonedParam;
    }

    private clone<T>(source: T): T {
        if (source == null) {
            return source;
        }
        return Object.assign({}, source);
    }

    private deepClone<T>(source: T): T {
        if (source == null) {
            return source;
        }
        return JSON.parse(JSON.stringify(source));
    }


}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("expand-operation-pre");

    const expandEnabled = (await session.getValue(CliConst.CLI_EXPAND_OPERATION_ENABLED_KEY, false)) === true;
    if (!expandEnabled) {
        Helper.logDebug(`cli-expand-operation-enabled is not true. Skip expand operation`);
    } else {
        const expandOperation = new ExpandOperation(session);
        await expandOperation.process();
    }
    
    Helper.dumper.dumpCodeModel("expand-operation-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}