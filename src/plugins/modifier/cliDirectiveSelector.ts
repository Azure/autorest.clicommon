import { CliCommonSchema, CliConst, M4NodeType } from "../../schema"
import { isNullOrUndefined } from "util";
import { Helper } from "../../helper"
import { Parameter } from "@azure-tools/codemodel";

export abstract class NodeSelector {
    constructor() {
    }

    public abstract match(node: CliCommonSchema.CodeModel.NodeDescriptor): boolean;

    public static createSelector(directive: CliCommonSchema.CliDirective.Directive) {

        return new CommandNodeSelector(
            directive.where,
            directive.select);
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

    constructor(private where: CliCommonSchema.CliDirective.WhereClause, private selectType: M4NodeType) {
        super();
        if (isNullOrUndefined(selectType)) {
            if (!Helper.isEmptyString(this.where.parameter))
                this.selectType = CliConst.SelectType.parameter;
            else if (!Helper.isEmptyString(this.where.operation))
                this.selectType = CliConst.SelectType.operation;
            else if (!Helper.isEmptyString(this.where.operationGroup))
                this.selectType = CliConst.SelectType.operationGroup;
            else if (!Helper.isEmptyString(this.where.property))
                this.selectType = CliConst.SelectType.property;
            else if (!Helper.isEmptyString(this.where.objectSchema))
                this.selectType = CliConst.SelectType.objectSchema;
            else if (!Helper.isEmptyString(this.where.enumValue))
                this.selectType = CliConst.SelectType.enumValue;
            else if (!Helper.isEmptyString(this.where.enumSchema))
                this.selectType = CliConst.SelectType.enumSchema;
            else
                throw Error("SelectType missing in directive: " + JSON.stringify(where));
        }
    }

    public match(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): boolean {

        // TODO: seperate different node type to get better performance when needed
        let match = (e, v) => isNullOrUndefined(e) || Helper.matchRegex(Helper.createRegex(e), v);
        return Helper.ToM4NodeType(descriptor.target) === this.selectType &&
            match(this.where.enumSchema, descriptor.enumSchema) &&
            match(this.where.enumValue, descriptor.enumValue) &&
            match(this.where.objectSchema, descriptor.objectSchemaName) &&
            match(this.where.property, descriptor.propertyName) &&
            match(this.where.operationGroup, descriptor.operationGroupName) &&
            match(this.where.operation, descriptor.operationName) &&
            match(this.where.parameter, descriptor.parameterName);
    }

}