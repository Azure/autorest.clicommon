import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, codeModelSchema } from "@azure-tools/codemodel";
import { Helper } from "../helper";
import { CliConst, CliCommonSchema } from "../schema";
import { NodeCliHelper } from "../nodeHelper";
import { Modifier } from "./modifier/modifier";
import { CopyHelper } from "../copyHelper";
import { isNullOrUndefined } from "util";
import { Flattener, FlattenSetting } from "../flattener";

export class FlattenModifier {

    constructor(protected session: Session<CodeModel>){
    }

    public async process(setting: FlattenSetting): Promise<void> {
        if (!setting.flattenEnabled) {
            Helper.logDebug(this.session, `${CliConst.CLI_FLATTEN_SET_ENABLED_KEY} is false. Skip flatten.`);
            return;
        }

        await this.modifier();

        const flattener = new Flattener(this.session, (node) => NodeCliHelper.isCliFlatten(node));
        await flattener.process(setting);
    }

    private async modifier(): Promise<void> {
        const directives = await this.session.getValue(CliConst.CLI_FLATTEN_DIRECTIVE_KEY, []);
        const cliDirectives = await this.session.getValue(CliConst.CLI_DIRECTIVE_KEY, []);

        const flattenDirectives = [...directives, ...cliDirectives]
            .filter((dir) => dir[NodeCliHelper.CLI_FLATTEN])
            .map((dir) => this.copyDirectiveOnlyForCliFlatten(dir));
        if (flattenDirectives && flattenDirectives.length > 0) {
            const modifier = await new Modifier(this.session).init(flattenDirectives);
            modifier.process();
        } else {
            Helper.logDebug(this.session, 'No flatten directive is found!');
        }

        // Do json modifier later. Because it will make flatten disabled if json is true
        const jsonDirectives = [...directives, ...cliDirectives]
            .filter((dir) => (!isNullOrUndefined(dir.json)))
            .map((dir) => this.copyDirectiveOnlyForJson(dir));
        if (jsonDirectives && jsonDirectives.length > 0) {
            const modifier = await new Modifier(this.session).init(jsonDirectives);
            modifier.process();
        } else {
            Helper.logDebug(this.session, 'No json directive is found!');
        }
    }

    private copyDirectiveOnlyForCliFlatten(src: CliCommonSchema.CliDirective.Directive): CliCommonSchema.CliDirective.Directive {
        const copy: CliCommonSchema.CliDirective.Directive = {
            select: src.select,
            where: CopyHelper.deepCopy(src.where),
        };
        copy[NodeCliHelper.CLI_FLATTEN] = src[NodeCliHelper.CLI_FLATTEN];
        return copy;
    }

    private copyDirectiveOnlyForJson(src: CliCommonSchema.CliDirective.Directive): CliCommonSchema.CliDirective.Directive {
        const copy: CliCommonSchema.CliDirective.Directive = {
            select: src.select,
            where: CopyHelper.deepCopy(src.where),
            json: src.json
        };
        return copy;
    }

}

export async function processRequest(host: Host): Promise<void> {
    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    const dumper = await Helper.getDumper(session);
    dumper.dumpCodeModel("flatten-pre", session.model);

    const flattenEnabled = (await session.getValue(CliConst.CLI_FLATTEN_SET_ENABLED_KEY, true)) === true;
    const propNumThreshold = await session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_MAX_PROP_KEY, 32);
    const keepUnusedModel = (await session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_KEEP_UNUSED_FLATTENED_MODELS_KEY, false)) === true;
    const flattenMultiReqPayload = (await session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_MULTIPLE_REQUEST_PARAMETER_FLATTENING_KEY, true)) === true;

    const cliFlattenPayload = await session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_PAYLOAD_KEY, true) === true;
    const m4FlattenPayload = await session.getValue('modelerfour.flatten-payloads', false) === true;
    if (m4FlattenPayload) {
        Helper.logDebug(session, 'm4FlattenPayload is true. Skip cli flatten payload');
    }
    const flattenPayload = m4FlattenPayload ? false : cliFlattenPayload;

    const polyEnabled = (await session.getValue(CliConst.CLI_POLYMORPHISM_EXPAND_AS_RESOURCE_KEY, false)) === true;

    const flattenSetting: FlattenSetting = {
        flattenEnabled,
        propNumThreshold,
        keepUnusedModel,
        flattenMultiReqPayload,
        flattenPayload,
        polyEnabled
    };

    const flattenModifier = new FlattenModifier(session);
    await flattenModifier.process(flattenSetting);
    
    dumper.dumpCodeModel("flatten-post", session.model);

    await Helper.outputToModelerfour(host, session);
    await dumper.persistAsync(host);
}
