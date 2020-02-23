import { Session } from "@azure-tools/autorest-extension-base";
import { CodeModel } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../../helper";
import { CliCommonSchema, CliConst, M4Node } from "../../schema";

export abstract class Action {
    constructor() {
    }
    public abstract process(node: M4Node): void;

    protected createCliSubNode(node: M4Node, nodeName: string): any {
        if (isNullOrUndefined(node.language[CliConst.CLI]))
            node.language[CliConst.CLI] = {};
        if (isNullOrUndefined(node.language[CliConst.CLI][nodeName]))
            node.language[CliConst.CLI][nodeName] = {};
        return node.language[CliConst.CLI][nodeName];
    }

    protected setCliProperty(node: M4Node, key: string, value: any): void {
        if (isNullOrUndefined(node.language[CliConst.CLI]))
            node.language[CliConst.CLI] = {};
        node.language[CliConst.CLI][key] = value;
    }

    public static async buildActionList(directive: CliCommonSchema.CliDirective.Directive, session: Session<CodeModel>): Promise<Action[]> {
        Helper.validateNullOrUndefined(directive, 'directive');
        var arr: Action[] = [];

        for (var key in directive) {
            var value = directive[key];
            key = key.toLowerCase();

            switch (key) {
                case 'select':
                case 'where':
                    break;
                case 'set':
                    arr.push(new ActionSet(value));
                    break;
                case 'hide':
                case 'remove':
                    arr.push(new ActionSetProperty(value, key, () => true));
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
                default:
                    // TODO: better to log instead of throw here?
                    throw Error("Unknown directive operation");
            }
        }
        return arr;
    }
}

class ActionSetProperty extends Action {

    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause, private propertyName: string, private getDefault: () => any) {
        super();
    }

    public process(node: M4Node): void {
        this.setCliProperty(node, this.propertyName, this.directiveValue ?? this.getDefault());
    }
}

class ActionSet extends Action {

    constructor(private directiveSet: CliCommonSchema.CliDirective.SetClause) {
        super();
    }

    public process(node: M4Node): void {
        for (var key in this.directiveSet) {
            let value = this.directiveSet[key];
            this.setCliProperty(node, key, value);
        }
    }
}

class ActionFormatTable extends Action {

    constructor(private directiveFormatTable: CliCommonSchema.CliDirective.FormatTableClause) {
        super();
    }

    public process(node: M4Node): void {
        if (!isNullOrUndefined(this.directiveFormatTable.properties)) {
            var n = this.createCliSubNode(node, CliConst.CLI_FORMATTABLE);
            n[CliConst.CLI_FORMATTABLE_PROPERTIES] = this.directiveFormatTable.properties;
        }
    }
}

class ActionReplace extends Action {
    constructor(private actionReplace: CliCommonSchema.CliDirective.ReplaceClause) {
        super();
    }

    public process(node: M4Node): void {
        Helper.validateNullOrUndefined(this.actionReplace.field, 'field');
        Helper.validateNullOrUndefined(this.actionReplace.old, 'old');
        Helper.validateNullOrUndefined(this.actionReplace.new, 'new');

        var original: string = node.language.default[this.actionReplace.field].toString();
        if (isNullOrUndefined(this.actionReplace.isRegex) || this.actionReplace.isRegex == false) {
            this.setCliProperty(node, this.actionReplace.field, original.replace(this.actionReplace.old, this.actionReplace.new));
        }
        else {
            var regex = new RegExp(this.actionReplace.old);
            this.setCliProperty(node, this.actionReplace.field, original.replace(regex, this.actionReplace.new));
        }
    }
}