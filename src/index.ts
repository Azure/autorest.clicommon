import { AutoRestExtension, Channel, Host, startSession } from '@azure-tools/autorest-extension-base';
import { codeModelSchema, CodeModel } from '@azure-tools/codemodel';
import { serialize } from '@azure-tools/codegen';

export type LogCallback = (message: string) => void;
export type FileCallback = (path: string, rows: string[]) => void;

const extension = new AutoRestExtension();

extension.Add("cli.common", async autoRestApi => {


    try
    {
        // read files offered to this plugin
        const inputFileUris = await autoRestApi.ListInputs();

        const inputFiles: string[] = await Promise.all(inputFileUris.map(uri => autoRestApi.ReadFile(uri)));

        // read a setting

        const isDebugFlagSet = await autoRestApi.GetValue("debug");
        let cliCommonSettings = await autoRestApi.GetValue("cli");

        const session = await startSession<CodeModel>(autoRestApi, {}, codeModelSchema);

        // emit messages

        autoRestApi.Message({
            Channel: Channel.Warning,
            Text: "Hello World cli.common! The `debug` flag is " + (isDebugFlagSet ? "set" : "not set"),
        });

        autoRestApi.Message({
            Channel: Channel.Warning,
            Text: "cli.common settings " + JSON.stringify(cliCommonSettings)
        });

        autoRestApi.Message({
            Channel: Channel.Information,
            Text: "AutoRest offers the following input files: " + inputFileUris.join(", "),
        });


        let result = session.model;

        result["ADDITIONAL"] = "TEST";

        // emit a file (all input files concatenated)
        autoRestApi.WriteFile("code-model-v4-cli.yaml", serialize(result, codeModelSchema));
    }
    catch (e)
    {
        Error(e.message + " -- " + JSON.stringify(e.stack));
    }
});

extension.Run();