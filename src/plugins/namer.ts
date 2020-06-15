import { CodeModel, codeModelSchema, Property, Language, Metadata, Operation, OperationGroup, Parameter, ComplexSchema, ObjectSchema, ChoiceSchema, ChoiceValue, SealedChoiceSchema } from '@azure-tools/codemodel';
import { Session, Host, startSession, Channel } from '@azure-tools/autorest-extension-base';
import { serialize, deserialize } from '@azure-tools/codegen';
import { values, items, length, Dictionary, keys } from '@azure-tools/linq';
import { isNullOrUndefined } from 'util';
import { CliCommonSchema, CliConst, LanguageType, M4Node } from '../schema';
import { Helper } from '../helper';
import { NodeHelper, NodeExtensionHelper, NodeCliHelper } from '../nodeHelper';
import { FlattenHelper } from '../flattenHelper';

export class CommonNamer {
    codeModel: CodeModel
    cliNamingSettings: CliCommonSchema.NamingConvention
    defaultNamingSettings: CliCommonSchema.NamingConvention
    flag: Set<Metadata>

    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    public async init() {
        // any configuration if necessary
        this.cliNamingSettings = Helper.normalizeNamingSettings(await this.session.getValue("cli.naming.cli", {}));
        this.defaultNamingSettings = Helper.normalizeNamingSettings(await this.session.getValue("cli.naming.default", {}));

        return this;
    }

    public process() {
        this.flag = new Set<Metadata>();
        this.applyNamingConvention(this.codeModel);
        this.processGlobalParam();
        this.processSchemas();
        this.processOperationGroups();
        this.processCliOperation();
        this.flag = null;
        return this.codeModel;
    }

    private processSchemas() {
        let schemas = this.codeModel.schemas;

        for (let obj of values(schemas.objects)) {
            this.applyNamingConvention(obj);
            for (let property of values(obj.properties)) {
                this.applyNamingConvention(property);
            }
        }

        for (let dict of values(schemas.dictionaries)) {
            this.applyNamingConvention(dict);
            this.applyNamingConvention(dict.elementType);
        }

        for (let enumn of values(schemas.choices)) {
            this.applyNamingConvention(enumn);
            for (let item of values(enumn.choices)) {
                this.applyNamingConvention(item);
            }
        }

        for (let enumn of values(schemas.sealedChoices)) {
            this.applyNamingConvention(enumn);
            for (let item of values(enumn.choices)) {
                this.applyNamingConvention(item);
            }
        }

        for (let arr of values(schemas.arrays)) {
            this.applyNamingConvention(arr);
            this.applyNamingConvention(arr.elementType);
        }

        for (let cons of values(schemas.constants)) {
            this.applyNamingConvention(cons);
        }

        for (let num of values(schemas.numbers)) {
            this.applyNamingConvention(num);
        }

        for (let str of values(schemas.strings)) {
            this.applyNamingConvention(str);
        }
    }

    private processOperationGroups() {
        for (const operationGroup of values(this.codeModel.operationGroups)) {
            this.applyNamingConvention(operationGroup);

            for (const operation of values(operationGroup.operations)) {

                // Handle operations in group
                this.applyNamingConvention(operation);
                for (const parameter of values(operation.parameters)) {
                    this.applyNamingConvention(parameter);
                }
                
                for (const request of values(operation.requests)) {
                    if (!isNullOrUndefined(request.parameters)) {
                        for (const parameter of values(request.parameters)) {
                            this.applyNamingConvention(parameter);
                        }
                    }
                }
            }
        }
    }

    private processGlobalParam() {
        for (let para of values(this.codeModel.globalParameters)) {
            this.applyNamingConvention(para);
        }
    }

    private processCliOperation() {

        // To be backward compatiable, reassign poly operations and parameters' default name and cli name
        for (const operationGroup of values(this.codeModel.operationGroups)) {
            for (const operation of values(operationGroup.operations)) {
                for (const op of values(NodeExtensionHelper.getCliOperation(operation, () => []))) {
                    this.applyNamingConventionOnCliOperation(operation, op);
                    for (const parameter of values(op.parameters)) {
                        this.applyNamingConvention(parameter);
                    }
                    
                    for (const request of values(op.requests)) {
                        if (!isNullOrUndefined(request.parameters)) {
                            for (const parameter of values(request.parameters)) {
                                this.applyNamingConventionOnCliParameter(parameter);
                            }
                        }
                    }
                }
            }
        }
    }

