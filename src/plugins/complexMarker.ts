import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme, ComplexSchema, Operation, OperationGroup, Parameter, VirtualParameter, ImplementationLocation, ArraySchema, DictionarySchema, AnySchema, ConstantSchema, getAllProperties } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray, isNull } from "util";
import { Helper } from "../helper";
import { CliConst, M4Node, CliCommonSchema } from "../schema";
import { Dumper } from "../dumper";
import { values } from '@azure-tools/linq';
import { NodeHelper, NodeCliHelper } from "../nodeHelper";
import { FlattenHelper } from "../flattenHelper";

class ComplexMarker {
    constructor(private session: Session<CodeModel>) {
    }

    private calculateDict(dict: DictionarySchema) {
        let complexity = NodeCliHelper.getComplexity(dict);
        if (!isNullOrUndefined(complexity)) {
            if (complexity === CliCommonSchema.CodeModel.Complexity.unknown) {
                // we have been here before, a circle found
                NodeCliHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_complex)
                return CliCommonSchema.CodeModel.Complexity.dictionary_complex;
            }
            else {
                return complexity;
            }
        }
        NodeCliHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.unknown);

        if (dict.elementType instanceof ObjectSchema ||
            dict.elementType instanceof ArraySchema ||
            dict.elementType instanceof DictionarySchema ||
            dict.elementType instanceof AnySchema) {
                NodeCliHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_complex);
                return CliCommonSchema.CodeModel.Complexity.dictionary_complex;
        }
        NodeCliHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_simple);
        return CliCommonSchema.CodeModel.Complexity.dictionary_simple;
    }

    private calculateArray(arr: ArraySchema) {
        let complexity = NodeCliHelper.getComplexity(arr);
        if (!isNullOrUndefined(complexity)) {
            if (complexity === CliCommonSchema.CodeModel.Complexity.unknown) {
                // we have been here before, a circle found
                NodeCliHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.array_complex)
                return CliCommonSchema.CodeModel.Complexity.array_complex;
            }
            else {
                return complexity;
            }
        }
        NodeCliHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.unknown);

        if (arr.elementType instanceof ObjectSchema ||
            arr.elementType instanceof ArraySchema ||
            arr.elementType instanceof DictionarySchema ||
            arr.elementType instanceof AnySchema) {
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
                NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex)
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
            for (let prop of obj.properties) {
                if (isObjectSchema(prop.schema)) {
                    this.calculateObject(prop.schema);
                    return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                }
                else if (prop.schema instanceof ArraySchema) {
                    let c = this.calculateArray(prop.schema);
                    if (c == CliCommonSchema.CodeModel.Complexity.array_complex) {
                        return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                    }
                }
                else if (prop.schema instanceof DictionarySchema) {
                    this.calculateDict(prop.schema);
                    return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                }
                else if (prop.schema instanceof AnySchema) {
                    return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                }
            }
        }
        return NodeCliHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_simple);
    }

    private setSimplifyIndicator(schema: ObjectSchema) {
        let indicator: CliCommonSchema.CodeModel.SimplifyIndicator = {
            simplifiable: true,
            propertyCountIfSimplify: 0,
            propertyCountIfSimplifyWithoutSimpleObject: 0,
        };
        let impossible: CliCommonSchema.CodeModel.SimplifyIndicator = {
            simplifiable: false,
            propertyCountIfSimplify: 10000,
            propertyCountIfSimplifyWithoutSimpleObject: 10000,
        };
        let flag: CliCommonSchema.CodeModel.SimplifyIndicator = {
            simplifiable: false,
            propertyCountIfSimplify: -1,
            propertyCountIfSimplifyWithoutSimpleObject: -1,
            
        };

        let pre = NodeCliHelper.getSimplifyIndicator(schema);
        if (!isNullOrUndefined(pre) && pre.propertyCountIfSimplify === -1) {
            // circle found
            return NodeCliHelper.setSimplifyIndicator(schema, impossible);
        }

        NodeCliHelper.setSimplifyIndicator(schema, flag);

        for (let p of getAllProperties(schema)) {
            if (p.readOnly)
                continue;
            if (p.schema instanceof ConstantSchema)
                continue;
            if (p.schema instanceof AnySchema ||
                p.schema instanceof ArraySchema ||
                p.schema instanceof DictionarySchema) {
                return NodeCliHelper.setSimplifyIndicator(schema, impossible);
            }
            else if (p.schema instanceof ObjectSchema) {
                if (NodeHelper.HasSubClass(p.schema)) {
                    return NodeCliHelper.setSimplifyIndicator(schema, impossible);
                }
                let pi = this.setSimplifyIndicator(p.schema);
                if (pi.simplifiable === true) {
                    if (NodeCliHelper.getComplexity(p.schema) === CliCommonSchema.CodeModel.Complexity.object_simple)
                        indicator.propertyCountIfSimplifyWithoutSimpleObject++;
                    else
                        indicator.propertyCountIfSimplifyWithoutSimpleObject += (pi.propertyCountIfSimplifyWithoutSimpleObject)
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

    public setInCircle(schema: ObjectSchema | DictionarySchema | ArraySchema, stack: (ObjectSchema | DictionarySchema | ArraySchema)[], tag: string) {

        let flag = NodeCliHelper.getMark(schema);
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

            if (schema instanceof ArraySchema || schema instanceof DictionarySchema) {
                if (schema.elementType instanceof ObjectSchema ||
                    schema.elementType instanceof DictionarySchema ||
                    schema.elementType instanceof ArraySchema) {
                    stack.push(schema);
                    this.setInCircle(schema.elementType, stack, tag);
                    stack.splice(stack.length - 1, 1);
                }
            }
            else if (schema instanceof ObjectSchema) {
                for (let prop of getAllProperties(schema)) {
                    if (prop.schema instanceof ObjectSchema ||
                        prop.schema instanceof DictionarySchema ||
                        prop.schema instanceof ArraySchema) {
                        stack.push(schema);
                        this.setInCircle(prop.schema, stack, tag);
                        stack.splice(stack.length - 1, 1);
                    }
                }
            }
        }
        NodeCliHelper.setMark(schema, "checked");
    }

    public process() {

        this.session.model.schemas.objects.forEach(obj => {
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
        })

        let tag = 1;
        this.session.model.schemas.objects.forEach(obj => {
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
        })

        this.session.model.schemas.objects.forEach(obj => {
            this.setSimplifyIndicator(obj);
            tag++;
        });

        this.session.model.schemas.objects.forEach(obj => {
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
        })
    }
}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);

    Helper.dumper.dumpCodeModel('complex-marker-pre');

    let cm = new ComplexMarker(session);
    cm.process();

    Helper.dumper.dumpCodeModel('complex-marker-post');

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}