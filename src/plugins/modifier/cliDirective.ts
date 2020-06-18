import { NodeSelector } from "./cliDirectiveSelector";
import { Action } from "./cliDirectiveAction";
import { CliCommonSchema } from "../../schema";
import { isNullOrUndefined } from "util";

class CliDirective {

    private selector: NodeSelector;
    private actions: Action[];

    constructor(private directive: CliCommonSchema.CliDirective.Directive) {
    }

    async init(): Promise<CliDirective> {
        this.selector = new NodeSelector(this.directive);
        this.actions = await Action.buildActionList(this.directive);
        return this;
    }

    process(descriptor: CliCommonSchema.CodeModel.NodeDescriptor): void {
        if (this.selector.match(descriptor)) {
            for (const action of this.actions) {
                action.process(descriptor);
            }
        }
    }
}

export class CliDirectiveManager {
    private directives: CliDirective[] = [];

    public async LoadDirective(directives: CliCommonSchema.CliDirective.Directive[]): Promise<void> {

        this.directives = isNullOrUndefined(directives) ? [] : await Promise.all(directives.map(async v => new CliDirective(v).init()));
    }

    public process(descripter: CliCommonSchema.CodeModel.NodeDescriptor): void {
        for (const d of this.directives)
            d.process(descripter);
    }
}