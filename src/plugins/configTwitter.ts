import { Host, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, codeModelSchema } from "@azure-tools/codemodel";
import { Helper } from "../helper";

export async function processRequest(host: Host) {
    let debugOutput = {};
    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    Helper.init(session);

    let oriNaming : any = await session.getValue('modelerfour.naming');
    Helper.logDebug(JSON.stringify(oriNaming));
    oriNaming.property = 'snake';
    oriNaming.property = 'snake';
    oriNaming.operation = 'snake';
    oriNaming.operationGroup = 'snake';
    oriNaming.choice = 'snake';
    oriNaming.choiceValue = 'snake';
    oriNaming.constant = 'snake';
    oriNaming.type = 'snake';
    await session.setValue('modelerfour.naming', oriNaming);
    Helper.logDebug(JSON.stringify(oriNaming));

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