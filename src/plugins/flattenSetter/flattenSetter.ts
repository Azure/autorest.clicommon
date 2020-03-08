import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { DESTRUCTION } from "dns";
import { Helper } from "../../helper";
import { CliConst } from "../../schema";
import { CliDirectiveManager } from "../modifier/cliDirective";
import { Modifier } from "../modifier/modifier";
import { FlattenValidator } from "./flattenValidator";

const DISCRIMINATOR = 'discriminator';

export class FlattenSetter {
    codeModel: CodeModel;
    cliConfig: any;
    manager: CliDirectiveManager;

    public static isBase(o: ObjectSchema) {
        return !isNullOrUndefined(o[DISCRIMINATOR]);
    }

    public static setFlatten(p: Property, isFlatten: boolean) {
        if (isNullOrUndefined(p.extensions))
            p.extensions = {};
        p.extensions[CliConst.FLATTEN_FLAG] = isFlatten;
    }

    public static isFlattened(p: Property) {
        return !isNullOrUndefined(p.extensions) && p.extensions[CliConst.FLATTEN_FLAG] == true;
    }

    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    async process(host: Host) {

        this.codeModel.schemas.objects.forEach(o => {
            if (!isNullOrUndefined(o.properties)) {
                o.properties.forEach(p => {
                    if (isObjectSchema(p.schema)) {
                        if (isNullOrUndefined(p.extensions))
                            p.extensions = {};
                        p.extensions[CliConst.FLATTEN_FLAG] = !FlattenSetter.isBase(p.schema as ObjectSchema);
                    }
                })
            }
        });

        return this.codeModel;
    }
}

export async function processRequest(host: Host) {
    let debugOutput = {};

    const session = await startSession<CodeModel>(host, {}, codeModelSchema);
    Helper.init(session);

    let cliDebug = await session.getValue('debug', false);
    let flag = await session.getValue(CliConst.CLI_FLATTEN_SET_ENABLED_KEY, false);
    if (flag !== true) {
        Helper.logWarning(`'${CliConst.CLI_FLATTEN_SET_ENABLED_KEY}' is not set to true, skip flattenSetter`);
    }
    else {

        if (cliDebug) {
            debugOutput['cli-flatten-set-before-everything.yaml'] = serialize(session.model);
            debugOutput['cli-flatten-set-before-everything-simplified.yaml'] = Helper.toYamlSimplified(session.model);
        }

        let flattenAll = await session.getValue(CliConst.CLI_FLATTEN_SET_FLATTEN_ALL_KEY);
        if (flattenAll === true) {
            const plugin = await new FlattenSetter(session);
            let flatResult = await plugin.process(host);

            if (cliDebug) {
                debugOutput['cli-flatten-set-after-flatten-set.yaml'] = serialize(flatResult);
                debugOutput['cli-flatten-set-after-flatten-set-simplified.yaml'] = Helper.toYamlSimplified(flatResult);
            }
        }

        let directives = await session.getValue(CliConst.CLI_FLATTEN_DIRECTIVE_KEY, null);
        if (!isNullOrUndefined(directives) && isArray(directives) && directives.length > 0) {
            const modifier = await new Modifier(session).init(directives);
            let modResult: CodeModel = modifier.process();
            if (cliDebug) {
                debugOutput['cli-flatten-set-after-modifier.yaml'] = serialize(modResult);
                debugOutput['cli-flatten-set-after-modifier-simplified.yaml'] = Helper.toYamlSimplified(modResult);
            }
        }

    }
    let finalMapping = new FlattenValidator(session).validate(session.model.schemas.objects)
    if (cliDebug) {
        debugOutput['cli-flatten-set-flatten-mapping.txt'] = finalMapping;
    }

    // write the final result first which is hardcoded in the Session class to use to build the model..
    // overwrite the modelerfour which should be fine considering our change is backward compatible
    const options = <any>await session.getValue('modelerfour', {});
    if (options['emit-yaml-tags'] !== false) {
        host.WriteFile('code-model-v4.yaml', serialize(session.model, codeModelSchema), undefined, 'code-model-v4');
    }
    if (options['emit-yaml-tags'] !== true) {
        host.WriteFile('code-model-v4-no-tags.yaml', serialize(session.model), undefined, 'code-model-v4-no-tags');
    }

    for (let key in debugOutput)
        host.WriteFile(key, debugOutput[key], null);
}