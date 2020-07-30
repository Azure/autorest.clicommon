import { Host, Session } from "@azure-tools/autorest-extension-base";
import { CodeModel, ArraySchema, DictionarySchema, getAllProperties, ObjectSchema } from "@azure-tools/codemodel";
import { isNullOrUndefined } from "util";
import { Helper } from "../helper";
import { CliCommonSchema } from "../schema";
import { NodeHelper, NodeCliHelper } from "../nodeHelper";

class ComplexMarker {
    constructor(private session: Session<CodeModel>) {
    }

    private calculateDict(dict: DictionarySchema) {
        const complexity = NodeCliHelper.getComplexity(dict);
        if (!isNullOrUndefined(complexity)) {
            if (complexity === CliCommonSchema.CodeModel.Complexity.unknown) {
                // we have been here before, a circle found
                NodeCliHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_complex);
                return CliCommonSchema.CodeModel.Complexity.dictionary_complex;
            } else {
                return complexity;
            }
        }
        NodeCliHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.unknown);

        if (Helper.isObjectSchema(dict.elementType) ||
                Helper.isArraySchema(dict) ||
                Helper.isDictionarySchema(dict.elementType) ||
                Helper.isAnySchema(dict.elementType)) {
            NodeCliHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_complex);
            return CliCommonSchema.CodeModel.Complexity.dictionary_complex;
        }
        NodeCliHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_simple);
        return CliCommonSchema.CodeModel.Complexity.dictionary_simple;
    }

    private calculateArray(arr: ArraySchema) {
        const complexity = NodeCliHelper.getComplexity(arr);
        if (!isNullOrUndefined(complexity)) {
            if (complexity === CliCommonSchema.CodeModel.Complexity.unknown) {
                // we have been here before, a circle found
                NodeCliHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.array_complex);
                return CliCommonSchema.CodeModel.Complexity.array_complex;
            }
            else {
                return complexity;
            }
        }
        NodeCliHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.unknown);

        if (Helper.isObjectSchema(arr.elementType) ||
                Helper.isArraySchema(arr.elementType) ||
                Helper.isDictionarySchema(arr.elementType) ||
                Helper.isAnySchema(arr.elementType)) {
            NodeCliHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.array_complex);
            return CliCommonSchema.CodeModel.Complexity.array_complex;
        }
        NodeCliHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.array_simple);
        return CliCommonSchema.CodeModel.Complexity.array_simple;
    }

    private calculateObject(obj: ObjectSchema) {

        let complexity = NodeCliHelper.getComplexity(obj);
        if (!isNullOrUndefined(complexity)) {
            if (complexity === CliCommonSchema.CodeModel.Complexity.unknown) {
                // we have been here before, a circle found
                NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                return CliCommonSchema.CodeModel.Complexity.object_complex;
            }
            else {
                return complexity;
            }
        }

        if (NodeHelper.HasSubClass(obj))
            return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);

        NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.unknown);

        complexity = CliCommonSchema.CodeModel.Complexity.object_simple;
        if (obj.properties && obj.properties.length > 0) {
            for (const prop of obj.properties) {
                if (Helper.isObjectSchema(prop.schema)) {
                    this.calculateObject(prop.schema as ObjectSchema);
                    return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                }
                else if (Helper.isArraySchema(prop.schema)) {
                    const c = this.calculateArray(prop.schema as ArraySchema);
                    if (c === CliCommonSchema.CodeModel.Complexity.array_complex) {
                        return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                    }
                }
                else if (Helper.isDictionarySchema(prop.schema)) {
                    this.calculateDict(prop.schema as DictionarySchema);
                    return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                }
                else if (Helper.isAnySchema(prop.schema)) {
                    return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                }
            }
        }
        return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_simple);
    }

    private setSimplifyIndicator(schema: ObjectSchema) {
        const indicator: CliCommonSchema.CodeModel.SimplifyIndicator = {
            simplifiable: true,
            propertyCountIfSimplify: 0,
            propertyCountIfSimplifyWithoutSimpleObject: 0,
        };
        const impossible: CliCommonSchema.CodeModel.SimplifyIndicator = {
            simplifiable: false,
            propertyCountIfSimplify: 10000,
            propertyCountIfSimplifyWithoutSimpleObject: 10000,
        };
        const flag: CliCommonSchema.CodeModel.SimplifyIndicator = {
            simplifiable: false,
            propertyCountIfSimplify: -1,
            propertyCountIfSimplifyWithoutSimpleObject: -1,
            
        };

        const pre = NodeCliHelper.getSimplifyIndicator(schema);
        if (!isNullOrUndefined(pre) && pre.propertyCountIfSimplify === -1) {
            // circle found
            return NodeCliHelper.setSimplifyIndicator(schema, impossible);
        }

        NodeCliHelper.setSimplifyIndicator(schema, flag);

        for (const p of getAllProperties(schema)) {
            if (p.readOnly)
                continue;
            if (Helper.isConstantSchema(p.schema))
                continue;
            if (Helper.isAnySchema(p.schema) ||
                Helper.isArraySchema(p.schema) ||
                Helper.isDictionarySchema(p.schema)) {
                return NodeCliHelper.setSimplifyIndicator(schema, impossible);
            }
            else if (Helper.isObjectSchema(p.schema)) {
                if (NodeHelper.HasSubClass(p.schema as ObjectSchema)) {
                    return NodeCliHelper.setSimplifyIndicator(schema, impossible);
                }
                const pi = this.setSimplifyIndicator(p.schema as ObjectSchema);
                if (pi.simplifiable === true) {
                    if (NodeCliHelper.getComplexity(p.schema) === CliCommonSchema.CodeModel.Complexity.object_simple)
                        indicator.propertyCountIfSimplifyWithoutSimpleObject++;
                    else
                        indicator.propertyCountIfSimplifyWithoutSimpleObject += (pi.propertyCountIfSimplifyWithoutSimpleObject);
                    indicator.propertyCountIfSimplify += (pi.propertyCountIfSimplify);
                }
                else {
                    return NodeCliHelper.setSimplifyIndicator(schema, impossible);
                }
            }
            else {
                indicator.propertyCountIfSimplifyWithoutSimpleObject++;
                indicator.propertyCountIfSimplify++;
            }
        }

        return NodeCliHelper.setSimplifyIndicator(schema, indicator);
    }

    public setInCircle(schema: ObjectSchema | DictionarySchema | ArraySchema, stack: (ObjectSchema | DictionarySchema | ArraySchema)[], tag: string): void {

        const flag = NodeCliHelper.getMark(schema);
        if (!isNullOrUndefined(flag)) {
            if (flag === tag) {
                // we find a circle
                let msg = "Circle Found: " + NodeHelper.getDefaultNameWithType(schema);
                for (let i = stack.length - 1; i >= 0; i--) {
                    msg += '->' + NodeHelper.getDefaultNameWithType(stack[i]);
                    NodeCliHelper.setInCircle(stack[i], true);
                    if (stack[i] === schema)
                        break;
                }
                Helper.logDebug(msg);
            }
            else {
                // we have been here before when iterating other schema
            }
        }
        else {
            NodeCliHelper.setMark(schema, tag);

            if (Helper.isArraySchema(schema) || Helper.isDictionarySchema(schema)) {
                if (Helper.isObjectSchema((<ArraySchema | DictionarySchema>schema).elementType) ||
                    Helper.isDictionarySchema((<ArraySchema | DictionarySchema>schema).elementType) ||
                    Helper.isArraySchema((<ArraySchema | DictionarySchema>schema).elementType)) {
                    stack.push(schema);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this.setInCircle((<ArraySchema<any> | DictionarySchema<any>>schema).elementType, stack, tag);
                    stack.splice(stack.length - 1, 1);
                }
            }
            else if (Helper.isObjectSchema(schema)) {
                for (const prop of getAllProperties(schema as ObjectSchema)) {
                    if (Helper.isObjectSchema(prop.schema) ||
                        Helper.isDictionarySchema(prop.schema) ||
                        Helper.isArraySchema(prop.schema)) {
                        stack.push(schema);
                        this.setInCircle(prop.schema as ObjectSchema, stack, tag);
                        stack.splice(stack.length - 1, 1);
                    }
                }
            }
        }
        NodeCliHelper.setMark(schema, "checked");
    }

    public process(): void {

        this.session.model.schemas.objects?.forEach(obj => {
            NodeCliHelper.clearComplex(obj);
            NodeCliHelper.clearSimplifyIndicator(obj);
            NodeCliHelper.clearMark(obj);
        });

        this.session.model.schemas.dictionaries?.forEach(dict => {
            NodeCliHelper.clearComplex(dict);
            NodeCliHelper.clearMark(dict);
        });

        this.session.model.schemas.arrays?.forEach(arr => {
            NodeCliHelper.clearComplex(arr);
            NodeCliHelper.clearMark(arr);
        });

        let tag = 1;
        this.session.model.schemas.objects?.forEach(obj => {
            this.calculateObject(obj);
            tag++;
        });
        this.session.model.schemas.dictionaries?.forEach(dict => {
            this.calculateDict(dict);
            tag++;
        });
        this.session.model.schemas.arrays?.forEach(arr => {
            this.calculateArray(arr);
            tag++;
        });

        this.session.model.schemas.objects?.forEach(obj => {
            this.setSimplifyIndicator(obj);
            tag++;
        });

        this.session.model.schemas.objects?.forEach(obj => {
            this.setInCircle(obj, [], tag.toString());
            tag++;
        });
        this.session.model.schemas.dictionaries?.forEach(dict => {
            this.setInCircle(dict, [], tag.toString());
            tag++;
        });
        this.session.model.schemas.arrays?.forEach(arr => {
            this.setInCircle(arr, [], tag.toString());
            tag++;
        });
    }
}

export async function processRequest(host: Host): Promise<void> {

    const session = await Helper.init(host);

    Helper.dumper.dumpCodeModel('complex-marker-pre');

    const cm = new ComplexMarker(session);
    cm.process();

    Helper.dumper.dumpCodeModel('complex-marker-post');

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}