import { CliCommonSchema, SelectType, CliConst } from "../../schema"
import { isNullOrUndefined } from "util";
import { Helper } from "../../helper"
import { Metadata, Parameter } from "@azure-tools/codemodel";

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
            case CliConst.SelectType.objectSchema:
            case CliConst.SelectType.property:
                return new CommandNodeSelector(
                    directive.where,
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

    constructor(private where: CliCommonSchema.CliDirective.WhereClause, private selectType: SelectType) {
        super();

    }

    public match(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): boolean {

        let match = (e, v) => isNullOrUndefined(e) || Helper.matchRegex(Helper.createRegex(e), v);
        return Helper.ToSelectType(descriptor.metadata) === this.selectType &&
            match(this.where.objectSchema, descriptor.objectSchemaName) &&
            match(this.where.property, descriptor.propertyName) &&
            match(this.where.operationGroup, descriptor.operationGroupName) &&
            match(this.where.operation, descriptor.operationName) &&
            match(this.where.parameter, descriptor.parameterName);
    }

}