import { Host, Session } from '@azure-tools/autorest-extension-base';
import { serialize } from '@azure-tools/codegen';
import { CodeModel, Info } from '@azure-tools/codemodel';
import { Helper } from './helper';
import { isNullOrUndefined } from 'util';

export class Dumper {
    readonly INDEX_KEY = 'cli-dump-index';
    debugEnabled = false;
    debugIndexIncrease = 10;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dumpDebug: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dumpOther: any = {};
    info: Info;

    constructor(private host: Host, private session: Session<CodeModel>) {
    }

    public async init(): Promise<Dumper> {
        this.debugEnabled = await this.session.getValue('debug', false);
        this.info = this.session.model.info;
        if (isNullOrUndefined(this.info.extensions)) {
            this.info.extensions = {};
        }
        if (isNullOrUndefined(this.info.extensions[this.INDEX_KEY])) {
            this.info.extensions[this.INDEX_KEY] = 10;
        }
        return this;
    }

    private get dumpIndex(): number {
        return this.info.extensions[this.INDEX_KEY];
    }

    private increaseDumpIndex(): void {
        this.info.extensions[this.INDEX_KEY] += 10;
    }

    public dumpCodeModel(name: string): void {
        if (this.debugEnabled) {
            this.dumpDebug[`clicommon-${this.dumpIndex.toString().padStart(6, '0')}-${name}.yaml`] = serialize(this.session.model);
            this.dumpDebug[`clicommon-${this.dumpIndex.toString().padStart(6, '0')}-${name}-simplified.yaml`] = Helper.toYamlSimplified(this.session.model);
            this.increaseDumpIndex();
        }
    }

    public dump(name: string, content: string, debugOnly: boolean): void {
        if (debugOnly) {
            this.dumpDebug[name] = content;
        }
        else {
            this.dumpOther[name] = content;
        }
    }

    public async persistAsync(): Promise<void> {
        if (this.debugEnabled) {
            for (const key in this.dumpDebug) {
                this.host.WriteFile(key, this.dumpDebug[key], null);
            }
        }
        for (const key in this.dumpOther) {
            this.host.WriteFile(key, this.dumpOther[key], null);
        }
    }
}
