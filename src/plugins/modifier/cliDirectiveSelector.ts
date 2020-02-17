import { CliCommonSchema, SelectType, CliConst } from "../../schema"
import { isNullOrUndefined } from "util";
import { Helper } from "../../helper"
import { Metadata } from "@azure-tools/codemodel";

export abstract class NodeSelector {
    constructor() {
    }

    public abstract match(node: CliCommonSchema.CodeModel.NodeDescriptor): boolean;

    public static createSelector(directive: CliCommonSchema.CliDirective.Directive) {

        if (isNullOrUndefined(directive.select))
            throw Error(`'select' clause missing in direcitve: ${JSON.stringify(directive)}`)

        if (isNullOrUndefined(directive.where))
            return new MatchAllNodeSelector();

        switch (directive.select) {
            case CliConst.SelectType.operationGroup:
            case CliConst.SelectType.operation:
            case CliConst.SelectType.parameter:
                return new CommandNodeSelector(
                    directive.where.operationGroup,
                    directive.where.operation,
                    directive.where.parameter,
                    directive.select);
            default:
                throw Error(`Unexpected SelectType: ${JSON.stringify(directive.select)}`);
        }
    }
}

class MatchAllNodeSelector extends NodeSelector {
    constructor() {
        super();
    }

    public match(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): boolean {
        return true;
    }
}

class CommandNodeSelector extends NodeSelector {

    constructor(private operationGroupName: string, private operationName: string, private parameterName: string, private selectType: SelectType) {
        super();

    }

    public match(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): boolean {

        return Helper.ToSelectType(descriptor.metadata) === this.selectType &&
            Helper.matchRegex(Helper.createRegex(this.parameterName, true /*emptyAsMatchAll*/), descriptor.parameterName) &&
            Helper.matchRegex(Helper.createRegex(this.operationName, true /*emptyAsMatchAll*/), descriptor.operationName) &&
            Helper.matchRegex(Helper.createRegex(this.operationGroupName, true /*emptyAsMatchAll*/), descriptor.operationGroupName);
    }

}