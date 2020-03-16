import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { Helper } from "../helper";
import { CliConst, M4Node } from "../schema";

export class PreNamer{
    private static readonly CLI_KEY = "cliKey";

    constructor(protected session: Session<CodeModel>){
    }

    public process() {
        Helper.enumerateCodeModel(this.session.model, (n) => {
            if (!isNullOrUndefined(n.target.language.default.name))
                Helper.setCliProperty(n.target, PreNamer.CLI_KEY, n.target.language.default.name);
        });
    }

    public static setCliKey(node: M4Node, value) {
        Helper.setCliProperty(node, PreNamer.CLI_KEY, value);
    }

    public static getCliKey(node: M4Node) {
        return isNullOrUndefined(node.language[CliConst.CLI]) ? '<missing_cli_key>' : node.language[CliConst.CLI][PreNamer.CLI_KEY];
    }
}

export async function processRequest(host: Host) {
    let debugOutput = {};

    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    Helper.init(session);

    let cliDebug = await session.getValue('debug', false);

    if (cliDebug) {
        debugOutput['clicommon-0010-prename-pre.yaml'] = serialize(session.model);
        debugOutput['clicommon-0010-prename-pre-simplified.yaml'] = Helper.toYamlSimplified(session.model);
    }

    let pn = new PreNamer(session);
    pn.process();

    if (cliDebug) {
        debugOutput['clicommon-0020-prename-post.yaml'] = serialize(session.model);
        debugOutput['clicommon-0020-prename-post-simplified.yaml'] = Helper.toYamlSimplified(session.model);
    }

    // write the final result first which is hardcoded in the Session class to use to build the model..
    // overwrite the modelerfour which should be fine considering our change is backward compatible
    const options = <any>await session.getValue('modelerfour', {});
    if (options['emit-yaml-tags'] !== false) {
        host.WriteFile('code-model-v4.yaml', serialize(session.model, codeModelSchema), undefined, 'code-model-v4');
    }
    if (options['emit-yaml-tags'] !== true) {
        host.WriteFile('code-model-v4-no-tags.yaml', serialize(session.model), undefined, 'code-model-v4-no-tags');
    }

    for (let key in debugOutput)
        host.WriteFile(key, debugOutput[key], null);
}