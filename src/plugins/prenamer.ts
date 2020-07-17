import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { NodeCliHelper } from "../nodeHelper";

export class PreNamer{

    constructor(protected session: Session<CodeModel>) {
    }

    public process(): void {
        Helper.enumerateCodeModel(this.session.model, (n) => {
            if (!isNullOrUndefined(n.target.language.default.name))
                NodeCliHelper.setCliKey(n.target, n.target.language.default.name);
        });
    }
}

export async function processRequest(host: Host): Promise<void> {

    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("prename-pre");

    const pn = new PreNamer(session);
    pn.process();

    Helper.dumper.dumpCodeModel("prename-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}