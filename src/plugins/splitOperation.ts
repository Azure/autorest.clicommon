import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, Operation, codeModelSchema, OperationGroup } from "@azure-tools/codemodel";
import { Helper } from "../helper";
import { CliConst, CliCommonSchema } from "../schema";
import { NodeCliHelper, NodeExtensionHelper } from "../nodeHelper";
import { Modifier } from "./modifier/modifier";
import { CopyHelper } from "../copyHelper";

export class SplitOperation{

    constructor(protected session: Session<CodeModel>) {
    }

    public async process(): Promise<void> {

        await this.modifier();

        for (const group of this.session.model.operationGroups) {
            // Operation will be splitted with given names. To avoid duplicated operation name error in modelerfour, we compare 
            // split names with existed names. If it has already existed, skip this split name. 
            const existedNames = new Set<string>(group.operations.map((op) => op.language.default.name.toUpperCase()));
            const splittedGroupOperations = [];
            for (const operation of group.operations) {
                const splitNames = NodeCliHelper.getCliSplitOperationNames(operation);
                if (!splitNames || splitNames.length === 0) {
                    continue;
                }
                const splittedOperations = this.splitOperations(splitNames, operation, existedNames);
                
                splittedOperations.forEach((splittedOperation) => {
                    // Link splitted operation to src opreation
                    NodeExtensionHelper.setSplitOperationOriginalOperation(splittedOperation, operation);

                    this.updateSplitOperationDescription(splittedOperation, group);
                    splittedGroupOperations.push(splittedOperation);
                });

                if (splittedOperations.length > 0) {
                    NodeCliHelper.setCliOperationSplitted(operation, true);
                }
            }
            splittedGroupOperations.forEach((op) => group.addOperation(op));
        }
    }

    private updateSplitOperationDescription(operation: Operation, group: OperationGroup): void {
        const create = 'Create';
        const update = 'Update';
        const opCliKey = NodeCliHelper.getCliKey(operation, '').toLowerCase();
        const createOrUpdate: string = opCliKey.endsWith('#create') ? create : opCliKey.endsWith('#update') ? update : null;
        if (!createOrUpdate) {
            return;
        }
        
        const groupCliKey = NodeCliHelper.getCliKey(group, '');
        const namingConvention: CliCommonSchema.NamingConvention = {
            glossary: []
        };
        operation.language.default.description = createOrUpdate + ' ' + Helper.singularize(namingConvention, groupCliKey);
    }

    private async modifier(): Promise<void> {
        const directives = (await this.session.getValue(CliConst.CLI_DIRECTIVE_KEY, []))
            .filter((dir) => dir[NodeCliHelper.SPLIT_OPERATION_NAMES])
            .map((dir) => this.copyDirective(dir,NodeCliHelper.SPLIT_OPERATION_NAMES));
        
        if (directives && directives.length > 0) {
            const modifier = await new Modifier(this.session).init(directives);
            modifier.process();
        } else {
            Helper.logDebug(this.session, 'No split operation directive is found!');
        }
    }

    private splitOperations(splitNames: string[], srcOperation: Operation, existedNames: Set<string>): Operation[] {
        const splittedOperations = [];
        for (const splitName of splitNames) {
            if (existedNames.has(splitName.toUpperCase())) {
                Helper.logWarning(this.session, `Operation ${splitName} has already existed in group! Skip split!`);
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
        NodeCliHelper.setCliKey(operation, Helper.createSplitOperationCliKey(srcOperation, splitName));
        NodeCliHelper.clearCliSplitOperationNames(operation);
        return operation;
    }

    private copyDirective(src: CliCommonSchema.CliDirective.Directive, prop: string): CliCommonSchema.CliDirective.Directive {
        const copy: CliCommonSchema.CliDirective.Directive = {
            select: src.select,
            where: CopyHelper.deepCopy(src.where),
        };
        copy[prop] = src[prop];
        return copy;
    }
}

export async function processRequest(host: Host): Promise<void> {
    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    const dumper = await Helper.getDumper(session);
    dumper.dumpCodeModel("split-operation-pre", session.model);

    const splitEnabled = (await session.getValue(CliConst.CLI_SPLIT_OPERATION_ENABLED_KEY, false)) === true;
    if (!splitEnabled) {
        Helper.logDebug(session, `cli-split-operation-enabled is not true. Skip split operation`);
    } else {
        const splitOperation = new SplitOperation(session);
        await splitOperation.process();
    }
    
    dumper.dumpCodeModel("split-operation-post", session.model);

    await Helper.outputToModelerfour(host, session);

    await dumper.persistAsync(host);
}
