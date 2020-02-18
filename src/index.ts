import { AutoRestExtension, Session, Channel, Host, startSession } from '@azure-tools/autorest-extension-base';
import { codeModelSchema, CodeModel } from '@azure-tools/codemodel';
import { serialize } from '@azure-tools/codegen';
import { CommonNamer } from './plugins/namer';
import { Modifier } from './plugins/modifier/modifier';
import { Logger } from './logger';
import { Helper } from './helper';

export type LogCallback = (message: string) => void;
export type FileCallback = (path: string, rows: string[]) => void;

const extension = new AutoRestExtension();

extension.Add("clicommon", async autoRestApi => {
    const session = await startSession<CodeModel>(autoRestApi, {}, codeModelSchema);
    Logger.Initialize(session);

    // at this point namer and modifirers are in a single plug-in
    const modifier = await new Modifier(session).init();
    let result = modifier.process();
    autoRestApi.WriteFile("code-model-v4-cli-modifier.yaml", serialize(result));
    autoRestApi.WriteFile("code-model-v4-cli-modifier-report.yaml", Helper.generateReport(session.model));

    const namer = await new CommonNamer(session).init();
    result = namer.process();
    autoRestApi.WriteFile("code-model-v4-cli-namer.yaml", serialize(result));
    autoRestApi.WriteFile("code-model-v4-cli-namer-report.yaml", Helper.generateReport(session.model));

    // add test scenario from common settings
    let cliCommonSettings = await autoRestApi.GetValue("cli");
    if (cliCommonSettings) {
        result["test-scenario"] = cliCommonSettings['test-scenario'];
    }

    // emit a file (all input files concatenated)
    autoRestApi.WriteFile("code-model-v4-cli.yaml", serialize(result));
});

extension.Run();