    private applyNamingConventionOnCliOperation(operation: Operation, cliOperation: Operation) {
        if (cliOperation == null || cliOperation.language == null) {
            this.session.message({ Channel: Channel.Warning, Text: "working in obj has problems" });
            return;
        }
        if (isNullOrUndefined(cliOperation.language['cli'])) {
            cliOperation.language['cli'] = new Language();
        }
        cliOperation.language['cli']['description'] = operation.language.default.description;

        const discriminatorValue = NodeExtensionHelper.getPolyAsResourceDiscriminatorValue(cliOperation);
        cliOperation.language.default.name = Helper.createPolyOperationDefaultName(operation, discriminatorValue);
        cliOperation.language['cli']['name'] = Helper.createPolyOperationCliName(operation, discriminatorValue);
    }

    private applyNamingConventionOnCliParameter(cliParameter: Parameter) {
        if (cliParameter == null || cliParameter.language == null) {
            this.session.message({ Channel: Channel.Warning, Text: "working in obj has problems" });
            return;
        }

        if (isNullOrUndefined(cliParameter.language['cli'])) {
            cliParameter.language['cli'] = new Language();
        }

        const prop = NodeExtensionHelper.getCliFlattenOrigin(cliParameter);
        if (isNullOrUndefined(prop)) {
            // Is not flattened parameter, use default naming
            this.applyNamingConvention(cliParameter);
            return;
        }

        cliParameter.language['cli']['description'] = prop.language.default.description;

        const prefix = NodeExtensionHelper.getCliFlattenPrefix(cliParameter);
        cliParameter.language.default.name = FlattenHelper.createFlattenedParameterDefaultName(prop, prefix);
        cliParameter.language['cli']['name'] = FlattenHelper.createFlattenedParameterCliName(prop, prefix);
    }

    private applyNamingConvention(obj: any) {
        if (obj == null || obj.language == null) {
            this.session.message({ Channel: Channel.Warning, Text: "working in obj has problems" });
            return;
        }

        if (isNullOrUndefined(obj.language['cli']))
            obj.language['cli'] = new Language();
        if (isNullOrUndefined(obj.language['cli']['name'])) {
            obj.language['cli']['name'] = obj.language.default.name;
        }
        if (isNullOrUndefined(obj.language['cli']['description']))
            obj.language['cli']['description'] = obj.language.default.description;

        if (!isNullOrUndefined(obj['discriminatorValue'])) {
            let dv: string = obj['discriminatorValue'];
            // dv should be in pascal format, let's do a simple convert to snake
            let newValue = dv.replace(/([A-Z][a-z0-9]+)|([A-Z]+(?=[A-Z][a-z0-9]+))|([A-Z]+$)/g, '_$1$2$3').substr(1).toLowerCase();
            NodeCliHelper.setCliDiscriminatorValue(obj, newValue);
        }

        let lan = 'cli';
        if (!this.flag.has(obj.language[lan])) {
            this.flag.add(obj.language[lan]);
            Helper.applyNamingConvention(this.cliNamingSettings, obj, lan);
        }

        lan = 'default';
        if (!this.flag.has(obj.language[lan])) {
            this.flag.add(obj.language[lan]);
            Helper.applyNamingConvention(this.defaultNamingSettings, obj, lan);
        }
    }
}

export async function processRequest(host: Host) {
    const session = await Helper.init(host);
    Helper.dumper.dumpCodeModel("namer-pre");

    const debug = await host.GetValue('debug') || false;
    try {
        const plugin = await new CommonNamer(session).init();
        plugin.process();
    } catch (E) {
        if (debug) {
            console.error(`${__filename} - FAILURE  ${JSON.stringify(E)} ${E.stack}`);
        }
        throw E;
    }
    Helper.dumper.dumpCodeModel("namer-post");

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();

}
