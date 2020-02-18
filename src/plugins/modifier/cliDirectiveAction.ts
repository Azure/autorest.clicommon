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

    protected createCliSubNode(metadata: Metadata, nodeName: string) : any {
        if (isNullOrUndefined(metadata.language[CliConst.CLI]))
            metadata.language[CliConst.CLI] = {};
        if (isNullOrUndefined(metadata.language[CliConst.CLI][nodeName]))
            metadata.language[CliConst.CLI][nodeName] = {};
        return metadata.language[CliConst.CLI][nodeName];
    }

    protected setCliProperty(metadata: Metadata, key: string, value: any): void {
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
                case 'log':
                    logNeeded = true;
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
            let value = this.directiveSet[key];
            this.setCliProperty(metadata, key, value);
        }
    }
}

class ActionFormatTable extends Action {
    
    constructor(private directiveFormatTable: CliCommonSchema.CliDirective.FormatTableClause) {
        super();
    }

    public process(metadata: Metadata): void {
        if (!isNullOrUndefined(this.directiveFormatTable.properties)) {
            var n = this.createCliSubNode(metadata, CliConst.CLI_FORMATTABLE);
            n[CliConst.CLI_FORMATTABLE_PROPERTIES] = this.directiveFormatTable.properties;
        }
    }
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
            this.setCliProperty(metadata, this.actionReplace.field, original.replace(this.actionReplace.old, this.actionReplace.new));
        }
        else {
            var regex = new RegExp(this.actionReplace.old);
            this.setCliProperty(metadata, this.actionReplace.field, original.replace(regex, this.actionReplace.new));
        }
    }
}