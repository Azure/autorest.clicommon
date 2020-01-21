import { AutoRestExtension, Channel, Host, startSession } from '@azure-tools/autorest-extension-base';
import { codeModelSchema, CodeModel } from '@azure-tools/codemodel';
import { serialize } from '@azure-tools/codegen';
import { Namer } from './plugins/namer';
import { Modifiers } from './plugins/modifiers';

export type LogCallback = (message: string) => void;
export type FileCallback = (path: string, rows: string[]) => void;

const extension = new AutoRestExtension();

extension.Add("clicommon", async autoRestApi => {


    try
    {
        const isDebugFlagSet = await autoRestApi.GetValue("debug");
        let cliCommonSettings = await autoRestApi.GetValue("cli");

        const session = await startSession<CodeModel>(autoRestApi, {}, codeModelSchema);


        // at this point namer and modifirers are in a single plug-in
        const namer = await new Namer(session).init();
        let result = namer.process();

        autoRestApi.Message({
            Channel: Channel.Warning,
            Text: "XXX --- namer finished"
        });

        const modifiers = new Modifiers(session);

        autoRestApi.Message({
            Channel: Channel.Warning,
            Text: "XXX --- created modifiers"
        });

        modifiers.codeModel = result;
        modifiers.directives = (cliCommonSettings != null) ? cliCommonSettings['directives'] : null;

        autoRestApi.Message({
            Channel: Channel.Warning,
            Text: "XXX --- processing modifiers"
        });

        //result = modifiers.process();

        autoRestApi.Message({
            Channel: Channel.Warning,
            Text: "XXX --- modifiers-processed"
        });

        // add test scenario from common settings
        if (cliCommonSettings) {
            result["test-scenario"] = cliCommonSettings['test-scenario'];
        }

        autoRestApi.Message({
            Channel: Channel.Warning,
            Text: "XXX --- writing file"
        });
        // emit a file (all input files concatenated)
        autoRestApi.WriteFile("code-model-v4-cli.yaml", serialize(result));

        autoRestApi.Message({
            Channel: Channel.Warning,
            Text: "XXX --- file written"
        });

    }
    catch (e)
    {
        Error(e.message + " -- " + JSON.stringify(e.stack));
    }
});

extension.Run();