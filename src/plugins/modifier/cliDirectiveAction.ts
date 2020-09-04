import { isNullOrUndefined, isArray } from "util";
import { CliCommonSchema, CliConst } from "../../schema";
import { NodeHelper, NodeCliHelper, NodeExtensionHelper } from "../../nodeHelper";


function validateDirective(directive: CliCommonSchema.CliDirective.Directive | string, name: string): void {
    if (isNullOrUndefined(directive)) {
        throw Error(`Validation failed: '${name}' is null or undefined`);
    }
}

export abstract class Action {

    public abstract process(node: CliCommonSchema.CodeModel.NodeDescriptor): void;

    public static async buildActionList(directive: CliCommonSchema.CliDirective.Directive): Promise<Action[]> {
        validateDirective(directive, 'directive');
        const arr: Action[] = [];

        for (let key in directive) {
            const value = directive[key];
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
                case NodeCliHelper.CLI_FLATTEN:
                case NodeCliHelper.POLY_RESOURCE:
                    arr.push(new ActionSetProperty(value, key, () => true));
                    break;
                case NodeCliHelper.SPLIT_OPERATION_NAMES:
                case NodeCliHelper.CLI_MIN_API:
                case NodeCliHelper.CLI_MAX_API:
                    arr.push(new ActionSetProperty(value, key, () => null));
                    break;
                case 'delete':
                    arr.push(new ActionDelete(value));
                    break;
                case 'name':
                case 'alias':
                case 'description':
                case 'default-value':
                    arr.push(new ActionSetProperty(value, key, () => { throw Error(`${key} missing in directive`); }));
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
                case 'pre-json':
                    arr.push(new ActionPreJson(value));
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        ActionHitCount.hitCount++;
    }
}

export class ActionJson extends Action {

    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        const node = descriptor.target;
        NodeHelper.setJson(node, this.directiveValue === true, true /*modify flatten*/);
    }
}

export class ActionPreJson extends Action {

    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        const node = descriptor.target;
        if (this.directiveValue === true && NodeExtensionHelper.getFlattenedValue(node)) {
            // Instead of flatten node in m4, we will do it by ourselves later.
            NodeCliHelper.setCliM4Flatten(node, true);
        }
        NodeHelper.setJson(node, this.directiveValue === true, true /*modify flatten*/);
    }
}

export class ActionFlatten extends Action {

    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        const node = descriptor.target;
        NodeCliHelper.setCliFlatten(node, this.directiveValue === true);
    }
}

export class ActionSetProperty extends Action {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private directiveValue: CliCommonSchema.CliDirective.ValueClause, private propertyName: string, private getDefault: () => any) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        const node = descriptor.target;
        NodeCliHelper.setCliProperty(node, this.propertyName, this.directiveValue ?? this.getDefault());
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
        const node = descriptor.target;
        for (const key in this.directiveSet) {
            const value = this.directiveSet[key];
            NodeCliHelper.setCliProperty(node, key, value);
        }
    }
}

export class ActionFormatTable extends Action {

    constructor(private directiveFormatTable: CliCommonSchema.CliDirective.FormatTableClause) {
        super();
    }

    public process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        const node = descriptor.target;
        if (!isNullOrUndefined(this.directiveFormatTable.properties)) {
            NodeCliHelper.setCliProperty(node, CliConst.CLI_FORMATTABLE, {
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
        const node = descriptor.target;
        validateDirective(this.actionReplace.field, 'field');
        validateDirective(this.actionReplace.old, 'old');
        validateDirective(this.actionReplace.new, 'new');

        const original: string = node.language.default[this.actionReplace.field].toString();
        if (isNullOrUndefined(this.actionReplace.isRegex) || this.actionReplace.isRegex == false) {
            NodeCliHelper.setCliProperty(node, this.actionReplace.field, original.replace(this.actionReplace.old, this.actionReplace.new));
        }
        else {
            const regex = new RegExp(this.actionReplace.old);
            NodeCliHelper.setCliProperty(node, this.actionReplace.field, original.replace(regex, this.actionReplace.new));
        }
    }
}
