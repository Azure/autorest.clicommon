import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { CopyHelper } from "../copyHelper";

export class ModelerPostProcessor {

    constructor(protected session: Session<CodeModel>) {
    }

    public process(): void {
        Helper.enumerateCodeModel(this.session.model, (n) => {

            // In case cli is shared by multiple instances during modelerfour, do deep copy
            if (!isNullOrUndefined(n.target.language['cli'])) {
                n.target.language['cli'] = CopyHelper.deepCopy(n.target.language['cli']);
            }
        });
    }
}

export async function processRequest(host: Host): Promise<void> {

    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("modeler-post-processor-pre");

    const pn = new ModelerPostProcessor(session);
    pn.process();

    Helper.dumper.dumpCodeModel("modeler-post-processor-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}
