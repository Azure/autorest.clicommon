import { AutoRestExtension, startSession } from '@azure-tools/autorest-extension-base';
import { serialize } from '@azure-tools/codegen';
import { CodeModel, codeModelSchema, OperationGroup, Operation, Schema, ObjectSchema, Property } from '@azure-tools/codemodel';
import { Helper } from './helper';
import { Modifier } from './plugins/modifier/modifier';
import { CommonNamer } from './plugins/namer';
import { processRequest as flattenSetter } from './plugins/flattenSetter/flattenSetter';
import { processRequest as preNamer } from './plugins/prenamer';
import { CliConst } from './schema';
import { processRequest as polyAsResourceModifier } from './plugins/polyAsResourceModifier';
import { processRequest as polyAsParamModifier } from './plugins/polyAsParamModifier';
import { processRequest as complexMarker } from './plugins/complexMarker';

const extension = new AutoRestExtension();

extension.Add("clicommon", async host => {
    const session = await Helper.init(host);

    Helper.dumper.dumpCodeModel("modifier-pre");
    
    let arr = await session.getValue(CliConst.CLI_DIRECTIVE_KEY, null);
    const modifier = await new Modifier(session).init(arr);
    let result = modifier.process();

    Helper.dumper.dumpCodeModel("modifier-post");

    const namer = await new CommonNamer(session).init();
    result = namer.process();

    Helper.dumper.dumpCodeModel("namer-post");

    // add test scenario from common settings
    let cliCommonSettings = await host.GetValue("cli");
    if (cliCommonSettings) {
        result["test-scenario"] = cliCommonSettings['test-scenario'] || cliCommonSettings['test-setup'];
    }

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
});

extension.Add("cli-flatten-setter", flattenSetter);
extension.Add("cli-prenamer", preNamer);
extension.Add("cli-poly-as-resource-modifier", polyAsResourceModifier);
extension.Add("cli-poly-as-param-modifier", polyAsParamModifier);
extension.Add("cli-complex-marker", complexMarker);
extension.Run();