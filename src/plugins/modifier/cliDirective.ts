import { NodeSelector } from "./cliDirectiveSelector"
import { Action } from "./cliDirectiveAction"
import { CliCommonSchema, CliConst } from "../../schema"
import { CodeModel, } from "@azure-tools/codemodel";
import { Session, } from "@azure-tools/autorest-extension-base";
import { isNullOrUndefined } from "util";

class CliDirective {

    private selector: NodeSelector;
    private actions: Action[];

    constructor(private directive: CliCommonSchema.CliDirective.Directive, private session: Session<CodeModel>) {
    }

    async init(): Promise<CliDirective> {
        this.selector = new NodeSelector(this.directive);
        this.actions = await Action.buildActionList(this.directive, this.session);
        return this;
    }

    process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        if (this.selector.match(descriptor)) {
            for (var action of this.actions) {
                action.process(descriptor);
            }
        }
    }
}

export class CliDirectiveManager {
    private directives: CliDirective[] = [];

    public async LoadDirective(session: Session<CodeModel>) {
        var arr: CliCommonSchema.CliDirective.Directive[] = await session.getValue(CliConst.CLI_DIRECTIVE_KEY, null);

        if (!isNullOrUndefined(arr) && !Array.isArray(arr)) {
            throw Error("cli-directive is expected to be an array. Please check '-' is set property in yaml")
        }

        this.directives = isNullOrUndefined(arr) ? [] : await Promise.all(arr.map(async v => new CliDirective(v, session).init()));
    }

    public process(descripter: CliCommonSchema.CodeModel.NodeDescriptor) {
        for (var d of this.directives)
            d.process(descripter);
    }
}