import { Host, Session } from '@azure-tools/autorest-extension-base';
import { serialize } from '@azure-tools/codegen';
import { CodeModel, Info, ObjectSchema, Operation, Parameter, OperationGroup, Property, ChoiceSchema, SealedChoiceSchema, StringSchema, ChoiceValue } from '@azure-tools/codemodel';
import { isNullOrUndefined, isString, isArray, isObject, isUndefined, isNull } from 'util';
import { keys } from '@azure-tools/linq';
import { NodeExtensionHelper, NodeHelper, NodeCliHelper } from './nodeHelper';
import { Helper } from './helper';

export class Dumper {
    private debugEnabled = false;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private dumpDebug: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private dumpOther: any = {};
    private info: Info;

    private readonly INDEX_KEY = 'cli-dump-index';

    private static readonly INDENT = '  ';
    private static readonly NEW_LINE = '\n';
    private static readonly INITIAL_INDENT = 1;
    private static readonly MISSING_CLI_KEY = '<missing-clikey>';
    
    constructor(private session: Session<CodeModel>) {
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

    public dumpCodeModel(name: string, model: CodeModel): void {
        if (this.debugEnabled) {
            this.dumpDebug[`clicommon-${this.dumpIndex.toString().padStart(6, '0')}-${name}.yaml`] = serialize(model);
            this.dumpDebug[`clicommon-${this.dumpIndex.toString().padStart(6, '0')}-${name}-simplified.yaml`] = Dumper.toYamlSimplified(model);
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

    public async persistAsync(host: Host): Promise<void> {
        if (this.debugEnabled) {
            for (const key in this.dumpDebug) {
                host.WriteFile(key, this.dumpDebug[key], null);
            }
        }
        for (const key in this.dumpOther) {
            host.WriteFile(key, this.dumpOther[key], null);
        }
    }

    public static toYamlSimplified(codeModel: CodeModel): string {
        const output = ['operationGroups:'];
        output.push(Dumper.tab() + 'all:');
        codeModel.operationGroups.forEach((group) => {
            output.push(...Dumper.formatOperationGroup(group, 1));
        });

        output.push('schemas:');

        output.push(Dumper.tab() + 'objects:');
        output.push(Dumper.tab(1) + 'all:');
        codeModel.schemas.objects?.forEach((obj) => {
            output.push(...Dumper.formatSchemaObject(obj, 2));
        });

        output.push(Dumper.tab() + 'choices:');
        output.push(Dumper.tab(1) + 'all:');
        
        [...(codeModel.schemas.choices ?? []), ...(codeModel.schemas.sealedChoices ?? [])].forEach((choice) => {
            output.push(...Dumper.formatChoice(choice, 2));
        });

        return Dumper.formateOutput(output);
    }

    private static formatOperationGroup(group: OperationGroup, indent: number): string[] {
        const output = [Dumper.tab(indent) + '- operationGroupName: ' + group.language.default.name + Dumper.formatType(group)];

        output.push(...Dumper.formatCliProperties(group, indent + 1));

        output.push(Dumper.tab(indent + 1) + 'operations:');
        group.operations.forEach((op) => {
            output.push(...Dumper.formatOperation(op, indent + 2));
        });

        return output;
    }

    private static formatOperation(operation: Operation, indent: number): string[] {
        const output = [Dumper.tab(indent) + '- operationName: ' + operation.language.default.name + Dumper.formatType(operation)];

        output.push(...Dumper.formatCliProperties(operation, indent + 1));

        const polyParam = NodeExtensionHelper.getPolyAsResourceParam(operation);
        if (!isNullOrUndefined(polyParam)) {
            output.push(Dumper.tab(indent + 1) + 'cli-poly-as-resource-subclass-param: ' + NodeCliHelper.getCliKey(polyParam, Dumper.MISSING_CLI_KEY));
        }

        const polyOriOperation = NodeExtensionHelper.getPolyAsResourceOriginalOperation(operation);
        if (!isNullOrUndefined(polyOriOperation)) {
            output.push(Dumper.tab(indent + 1) + 'cli-poly-as-resource-original-operation: ' + NodeCliHelper.getCliKey(polyOriOperation, Dumper.MISSING_CLI_KEY));
        }

        const discriminatorValue = NodeExtensionHelper.getPolyAsResourceDiscriminatorValue(operation);
        if (!isNullOrUndefined(discriminatorValue)) {
            output.push(Dumper.tab(indent + 1) + 'cli-poly-as-resource-discriminator-value: ' + discriminatorValue);
        }

        const splitOriOperation = NodeExtensionHelper.getSplitOperationOriginalOperation(operation);
        if (!isNullOrUndefined(splitOriOperation)) {
            output.push(Dumper.tab(indent + 1) + 'cli-split-operation-original-operation: ' + NodeCliHelper.getCliKey(splitOriOperation, Dumper.MISSING_CLI_KEY));
        }
        
        output.push(Dumper.tab(indent + 1) + 'parameters:');
        operation.parameters?.forEach((param) => {
            output.push(...Dumper.formatParameter(param, indent + 2));
        });

        operation.requests?.forEach((request, index) => {
            request.parameters?.forEach((param) => { 
                output.push(...Dumper.formatRequestParameter(param, indent + 2, index));
            });
        });

        return output;
    }

    private static formatParameter(parameter: Parameter, indent: number): string[] {
        const output = [Dumper.tab(indent) + '- parameterName: ' + parameter.language.default.name + Dumper.formatType(parameter)];

        output.push(...Dumper.formatCliProperties(parameter, indent + 1));
        
        const flattenValue = NodeExtensionHelper.getFlattenedValue(parameter);
        if (!isNullOrUndefined(flattenValue)) {
            output.push(Dumper.tab(indent + 1) + NodeExtensionHelper.FLATTEN_FLAG + ': ' + flattenValue);
        }

        if (parameter['readOnly'] === true) {
            output.push(Dumper.tab(indent + 1) + 'readOnly: true');
        }

        if (Helper.isObjectSchema(parameter.schema) && NodeHelper.HasSubClass(parameter.schema as ObjectSchema)) {
            output.push(Dumper.tab(indent + 1) + NodeHelper.DISCRIMINATOR_FLAG + ': true');
        }

        const polyBaseSchema = NodeExtensionHelper.getPolyAsResourceBaseSchema(parameter);
        if (!isNullOrUndefined(polyBaseSchema)) {
            output.push(Dumper.tab(indent + 1) + 'cli-poly-as-resource-base-schema: ' + NodeCliHelper.getCliKey(polyBaseSchema, Dumper.MISSING_CLI_KEY));
        }

        const polyParamBaseSchema = NodeExtensionHelper.getPolyAsParamBaseSchema(parameter);
        if (!isNullOrUndefined(polyBaseSchema)) {
            output.push(Dumper.tab(indent + 1) + 'cli-poly-as-param-base-schema: ' + NodeCliHelper.getCliKey(polyParamBaseSchema, Dumper.MISSING_CLI_KEY));
        }

        const polyParamOriParam = NodeExtensionHelper.getPolyAsParamOriginalParam(parameter);
        if (!isNullOrUndefined(polyBaseSchema)) {
            output.push(Dumper.tab(indent + 1) + 'cli-poly-as-param-expanded: ' + NodeCliHelper.getCliKey(polyParamOriParam, Dumper.MISSING_CLI_KEY));
        }

        if (!isNullOrUndefined(parameter.protocol?.http?.in) && parameter.protocol.http.in === 'body') {
            output.push(Dumper.tab(indent + 1) + 'bodySchema: ' + parameter.schema.language.default.name);
        }

        return output;
    }

    private static formatRequestParameter(parameter: Parameter, indent: number, index: number): string[] {
        const output = [Dumper.tab(indent) + '- parameterName[' + index + ']: ' + parameter.language.default.name + Dumper.formatType(parameter)];

        output.push(...Dumper.formatCliProperties(parameter, indent + 1));
        
        const flattenValue = NodeExtensionHelper.getFlattenedValue(parameter);
        if (!isNullOrUndefined(flattenValue)) {
            output.push(Dumper.tab(indent + 1) + NodeExtensionHelper.FLATTEN_FLAG + ': ' + flattenValue);
        }

        if (parameter['readOnly'] === true) {
            output.push(Dumper.tab(indent + 1) + 'readOnly: true');
        }

        if (Helper.isObjectSchema(parameter.schema) && NodeHelper.HasSubClass(parameter.schema as ObjectSchema)) {
            output.push(Dumper.tab(indent + 1) + NodeHelper.DISCRIMINATOR_FLAG + ': true');
        }

        const polyBaseSchema = NodeExtensionHelper.getPolyAsResourceBaseSchema(parameter);
        if (!isNullOrUndefined(polyBaseSchema)) {
            output.push(Dumper.tab(indent + 1) + 'cli-poly-as-resource-base-schema: ' + NodeCliHelper.getCliKey(polyBaseSchema, Dumper.MISSING_CLI_KEY));
        }

        const polyParamBaseSchema = NodeExtensionHelper.getPolyAsParamBaseSchema(parameter);
        if (!isNullOrUndefined(polyBaseSchema)) {
            output.push(Dumper.tab(indent + 1) + 'cli-poly-as-param-base-schema: ' + NodeCliHelper.getCliKey(polyParamBaseSchema, Dumper.MISSING_CLI_KEY));
        }

        const polyParamOriParam = NodeExtensionHelper.getPolyAsParamOriginalParam(parameter);
        if (!isNullOrUndefined(polyBaseSchema)) {
            output.push(Dumper.tab(indent + 1) + 'cli-poly-as-param-expanded: ' + NodeCliHelper.getCliKey(polyParamOriParam, Dumper.MISSING_CLI_KEY));
        }

        if (!isNullOrUndefined(parameter.protocol?.http?.in) && parameter.protocol.http.in === 'body') {
            output.push(Dumper.tab(indent + 1) + 'bodySchema: ' + parameter.schema.language.default.name);
        }

        return output;
    }

    private static formatSchemaObject(schema: ObjectSchema, indent: number): string[] {
        const output = [Dumper.tab(indent) + '- schemaName: ' + schema.language.default.name + Dumper.formatType(schema)];

        output.push(...Dumper.formatCliProperties(schema, indent + 1));

        if (NodeHelper.HasSubClass(schema)) {
            output.push(Dumper.tab(indent + 1) + NodeHelper.DISCRIMINATOR_FLAG + ': true');
        }

        if (!isNullOrUndefined(schema.properties)) {
            output.push(Dumper.tab(indent + 1) + 'properties:');
            schema.properties?.forEach((prop) => {
                output.push(...Dumper.formatProperty(prop, indent + 2));
            });
        }

        return output;
    }

    private static formatProperty(property: Property, indent: number): string[] {
        const output = [Dumper.tab(indent) + '- propertyName: ' + property.language.default.name + Dumper.formatType(property)];

        output.push(...Dumper.formatCliProperties(property, indent + 1));

        const flattenValue = NodeExtensionHelper.getFlattenedValue(property);
        if (!isNullOrUndefined(flattenValue)) {
            output.push(Dumper.tab(indent + 1) + NodeExtensionHelper.FLATTEN_FLAG + ': ' + flattenValue);
        }

        if (property['readOnly'] === true) {
            output.push(Dumper.tab(indent + 1) + 'readOnly: true');
        }

        return output;
    }

    private static formatChoice(choice: ChoiceSchema<StringSchema> | SealedChoiceSchema<StringSchema>, indent: number): string[] {
        const output = [Dumper.tab(indent) + '- choiceName: ' + choice.language.default.name + Dumper.formatType(choice)];

        output.push(...Dumper.formatCliProperties(choice, indent + 1));

        if (!isNullOrUndefined(choice.choices)) {
            output.push(Dumper.tab(indent + 1) + 'choiceValues:');
            choice.choices.forEach((val) => {
                output.push(...Dumper.formatChoiceValue(val, indent + 2));
            });
        }

        return output;
    }

    private static formatChoiceValue(choiceValue: ChoiceValue, indent: number): string[] {
        const output = [Dumper.tab(indent) + '- choiceValue: ' + choiceValue.language.default.name + Dumper.formatType(choiceValue)];

        output.push(...Dumper.formatCliProperties(choiceValue, indent + 1));

        return output;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static formatCliProperties(o: any, indent: number): string[] {
        if (isNullOrUndefined(o.language.cli)) {
            return [];
        }
        const output = [Dumper.tab(indent) + 'cli:'];
        Object.getOwnPropertyNames(o.language.cli)
            .filter(key => o.language.cli[key] !== o.language.default[key])
            .forEach((prop) => {
                output.push(Dumper.tab(indent + 1) + prop + ': ' + Dumper.formatValue(o.language.cli[prop], indent + 2));
            });
        return output;
    }

    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static formatValue(o: any, indent: number): string {
        if (isString(o))
            return o;
        else if (isArray(o))
            return o.map(v => Dumper.NEW_LINE + Dumper.tab(indent) + "- " + Dumper.formatValue(v, indent + 2/* one more indent for array*/)).join('');
        else if (Helper.isObjectSchema(o))
            return `<${(o as ObjectSchema).language.default.name}>`;
        else if (Helper.isOperation(o))
            return `<${(o as Operation).language.default.name}>`;
        else if (isObject(o))
            return keys(o).select(k => Dumper.NEW_LINE + Dumper.tab(indent) + `${k}: ${Dumper.formatValue(o[k], indent + 1)}`).join('');
        else
            return isUndefined(o) ? '{undefined}' : isNull(o) ? '{null}' : o.toString();
    }
        
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static formatType(o: any) {
        return `${isNullOrUndefined(o.schema) ? '' : ('(' + o.schema.language.default.name + '^' + o.schema.type + ')')}`;
    }

    private static formateOutput(output: string[]): string {
        return output.filter((line) => !isNullOrUndefined(line)).join(Dumper.NEW_LINE) + Dumper.NEW_LINE;
        
    }

    private static tab(extra = 0): string {
        return Dumper.INDENT.repeat(Dumper.INITIAL_INDENT + extra);
    }

}
