import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, codeModelSchema } from "@azure-tools/codemodel";
import { Helper } from "../helper";
import { NodeCliHelper } from "../nodeHelper";
import { Flattener, FlattenSetting } from "../flattener";
import { CliConst, M4Node } from "../schema";

export class M4FlattenModifier {

    constructor(protected session: Session<CodeModel>, protected payloadFlattenTrack1Enabled: boolean){
    }

    public async process(setting: FlattenSetting): Promise<void> {
        const isFlattenTarget = (node: M4Node, isPayload: boolean) => {
            const isM4Flatten = NodeCliHelper.isCliM4Flatten(node);
            // If track1 flatten is enabled, we always regard payload should be flattened.
            return isPayload ? this.payloadFlattenTrack1Enabled || isM4Flatten : isM4Flatten;
        };
        const onAfterFlatten = (node: M4Node) => {
            // To diff from flatten on normal path, we use cli-m4-flattened on m4 path
            if (NodeCliHelper.isCliFlattened(node)) {
                NodeCliHelper.clearCliProperty(node, NodeCliHelper.CLI_FLATTENED);
                NodeCliHelper.setCliM4Flattened(node, true);
            }
        };

        const flattener = new Flattener(this.session, isFlattenTarget, onAfterFlatten);
        await flattener.process(setting);
    }
}

export async function processRequest(host: Host): Promise<void> {
    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    const dumper = await Helper.getDumper(session);
    dumper.dumpCodeModel("m4-flatten-pre", session.model);

    const options = await session.getValue('modelerfour', {});
    const flattenEnabled = options['flatten-models'] === true;
    const propNumThreshold = await session.getValue(CliConst.CLI_FLATTEN_SET_M4FLATTEN_PAYLOAD_MAX_PROP_KEY, 0);
    const keepUnusedModel = options['keep-unused-flattened-models'] === true;
    const flattenMultiReqPayload = options['multiple-request-parameter-flattening'] === false;
    const flattenPayload = await session.getValue('modelerfour.flatten-payloads', false) === true;
    const polyEnabled = false;

    const flattenSetting: FlattenSetting = {
        flattenEnabled,
        propNumThreshold,
        keepUnusedModel,
        flattenMultiReqPayload,
        flattenPayload,
        polyEnabled
    };

    const payloadFlattenTrack1Enabled = await session.getValue(CliConst.CLI_FLATTEN_SET_M4FLATTEN_PAYLOAD_TRACK1_ENABLED_KEY, false) === true;

    const flattenModifier = new M4FlattenModifier(session, payloadFlattenTrack1Enabled);
    await flattenModifier.process(flattenSetting);
    
    dumper.dumpCodeModel("m4-flatten-post", session.model);

    await Helper.outputToModelerfour(host, session);
    await dumper.persistAsync(host);
}
