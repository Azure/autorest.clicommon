import {
    Metadata,
    CodeModel,
    Operation,
    OperationGroup,
    Parameter
} from "@azure-tools/codemodel";
import {
    Channel,
    Session
} from "@azure-tools/autorest-extension-base";
import { CliCommonSchema, CliConst } from "../../schema";
import { isNullOrUndefined } from "util";
import { Logger } from "../../logger";
import { Helper } from "../../helper"

export abstract class Action {
    constructor() {
    }
    public abstract process(metadata: Metadata): void;

    protected setProperty(metadata: Metadata, key: string, value: any): void {
        if (isNullOrUndefined(metadata.language[CliConst.CLI]))
            metadata.language[CliConst.CLI] = {};
        metadata.language[CliConst.CLI][key] = value;
    }

    public static async buildActionList(directive: CliCommonSchema.CliDirective.Directive, session: Session<CodeModel>): Promise<Action[]> {
        if (isNullOrUndefined(directive)) {
            throw Error("arguement 'directive' is null or undefined");
        }

        var arr: Action[] = [];
        var logNeeded: boolean = false;

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
                case 'setname':
                    var naming = await session.getValue("clicommon.nameing", null);
                    if (naming === null)
                        naming = await session.getValue("modelerfour.naming", {})
                    arr.push(new ActionSetName(value, naming));
                    break;
                case 'log':
                    logNeeded = true;
                    break;
                case 'replace':
                    arr.push(new ActionReplace(value));
                    break;
                default:
                    // TODO: better to log instead of throw here?
                    throw Error("Unknown directive operation");
            }
        }
        if (logNeeded) {
            if (directive.log.position == 'pre' || directive.log.position == "both" || isNullOrUndefined(directive.log.position))
                arr.splice(0, 0, new ActionLog(directive.log));
            if (directive.log.position == "post" || directive.log.position == "both" || isNullOrUndefined(directive.log.position))
                arr.push(new ActionLog(directive.log))
        }
        return arr;
    }
}

class ActionSet extends Action {

    constructor(private directiveSet: CliCommonSchema.CliDirective.SetClause) {
        super();
    }

    public process(metadata: Metadata): void {
        for (var key in this.directiveSet) {
            this.setProperty(metadata, key, this.directiveSet[key]);
        }
    }
}

class ActionSetName extends Action {
    private newName: string;
    private naming: CliCommonSchema.CliDirective.NamingStyleSetting;

    /**
     * 
     * @param newNameInKebabCase new name in kebab-case
     * @param style
     */
    constructor(private directiveSetName: CliCommonSchema.CliDirective.SetNameClause, private nameStyleSetting: CliCommonSchema.CliDirective.NamingStyleSetting) {
        super();
        this.newName = directiveSetName.name;
        this.naming = nameStyleSetting;
    }

    public process(metadata: Metadata): void {
        Helper.validateNullOrUndefined(this.directiveSetName.name, 'name');

        var name: string = this.newName;
        var style: string = null;

        if (metadata instanceof OperationGroup)
            style = this.naming.operationGroup;
        else if (metadata instanceof Operation)
            style = this.naming.operation;
        else if (metadata instanceof Parameter)
            style = this.naming.parameter;
        else 
            Logger.instance.error(`Unsupported metadata type for naming action: ${typeof (metadata)}`);

        if (Helper.isEmptyString(style)) {
            Logger.instance.warning("No naming style found, use kebab-case as default");
            style = CliConst.NamingStyle.kebab;
        }

        switch (style) {
            case CliConst.NamingStyle.camel:
                name = this.newName.split('-').map((value, index) => (index == 0 ? value : Helper.UpcaseFirstLetter(value))).join('');
                break;
            case CliConst.NamingStyle.kebab:
                name = this.newName;
                break;
            case CliConst.NamingStyle.snake:
                name = this.newName.replace('-', '_');
                break;
            case CliConst.NamingStyle.pascal:
                name = this.newName.split('-').map((value) => Helper.UpcaseFirstLetter(value)).join('');
                break;
            case CliConst.NamingStyle.space:
                name = this.newName.replace('-', ' ');
                break;
            case CliConst.NamingStyle.upper:
                name = this.newName.split('-').map(value => value.toUpperCase).join('_');
                break;
            default:
                throw Error(`Unknown name style: ${style}`)
        }
        this.setProperty(metadata, "name", name);
    };
}

class ActionLog extends Action {

    constructor(private directiveLog: CliCommonSchema.CliDirective.LogClause) {
        super();
    }

    public process(metadata: Metadata): void {
        Logger.instance.log({
            Text: `${this.directiveLog.message ?? "NodeInfo:"}: ${JSON.stringify(metadata)}`,
            Channel: Channel[this.directiveLog.logLevel ?? "Debug"]
        })
    }
}

class ActionReplace extends Action {
    constructor(private actionReplace: CliCommonSchema.CliDirective.ReplaceClause) {
        super();
    }

    public process(metadata: Metadata): void {
        Helper.validateNullOrUndefined(this.actionReplace.field, 'field');
        Helper.validateNullOrUndefined(this.actionReplace.old, 'old');
        Helper.validateNullOrUndefined(this.actionReplace.new, 'new');

        var original: string = metadata.language.default[this.actionReplace.field].toString();
        if (isNullOrUndefined(this.actionReplace.isRegex) || this.actionReplace.isRegex == false) {
            metadata.language[CliConst.CLI][this.actionReplace.field] = original.replace(this.actionReplace.old, this.actionReplace.new);
        }
        else {
            var regex = new RegExp(this.actionReplace.old);
            metadata.language[CliConst.CLI][this.actionReplace.field] = original.replace(regex, this.actionReplace.new);
        }
    }
}