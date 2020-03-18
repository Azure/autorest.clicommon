import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { serialize } from "@azure-tools/codegen";
import { CodeModel, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme, Info } from "@azure-tools/codemodel";
import { Helper } from "./helper";
import { isNull, isNullOrUndefined } from "util";

export class Dumper {
    readonly INDEX_KEY = 'cli-dump-index';
    debugEnabled: boolean = false;
    debugIndexIncrease: number = 10;
    dumpDebug: any = {};
    dumpOther: any = {};
    info: Info;

    constructor(private host: Host, private session: Session<CodeModel>) {
    }

    public async init() {
        this.debugEnabled = await this.session.getValue('debug', false);
        this.info = this.session.model.info;
        if (isNullOrUndefined(this.info.extensions))
            this.info.extensions = {};
        if (isNullOrUndefined(this.info.extensions[this.INDEX_KEY]))
            this.info.extensions[this.INDEX_KEY] = 10;
        return this;
    }

    private get dumpIndex(): number {
        return this.info.extensions[this.INDEX_KEY];
    }

    private increaseDumpIndex() {
        this.info.extensions[this.INDEX_KEY] += 10;
    }

    public dumpCodeModel(name: string) {
        if (this.debugEnabled) {
            this.dumpDebug[`clicommon-${this.dumpIndex.toString().padStart(6, '0')}-${name}.yaml`] = serialize(this.session.model);
            this.dumpDebug[`clicommon-${this.dumpIndex.toString().padStart(6, '0')}-${name}-simplified.yaml`] = Helper.toYamlSimplified(this.session.model);
            this.increaseDumpIndex();
        }
    }

    public dump(name: string, content: string, debugOnly: boolean) {
        if (debugOnly)
            this.dumpDebug[name] = content;
        else
            this.dumpOther[name] = content;
    }

    public async persistAsync() {
        if (this.debugEnabled) {
            for (let key in this.dumpDebug)
                this.host.WriteFile(key, this.dumpDebug[key], null);
        }
        for (let key in this.dumpOther)
            this.host.WriteFile(key, this.dumpOther[key], null);
    }
}