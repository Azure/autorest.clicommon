import { CodeModel, codeModelSchema, Property, Language, Metadata, Operation, OperationGroup, Parameter, ComplexSchema, ObjectSchema, ChoiceSchema, ChoiceValue, SealedChoiceSchema } from '@azure-tools/codemodel';
import { Session, Host, startSession, Channel } from '@azure-tools/autorest-extension-base';
import { serialize, deserialize } from '@azure-tools/codegen';
import { values, items, length, Dictionary } from '@azure-tools/linq';
import { isNullOrUndefined } from 'util';
import { CliCommonSchema, CliConst, LanguageType, M4Node } from '../schema';
import { Helper } from '../helper';
import { pascalCase, EnglishPluralizationService } from '@azure-tools/codegen';

export class CommonNamer {
    codeModel: CodeModel
    namingConvention: CliCommonSchema.NamingConvention
    flag: Set<Metadata>
    glossary: string[]

    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    async init() {
        // any configuration if necessary
        this.namingConvention = await this.session.getValue("clicommon.naming", {});
        if (isNullOrUndefined(this.namingConvention.singularize))
            this.namingConvention.singularize = [];
        this.glossary = await this.session.getValue("clicommon.glossary", []);
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
    
    singularize(word: string): string {
        let loWord = word.toLowerCase();
        if (this.glossary.findIndex(v => v === loWord) >= 0)
            return word;

        const eps = new EnglishPluralizationService();
        eps.addWord('Database', 'Databases');
        eps.addWord('database', 'databases');
        return eps.singularize(word);
    }

    /**
     * only support Operation, OperationGroup, Parameter, Property, ObjectSchema for now
     * @param oldName
     * @param metadata
     */
    public convertNamingConvention(node: M4Node) {
        var style: string = null;

        if (isNullOrUndefined(this.namingConvention))
            return;
        if (isNullOrUndefined(node.language['cli']))
            return;

        let single = false;
        switch (Helper.TryToM4NodeType(node)) {
            case CliConst.SelectType.operationGroup:
                style = this.namingConvention.operationGroup;
                single = this.namingConvention.singularize.includes(CliConst.SelectType.operationGroup);
                break;
            case CliConst.SelectType.operation:
                style = this.namingConvention.operation;
                single = this.namingConvention.singularize.includes(CliConst.SelectType.operation);
                break;
            case CliConst.SelectType.parameter:
                style = this.namingConvention.parameter;
                single = this.namingConvention.singularize.includes(CliConst.SelectType.parameter);
                break;
            case CliConst.SelectType.property:
                style = this.namingConvention.property;
                single = this.namingConvention.singularize.includes(CliConst.SelectType.property);
                break;
            case CliConst.SelectType.objectSchema:
                style = this.namingConvention.type;
                single = this.namingConvention.singularize.includes(CliConst.SelectType.objectSchema);
                break;
            case CliConst.SelectType.choiceSchema:
                style = this.namingConvention.choice;
                single = this.namingConvention.singularize.includes(CliConst.SelectType.choiceSchema);
                break;
            case CliConst.SelectType.choiceValue:
                style = this.namingConvention.choiceValue;
                single = this.namingConvention.singularize.includes(CliConst.SelectType.choiceValue);
                break;
        }

        if (Helper.isEmptyString(style)) {
            return;
        }

        let oldName: string = node.language['cli']['name'];
        let glossary: string[] = node.language['cli']['glossary'];
        if (isNullOrUndefined(glossary))
            glossary = [];

        let getSingleArr = (n: string) => n.split(SEP).map(v => this.singularize(v));
        let getPluralArr = (n: string) => n.split(SEP);
        let up1 = (n: string) => n.length == 1 ? n.toUpperCase() : n[0].toUpperCase().concat(n.substr(1).toLowerCase());

        const SEP = '_';
        let newName: string;
        switch (style) {
            case CliConst.NamingStyle.camel:
                newName = (single ? getSingleArr(oldName) : getPluralArr(oldName)).map((v, i) => i === 0 ? v : up1(v)).join('');
                break;
            case CliConst.NamingStyle.kebab:
                newName = single ? getSingleArr(oldName).join('-') : oldName.replace(SEP, '-');
                break;
            case CliConst.NamingStyle.snake:
                newName = single ? getSingleArr(oldName).join('_') : oldName;
                break;
            case CliConst.NamingStyle.pascal:
                newName = (single ? getSingleArr(oldName) : getPluralArr(oldName)).map(v => up1(v)).join('');
                break;
            case CliConst.NamingStyle.space:
                newName = single ? getSingleArr(oldName).join(' ') : oldName.replace(SEP, ' ');
                break;
            case CliConst.NamingStyle.upper:
                newName = single ? getSingleArr(oldName).join('_').toUpperCase() : oldName.toUpperCase();
                break;
            default:
                throw Error(`Unknown name style: ${style}`)
        }

        node.language['cli']['name'] = newName;
    }

    getCliName(obj: any) {
        if (obj == null || obj.language == null) {
            this.session.message({ Channel: Channel.Warning, Text: "working in obj has problems" });
            return;
        }
        if (isNullOrUndefined(obj.language['cli']))
            obj.language['cli'] = new Language();
        if (isNullOrUndefined(obj.language['cli']['name']))
            obj.language['cli']['name'] = obj.language.default.name;
        if (isNullOrUndefined(obj.language['cli']['description']))
            obj.language['cli']['description'] = obj.language.default.description;

        if (!this.flag.has(obj)) {
            this.flag.add(obj);
            this.convertNamingConvention(obj);
            // TODO: shall we apply to default?
            //let lan: LanguageType[] = this.namingConvention?.applyTo;
            //for (let l of lan) {
            //    if (!isNullOrUndefined(obj.language[l]) && !isNullOrUndefined(obj.language[l]['name']))
            //        obj.language[l]['name'] = this.convertNamingConvention(obj.language[l]['name'], obj);
            //}
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
        // cleanup 
        for (const operationGroup of values(this.codeModel.operationGroups)) {
            this.getCliName(operationGroup);

            for (const operation of values(operationGroup.operations)) {
                this.getCliName(operation);

                for (const parameter of values(operation.request.parameters)) {
                    this.getCliName(parameter);
                }
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
    const debug = await host.GetValue('debug') || false;
    //host.Message({Channel:Channel.Warning, Text:"in aznamer processRequest"});

    //console.error(extensionName);
    try {
        const session = await startSession<CodeModel>(host, {}, codeModelSchema);
        const plugin = new CommonNamer(session);
        let result = plugin.process();
        host.WriteFile('namer-code-model-v4-cli.yaml', serialize(result));
    } catch (E) {
        if (debug) {
            console.error(`${__filename} - FAILURE  ${JSON.stringify(E)} ${E.stack}`);
        }
        throw E;
    }

}