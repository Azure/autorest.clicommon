import { CodeModel, codeModelSchema, Property, Language} from '@azure-tools/codemodel';
import { Session, Host, startSession, Channel } from '@azure-tools/autorest-extension-base';
import { serialize, deserialize } from '@azure-tools/codegen';
import { values, items, length, Dictionary } from '@azure-tools/linq';

export class CommonNamer {
    codeModel: CodeModel

    constructor(protected session: Session<CodeModel>) {
        this.codeModel = session.model;
    }

    async init() {
        // any configuration if necessary
        return this;
    }

    process() {
        this.getCliName(this.codeModel);
        this.processGlobalParam();
        this.processSchemas();
        this.processOperationGroups();
        return this.codeModel;
    }

    getCliName(obj: any) {
        if(obj == null || obj.language == null) {
            //return [];
            this.session.message({Channel: Channel.Warning, Text: "working in obj has problems"});
            return;
            //this.session.message({Channel: Channel.Warning, Text:"Object don't have language property: " + serialize(obj)});
        }
        obj.language['cli'] = new Language();
        obj.language['cli']['name'] = obj.language.default.name;
        obj.language['cli']['description'] = obj.language.default.description;
    } 

    processSchemas() {
        let schemas = this.codeModel.schemas;

        for (let obj of values(schemas.objects)) {
            this.getCliName(obj);
            for (let property of values(obj.properties)) {
                this.getCliName(property);
            }
        }

        for(let dict of values(schemas.dictionaries)) {
            this.getCliName(dict);
            this.getCliName(dict.elementType);
        }

        for(let enumn of values(schemas.choices)) {
            this.getCliName(enumn);
            for(let item of values(enumn.choices)) {
                this.getCliName(item);
            }
        }

        for(let enumn of values(schemas.sealedChoices)) {
            this.getCliName(enumn);
            for(let item of values(enumn.choices)) {
                this.getCliName(item);
            }
        }

        for(let arr of values(schemas.arrays)) {
            this.getCliName(arr);
            this.getCliName(arr.elementType);
        }

        for(let cons of values(schemas.constants)) {
            this.getCliName(cons);
            this.getCliName(cons.value);
        }

        for(let num of values(schemas.numbers)) {
            this.getCliName(num);
        }

        for(let str of values(schemas.strings)) {
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
        for(let para of values(this.codeModel.globalParameters)) {
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