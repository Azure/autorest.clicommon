import { AutoRestExtension, Channel } from '@azure-tools/autorest-extension-base';


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

        // emit a file (all input files concatenated)
        autoRestApi.WriteFile("code-model-v4-cli.yaml", inputFiles[inputFileUris.indexOf("code-model-v4-no-tags.yaml")]);
    }
    catch (e)
    {
        Error(e.message + " -- " + JSON.stringify(e.stack));
    }
});

extension.Run();