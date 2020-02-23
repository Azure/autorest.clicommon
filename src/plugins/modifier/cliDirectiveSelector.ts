import { isNullOrUndefined } from "util";
import { Helper } from "../../helper";
import { CliCommonSchema, CliConst, M4NodeType } from "../../schema";

export class NodeSelector {

    private where: CliCommonSchema.CliDirective.WhereClause;
    private selectType: M4NodeType;

    constructor(directive: CliCommonSchema.CliDirective.Directive) {
        this.where = directive.where;
        this.selectType = directive.select;

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

        if (isNullOrUndefined(this.selectType)) {
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
                throw Error("SelectType missing in directive: " + JSON.stringify(this.where));
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