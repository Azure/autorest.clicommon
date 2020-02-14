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
    private operationGroupNameRegex: RegExp;
    private operationNameRegex: RegExp;
    private parameterNameRegex: RegExp;
    private selectType: SelectType;

    constructor(operationGroupName: string, operationName: string, parameterName: string, selectType: SelectType) {
        super();

        let emptyAsMatchAll: boolean = true
        this.parameterNameRegex = Helper.toRegex(parameterName, emptyAsMatchAll);
        this.operationNameRegex = Helper.toRegex(operationName, emptyAsMatchAll);
        this.operationGroupNameRegex = Helper.toRegex(operationGroupName, emptyAsMatchAll);
        this.selectType = selectType;
    }

    public match(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): boolean {

        return Helper.ToSelectType(descriptor.metadata) === this.selectType &&
            Helper.matchRegex(this.parameterNameRegex, descriptor.parameterName) &&
            Helper.matchRegex(this.operationNameRegex, descriptor.operationName) &&
            Helper.matchRegex(this.operationGroupNameRegex, descriptor.operationGroupName);
    }

}