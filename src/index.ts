import { AutoRestExtension, startSession } from '@azure-tools/autorest-extension-base';
import { serialize } from '@azure-tools/codegen';
import { CodeModel, codeModelSchema, OperationGroup, Operation, Schema, ObjectSchema, Property } from '@azure-tools/codemodel';
import { Helper } from './helper';
import { Modifier } from './plugins/modifier/modifier';
import { CommonNamer } from './plugins/namer';

export type LogCallback = (message: string) => void;
export type FileCallback = (path: string, rows: string[]) => void;

const extension = new AutoRestExtension();

extension.Add("clicommon", async autoRestApi => {
    const session = await startSession<CodeModel>(autoRestApi, {}, codeModelSchema);

    let cliDebug = await session.getValue('debug', false);
    // at this point namer and modifirers are in a single plug-in
    let debugOutput = {};

    let namingMapping = Helper.toYamlSimplified(session.model);
    if (cliDebug) {
        debugOutput['cli-debug-before-everything.yaml'] = serialize(session.model);
    }
    const modifier = await new Modifier(session).init();
    let result = modifier.process();
    if (cliDebug) {
        debugOutput['cli-debug-after-modifier.yaml'] = serialize(result);
        debugOutput['cli-debug-after-modifier-simplified.yaml'] = Helper.toYamlSimplified(session.model);
    }

    const namer = await new CommonNamer(session).init();
    result = namer.process();
    if (cliDebug) {
        debugOutput['cli-debug-after-namer.yaml'] = serialize(result);
        debugOutput['cli-debug-after-namer-simplified.yaml'] = Helper.toYamlSimplified(session.model);
    }

    // add test scenario from common settings
    let cliCommonSettings = await autoRestApi.GetValue("cli");
    if (cliCommonSettings) {
        result["test-scenario"] = cliCommonSettings['test-scenario'] || cliCommonSettings['test-setup'];
    }

    // write the final result first which is hardcoded in the Session class to use to build the model..
    // overwrite the modelerfour which should be fine considering our change is backward compatible
    const options = <any>await session.getValue('modelerfour', {});
    if (options['emit-yaml-tags'] !== false) {
        autoRestApi.WriteFile('code-model-v4.yaml', serialize(result, codeModelSchema), undefined, 'code-model-v4');
    }
    if (options['emit-yaml-tags'] !== true) {
        autoRestApi.WriteFile('code-model-v4-no-tags.yaml', serialize(result), undefined, 'code-model-v4-no-tags');
    }

    autoRestApi.WriteFile("clicommon-name-mapping.yaml", namingMapping);
    for (let key in debugOutput)
        autoRestApi.WriteFile(key, debugOutput[key], null);
});

extension.Run();