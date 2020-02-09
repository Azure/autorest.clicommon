import { AutoRestExtension, Session, Channel, Host, startSession } from '@azure-tools/autorest-extension-base';
import { codeModelSchema, CodeModel } from '@azure-tools/codemodel';
import { serialize } from '@azure-tools/codegen';
import { CommonNamer } from './plugins/namer';
import { CommonModifiers } from './plugins/modifiers';

export type LogCallback = (message: string) => void;
export type FileCallback = (path: string, rows: string[]) => void;

const extension = new AutoRestExtension();

extension.Add("clicommon", async autoRestApi => {


    try
    {
        const inputFileUris = await autoRestApi.ListInputs();
        const inputFiles: string[] = await Promise.all(inputFileUris.map(uri => autoRestApi.ReadFile(uri)));
        const session = await startSession<CodeModel>(autoRestApi, {}, codeModelSchema);
        let cliCommonSettings = autoRestApi.GetValue("cli");

        // at this point namer and modifirers are in a single plug-in
        const namer = await new CommonNamer(session).init();
        let result = namer.process();

        const modifiers = new CommonModifiers(session);
        modifiers.codeModel = result;
        modifiers.directives = (cliCommonSettings != null) ? cliCommonSettings['directives'] : null;
        result = await modifiers.process();

        // add test scenario from common settings
        if (cliCommonSettings) {
            result["test-scenario"] = cliCommonSettings['test-scenario'];
        }

        // emit a file (all input files concatenated)
        autoRestApi.WriteFile("code-model-v4-cli.yaml", serialize(result));
    }
    catch (e)
    {
        Error(e.message + " -- " + JSON.stringify(e.stack));
    }
});

/*async function initializePlugins(pluginHost: AutoRestExtension) {
    pluginHost.Add("clinamer", clinamer);
    pluginHost.Add("climodifiers", climodifiers);
}

initializePlugins(extension);*/

extension.Run();