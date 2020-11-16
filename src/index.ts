import { AutoRestExtension, startSession } from '@azure-tools/autorest-extension-base';
import { Helper } from './helper';
import { processRequest as flattenSetter } from './plugins/flattenSetter/flattenSetter';
import { processRequest as splitOperation } from './plugins/splitOperation';
import { processRequest as preNamer } from './plugins/prenamer';
import { processRequest as polyAsResourceModifier } from './plugins/polyAsResourceModifier';
import { processRequest as polyAsParamModifier } from './plugins/polyAsParamModifier';
import { processRequest as complexMarker } from './plugins/complexMarker';
import { processRequest as visibilityCleaner } from './plugins/visibilityCleaner';
import { processRequest as flattenModifier } from './plugins/flattenModifier';
import { processRequest as modelerPostProcessor } from './plugins/modelerPostProcessor';
import { processRequest as modifier } from './plugins/modifier/modifier';
import { processRequest as namer } from './plugins/namer';
import { processRequest as m4namer } from './plugins/m4namer';
import { processRequest as m4FlattenModifier } from './plugins/m4flattenModifier';
import { CodeModel, codeModelSchema } from '@azure-tools/codemodel';

const extension = new AutoRestExtension();

extension.Add("cli-test", async host => {
    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    const dumper = await Helper.getDumper(session);
    dumper.dumpCodeModel("test-pre", session.model);

    // add test scenario from common settings
    const cliCommonSettings = await host.GetValue("test") || await host.GetValue("cli");
    if (cliCommonSettings) {
        session.model["test-scenario"] = cliCommonSettings['test-scenario'] || cliCommonSettings['test-setup'];
    }

    dumper.dumpCodeModel("test-post", session.model);

    await Helper.outputToModelerfour(host, session);
    await dumper.persistAsync(host);
});

extension.Add("cli-flatten-setter", flattenSetter);
extension.Add("cli-prenamer", preNamer);
extension.Add("cli-split-operation", splitOperation);
extension.Add("cli-modeler-post-processor", modelerPostProcessor);
extension.Add("cli-poly-as-resource-modifier", polyAsResourceModifier);
extension.Add("cli-flatten-modifier", flattenModifier);
extension.Add("cli-poly-as-param-modifier", polyAsParamModifier);
extension.Add("cli-modifier", modifier);
extension.Add("cli-namer", namer);
extension.Add("cli-m4flatten-modifier", m4FlattenModifier);
extension.Add("cli-m4namer", m4namer);
extension.Add("cli-complex-marker", complexMarker);
extension.Add("cli-visibility-cleaner", visibilityCleaner);
extension.Run();