import { CodeModel, codeModelSchema, Property, Language, Metadata, Operation, OperationGroup, Parameter, ComplexSchema, ObjectSchema, ChoiceSchema, ChoiceValue, SealedChoiceSchema } from '@azure-tools/codemodel';
import { Session, Host, startSession, Channel } from '@azure-tools/autorest-extension-base';
import { serialize, deserialize } from '@azure-tools/codegen';
import { values, items, length, Dictionary, keys } from '@azure-tools/linq';
import { isNullOrUndefined } from 'util';
import { CliCommonSchema, CliConst, LanguageType, M4Node } from '../schema';
import { Helper } from '../helper';
import { NodeHelper } from '../nodeHelper';

export class CommonNamer {
    codeModel: CodeModel
    cliNamingSettings: CliCommonSchema.NamingConvention
    defaultNamingSettings: CliCommonSchema.NamingConvention
    flag: Set<Metadata>

    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    async init() {
        // any configuration if necessary
        this.cliNamingSettings = Helper.normalizeNamingSettings(await this.session.getValue("cli.naming.cli", {}));
        this.defaultNamingSettings = Helper.normalizeNamingSettings(await this.session.getValue("cli.naming.default", {}));

        return this;
    }

    process() {
        this.flag = new Set<Metadata>();
        this.getCliName(this.codeModel);
        this.processGlobalParam();
        this.processSchemas();
        this.processOperationGroups();
        this.flag = null;
        return this.codeModel;
    }


    getCliName(obj: any, isCliOp: boolean = false) {
        if (obj == null || obj.language == null) {
            this.session.message({ Channel: Channel.Warning, Text: "working in obj has problems" });
            return;
        }

        let baseClass = '';
        if (isNullOrUndefined(obj.language['cli']))
            obj.language['cli'] = new Language();
        if (isNullOrUndefined(obj.language['cli']['name'])) {
            if (isCliOp) {
                // The expected subclass operation cli name is in format '<name>#<subclass>'. According to 'polyAsResourceModifier', 
                // current default.name is '<name>_<subclass>'. To avoid name and subclass are mixed during namingConvention, we 
                // remove the subclass before namingConvention, then add it back with '#'
                const index = obj.language.default.name.lastIndexOf('_');
                baseClass = obj.language.default.name.substring(index + 1);
                obj.language['cli']['name'] = obj.language.default.name.substring(0, index);
            } else {
                obj.language['cli']['name'] = obj.language.default.name;
            }
        }
        if (isNullOrUndefined(obj.language['cli']['description']))
            obj.language['cli']['description'] = obj.language.default.description;

        if (!isNullOrUndefined(obj['discriminatorValue'])) {
            let dv: string = obj['discriminatorValue'];
            // dv should be in pascal format, let's do a simple convert to snake
            let newValue = dv.replace(/([A-Z][a-z0-9]+)|([A-Z]+(?=[A-Z][a-z0-9]+))|([A-Z]+$)/g, '_$1$2$3').substr(1).toLowerCase();
            NodeHelper.setCliDiscriminatorValue(obj, newValue);
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

        if (isCliOp) {
            obj.language['cli']['name'] += `#${baseClass}`;
        }
    }

    processSchemas() {
        let schemas = this.codeModel.schemas;

        for (let obj of values(schemas.objects)) {
            this.getCliName(obj);
            for (let property of values(obj.properties)) {
                this.getCliName(property);
            }
        }

        for (let dict of values(schemas.dictionaries)) {
            this.getCliName(dict);
            this.getCliName(dict.elementType);
        }

        for (let enumn of values(schemas.choices)) {
            this.getCliName(enumn);
            for (let item of values(enumn.choices)) {
                this.getCliName(item);
            }
        }

        for (let enumn of values(schemas.sealedChoices)) {
            this.getCliName(enumn);
            for (let item of values(enumn.choices)) {
                this.getCliName(item);
            }
        }

        for (let arr of values(schemas.arrays)) {
            this.getCliName(arr);
            this.getCliName(arr.elementType);
        }

        for (let cons of values(schemas.constants)) {
            this.getCliName(cons);
        }

        for (let num of values(schemas.numbers)) {
            this.getCliName(num);
        }

        for (let str of values(schemas.strings)) {
            this.getCliName(str);
        }
    }

    processOperationGroups() {
        for (const operationGroup of values(this.codeModel.operationGroups)) {
            this.getCliName(operationGroup);

            for (const operation of values(operationGroup.operations)) {

                // Handle operations in group
                this.getCliName(operation);
                for (const parameter of values(operation.parameters)) {
                    this.getCliName(parameter);
                }
                
                for (const request of values(operation.requests)) {
                    if (!isNullOrUndefined(request.parameters)) {
                        for (const parameter of values(request.parameters)) {
                            this.getCliName(parameter);
                        }
                    }
                }

                // Handle operations in extension
                NodeHelper.getCliOperation(operation, () => []).forEach((op) => {
                    this.getCliName(op, true);
                    for (const parameter of values(op.parameters)) {
                        this.getCliName(parameter);
                    }
                    
                    for (const request of values(op.requests)) {
                        if (!isNullOrUndefined(request.parameters)) {
                            for (const parameter of values(request.parameters)) {
                                this.getCliName(parameter);
                            }
                        }
                    }
                });
            }
        }
    }

    processGlobalParam() {
        for (let para of values(this.codeModel.globalParameters)) {
            this.getCliName(para);
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
