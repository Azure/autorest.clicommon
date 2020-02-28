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

    // at this point namer and modifirers are in a single plug-in
    const modifier = await new Modifier(session).init();
    let result = modifier.process();
    let afterModifier = serialize(result);
    let simplifiedModelAfterModifier = Helper.toYamlSimplified(session.model);

    const namer = await new CommonNamer(session).init();
    result = namer.process();
    let afterNamer = serialize(result);
    let simplifiedModelAfterNamer = Helper.toYamlSimplified(session.model);

    // add test scenario from common settings
    let cliCommonSettings = await autoRestApi.GetValue("cli");
    if (cliCommonSettings) {
        result["test-scenario"] = cliCommonSettings['test-scenario'];
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

    autoRestApi.WriteFile("code-model-v4-cli-after-modifier.yaml", afterModifier);
    autoRestApi.WriteFile("code-model-v4-cli-after-modifier-simplified.yaml", simplifiedModelAfterModifier);
    autoRestApi.WriteFile("code-model-v4-cli-after-namer.yaml", afterNamer);
    autoRestApi.WriteFile("code-model-v4-cli-after-namer-simplified.yaml", simplifiedModelAfterNamer);

});

extension.Run();