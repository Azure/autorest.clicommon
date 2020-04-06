import { Session } from "@azure-tools/autorest-extension-base";
import { CodeModel } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { Helper } from "../../helper";
import { CliCommonSchema, CliConst, M4Node } from "../../schema";
import { NodeHelper } from "../../nodeHelper";

export abstract class Action {
    constructor() {
    }
    public abstract process(node: CliCommonSchema.CodeModel.NodeDescriptor): void;

    public static async buildActionList(directive: CliCommonSchema.CliDirective.Directive): Promise<Action[]> {
        Helper.validateNullOrUndefined(directive, 'directive');
        var arr: Action[] = [];

        for (var key in directive) {
            var value = directive[key];
            if (isNullOrUndefined(value))
                continue;

            key = key.toLowerCase();

            switch (key) {
                case 'select':
                case 'where':
                    break;
                case 'set':
                    arr.push(new ActionSet(value));
                    break;
                case 'hidden':
                case 'removed':
                case 'required':
                case 'poly-resource':
                    arr.push(new ActionSetProperty(value, key, () => true));
                    break;
                case 'delete':
                    arr.push(new ActionDelete(value));
                    break;
                case 'name':
                case 'alias':
                    arr.push(new ActionSetProperty(value, key, () => { throw Error(`${key} missing in directive`) }))
                    break;
                case 'replace':
                    arr.push(new ActionReplace(value));
                    break;
                case 'formattable':
                    arr.push(new ActionFormatTable(value));
                    break;
                case 'flatten':
                    arr.push(new ActionFlatten(value));
                    break;
                case 'json':
                    arr.push(new ActionJson(value));
                    break;
                case 'hitcount':
                    arr.push(new ActionHitCount(value));
                    break;
                default:
                    // TODO: better to log instead of throw here?
                    throw Error(`Unknown directive operation: '${key}'`);
            }
        }
        return arr;
    }
}

export class ActionHitCount extends Action {

    public static hitCount = 0;

    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        ActionHitCount.hitCount++;
    }
}

export class ActionJson extends Action {

    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        let node = descriptor.target;
        NodeHelper.setJson(node, this.directiveValue === true, true /*modify flatten*/)
    }
}

export class ActionFlatten extends Action {

    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        let node = descriptor.target;
        NodeHelper.setFlatten(node, this.directiveValue === true, true /*overwrite*/)
    }
}

export class ActionSetProperty extends Action {

    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause, private propertyName: string, private getDefault: () => any) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        let node = descriptor.target;
        NodeHelper.setCliProperty(node, this.propertyName, this.directiveValue ?? this.getDefault());
    }
}

export class ActionDelete extends Action {

    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        if (this.directiveValue === true) {
            if (!isArray(descriptor.parent))
                throw Error("Only array parent are supported for delete directive now");
            descriptor.parent.splice(descriptor.targetIndex, 1);
        }
    }

}

export class ActionSet extends Action {

    constructor(private directiveSet: CliCommonSchema.CliDirective.SetClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        let node = descriptor.target;
        for (var key in this.directiveSet) {
            let value = this.directiveSet[key];
            NodeHelper.setCliProperty(node, key, value);
        }
    }
}

export class ActionFormatTable extends Action {

    constructor(private directiveFormatTable: CliCommonSchema.CliDirective.FormatTableClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        let node = descriptor.target;
        if (!isNullOrUndefined(this.directiveFormatTable.properties)) {
            NodeHelper.setCliProperty(node, CliConst.CLI_FORMATTABLE, {
                [CliConst.CLI_FORMATTABLE_PROPERTIES]: this.directiveFormatTable.properties
            });
        }
    }
}

export class ActionReplace extends Action {
    constructor(private actionReplace: CliCommonSchema.CliDirective.ReplaceClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        let node = descriptor.target;
        Helper.validateNullOrUndefined(this.actionReplace.field, 'field');
        Helper.validateNullOrUndefined(this.actionReplace.old, 'old');
        Helper.validateNullOrUndefined(this.actionReplace.new, 'new');

        var original: string = node.language.default[this.actionReplace.field].toString();
        if (isNullOrUndefined(this.actionReplace.isRegex) || this.actionReplace.isRegex == false) {
            NodeHelper.setCliProperty(node, this.actionReplace.field, original.replace(this.actionReplace.old, this.actionReplace.new));
        }
        else {
            var regex = new RegExp(this.actionReplace.old);
            NodeHelper.setCliProperty(node, this.actionReplace.field, original.replace(regex, this.actionReplace.new));
        }
    }
}