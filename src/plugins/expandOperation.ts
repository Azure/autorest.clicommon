import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, Operation, Parameter } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { CliConst, CliCommonSchema } from "../schema";
import { NodeHelper } from "../nodeHelper";
import { Modifier } from "./modifier/modifier";
import { CopyHelper } from "../copyHelper";

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

                if (expandedOperations.length > 0) {
                    NodeHelper.setHidden(operation, true);
                }
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
        const operation = CopyHelper.copyOperation(srcOperation, this.session.model.globalParameters);
        operation.language.default.name = expandName;
        // Expanded operation's cli key in format: <SrcOperationKey>#<ExpandName>
        NodeHelper.setCliKey(operation, `${NodeHelper.getCliKey(srcOperation, srcOperation.language.default.name)}#${expandName}`);
        NodeHelper.clearCliExpandOperationNames(operation);
        return operation;
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
