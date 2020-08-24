import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, codeModelSchema } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { NodeCliHelper } from "../nodeHelper";
import { CliCommonSchema, CliConst } from "../schema";
import { Modifier } from "./modifier/modifier";
import { CopyHelper } from "../copyHelper";

export class PreNamer{

    constructor(protected session: Session<CodeModel>) {
    }

    public async process(): Promise<void> {
        Helper.enumerateCodeModel(this.session.model, (n) => {
            if (!isNullOrUndefined(n.target.language.default.name))
                NodeCliHelper.setCliKey(n.target, n.target.language.default.name);
        });

        // Add json directive here, because it will disable m4 flatten which defined in swagger
        const directives = await this.session.getValue(CliConst.CLI_FLATTEN_DIRECTIVE_KEY, []);
        const cliDirectives = await this.session.getValue(CliConst.CLI_DIRECTIVE_KEY, []);

        const jsonDirectives = [...directives, ...cliDirectives]
            .filter((dir) => (!isNullOrUndefined(dir.json) || !isNullOrUndefined(dir.flatten)))
            .map((dir) => this.createPreJson(dir));
        if (jsonDirectives && jsonDirectives.length > 0) {
            const modifier = await new Modifier(this.session).init(jsonDirectives);
            modifier.process();
        }
    }


    private createPreJson(src: CliCommonSchema.CliDirective.Directive): CliCommonSchema.CliDirective.Directive {
        const copy: CliCommonSchema.CliDirective.Directive = {
            select: src.select,
            where: CopyHelper.deepCopy(src.where),
            'pre-json': src.json
        };
        return copy;
    }
}

export async function processRequest(host: Host): Promise<void> {
    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    const dumper = await Helper.getDumper(session);
    dumper.dumpCodeModel("prename-pre", session.model);

    const pn = new PreNamer(session);
    await pn.process();

    dumper.dumpCodeModel("prename-post", session.model);

    await Helper.outputToModelerfour(host, session);
    await dumper.persistAsync(host);
}