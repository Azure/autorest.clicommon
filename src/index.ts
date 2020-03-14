import { AutoRestExtension, startSession } from '@azure-tools/autorest-extension-base';
import { serialize } from '@azure-tools/codegen';
import { CodeModel, codeModelSchema, OperationGroup, Operation, Schema, ObjectSchema, Property } from '@azure-tools/codemodel';
import { Helper } from './helper';
import { Modifier } from './plugins/modifier/modifier';
import { CommonNamer } from './plugins/namer';
import { processRequest as flattenSetter } from './plugins/flattenSetter/flattenSetter';
import { processRequest as preNamer } from './plugins/prenamer';
import { CliConst } from './schema';
import { isNullOrUndefined } from 'util';

const extension = new AutoRestExtension();

extension.Add("clicommon", async autoRestApi => {
    const session = await startSession<CodeModel>(autoRestApi, {}, codeModelSchema);
    Helper.init(session);

    let cliDebug = await session.getValue('debug', false);
    // at this point namer and modifirers are in a single plug-in
    let debugOutput = {};

    if (cliDebug) {
        debugOutput['clicommon-0060-modifier-pre.yaml'] = serialize(session.model);
        debugOutput['clicommon-0060-modifier-pre-simplified.yaml'] = Helper.toYamlSimplified(session.model);
        debugOutput['clicommon-modifier-naming.yaml'] = debugOutput['clicommon-modifier-pre-simplified.yaml'];
    }
    
    let arr = await session.getValue(CliConst.CLI_DIRECTIVE_KEY, null);

    const modifier = await new Modifier(session).init(arr);
    let result = modifier.process();
    if (cliDebug) {
        debugOutput['clicommon-0070-modifier-post.yaml'] = serialize(result);
        debugOutput['clicommon-0070-modifier-post-simplified.yaml'] = Helper.toYamlSimplified(session.model);
    }

    const namer = await new CommonNamer(session).init();
    result = namer.process();
    if (cliDebug) {
        debugOutput['clicommon-0080-namer-post-namer.yaml'] = serialize(result);
        debugOutput['clicommon-0080-namer-post-simplified.yaml'] = Helper.toYamlSimplified(session.model);
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

    for (let key in debugOutput)
        autoRestApi.WriteFile(key, debugOutput[key], null);
});

extension.Add("cli-flatten-setter", flattenSetter);
extension.Add("cli-prenamer", preNamer);

extension.Run();