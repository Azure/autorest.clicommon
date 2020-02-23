import { CliCommonSchema, CliConst, M4NodeType } from "../../schema"
import { isNullOrUndefined } from "util";
import { Helper } from "../../helper"
import { Parameter } from "@azure-tools/codemodel";
import { keys } from "@azure-tools/linq";

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
        let alias = {
            parameter: ['param'],
            operation: ['op'],
            operationGroup: ['group', 'resource'],
            objectSchema: ['type', 'object'],
            property: ['prop'],
            choiceSchema: ['enum'],
            choiceValue: ['value'],
        };

        for (let key in alias) {
            alias[key].forEach(av => this.where[key] = this.where[key] ?? this.where[av]);
        };

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
            else if (!Helper.isEmptyString(this.where.choiceValue))
                this.selectType = CliConst.SelectType.choiceValue;
            else if (!Helper.isEmptyString(this.where.choiceSchema))
                this.selectType = CliConst.SelectType.choiceSchema;
            else
                throw Error("SelectType missing in directive: " + JSON.stringify(where));
        }
    }

    public match(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): boolean {

        // TODO: seperate different node type to get better performance when needed
        let match = (e, v) => isNullOrUndefined(e) || Helper.matchRegex(Helper.createRegex(e), v);
        if (Helper.ToM4NodeType(descriptor.target) !== this.selectType)
            return false;

        let r: boolean = false;
        switch (this.selectType) {
            case CliConst.SelectType.operationGroup:
            case CliConst.SelectType.operation:
            case CliConst.SelectType.parameter:
                r = match(this.where.operationGroup, descriptor.operationGroupName) &&
                    match(this.where.operation, descriptor.operationName) &&
                    match(this.where.parameter, descriptor.parameterName);
                break;
            case CliConst.SelectType.choiceSchema:
            case CliConst.SelectType.choiceValue:
                r = match(this.where.choiceSchema, descriptor.choiceSchema) &&
                    match(this.where.choiceValue, descriptor.choiceValue);
                break;
            case CliConst.SelectType.objectSchema:
            case CliConst.SelectType.property:
                r = match(this.where.objectSchema, descriptor.objectSchemaName) &&
                    match(this.where.property, descriptor.propertyName);
                break;
            default:
                throw Error(`Unknown select type: ${this.selectType}`)
        }
        return r;
    }

}