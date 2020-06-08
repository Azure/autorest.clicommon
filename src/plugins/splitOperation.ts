import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, Operation, Parameter } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { CliConst, CliCommonSchema } from "../schema";
import { NodeHelper } from "../nodeHelper";
import { Modifier } from "./modifier/modifier";
import { CopyHelper } from "../copyHelper";

export class SplitOperation{

    constructor(protected session: Session<CodeModel>){
    }

    public async process() {

        await this.modifier();

        for (const group of this.session.model.operationGroups) {
            // Operation will be splitted with given names. To avoid duplicated operation name error in modelerfour, we compare 
            // split names with existed names. If it has already existed, skip this split name. 
            const existedNames = new Set<string>(group.operations.map((op) => op.language.default.name.toUpperCase()));
            const splittedGroupOperations = [];
            for (const operation of group.operations) {
                const splitNames = NodeHelper.getCliSplitOperationNames(operation);
                if (!splitNames || splitNames.length === 0) {
                    continue;
                }
                const splittedOperations = this.splitOperations(splitNames, operation, existedNames);
                
                splittedOperations.forEach((splittedOperation) => {
                    // Link src operation to splitted operation
                    NodeHelper.addSplitOperationSplittedOperations(operation, splittedOperation);
                    // Link splitted operation to src opreation
                    NodeHelper.setSplitOperationOriginalOperation(splittedOperation, operation);
    
                    splittedGroupOperations.push(splittedOperation);
                });

                if (splittedOperations.length > 0) {
                    NodeHelper.setCliOperationSplitted(operation, true);
                }
            }
            splittedGroupOperations.forEach((op) => group.addOperation(op));
        }
    }

    private async modifier() {
        const directives = (await this.session.getValue(CliConst.CLI_DIRECTIVE_KEY, [])).filter((dir) => dir[CliConst.CLI_SPLIT_OPERATION_NAMES_KEY]);
        if (directives && directives.length > 0) {
            Helper.dumper.dumpCodeModel('split-operation-modifier-pre');
            const modifier = await new Modifier(this.session).init(directives);
            modifier.process();
            Helper.dumper.dumpCodeModel('split-operation-modifier-post');
        } else {
            Helper.logDebug('No split operation directive is found!');
        }
    }

    private splitOperations(splitNames: string[], srcOperation: Operation, existedNames: Set<string>): Operation[] {
        const splittedOperations = [];
        for (const splitName of splitNames) {
            if (existedNames.has(splitName.toUpperCase())) {
                Helper.logWarning(`Operation ${splitName} has already existed in group! Skip split!`);
                continue;
            }
            const splittedOperation = this.splitOperation(splitName, srcOperation);
            splittedOperations.push(splittedOperation);
        }
        return splittedOperations;
    }
    
    private splitOperation(splitName: string, srcOperation: Operation): Operation {
        const operation = CopyHelper.copyOperation(srcOperation, this.session.model.globalParameters);
        operation.language.default.name = splitName;
        // Splited operation's cli key in format: <SrcOperationKey>#<SplitName>
        NodeHelper.setCliKey(operation, `${NodeHelper.getCliKey(srcOperation, srcOperation.language.default.name)}#${splitName}`);
        NodeHelper.clearCliSplitOperationNames(operation);
        return operation;
    }
}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("split-operation-pre");

    const expandEnabled = (await session.getValue(CliConst.CLI_SPLIT_OPERATION_ENABLED_KEY, false)) === true;
    if (!expandEnabled) {
        Helper.logDebug(`cli-split-operation-enabled is not true. Skip split operation`);
    } else {
        const splitOperation = new SplitOperation(session);
        await splitOperation.process();
    }
    
    Helper.dumper.dumpCodeModel("split-operation-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}
