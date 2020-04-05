import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme, ComplexSchema, Operation, OperationGroup, Parameter, VirtualParameter, ImplementationLocation, ArraySchema, DictionarySchema, AnySchema, ConstantSchema, getAllProperties } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray, isNull } from "util";
import { Helper } from "../helper";
import { CliConst, M4Node, CliCommonSchema } from "../schema";
import { Dumper } from "../dumper";
import { values } from '@azure-tools/linq';
import { NodeHelper } from "../nodeHelper";
import { FlattenHelper } from "../flattenHelper";

class ComplexMarker {
    constructor(private session: Session<CodeModel>) {
    }

    private calculateDict(dict: DictionarySchema) {
        let complexity = NodeHelper.getComplexity(dict);
        if (!isNullOrUndefined(complexity)) {
            if (complexity === CliCommonSchema.CodeModel.Complexity.unknown) {
                // we have been here before, a circle found
                NodeHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_complex)
                return CliCommonSchema.CodeModel.Complexity.dictionary_complex;
            }
            else {
                return complexity;
            }
        }
        NodeHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.unknown);

        if (dict.elementType instanceof ObjectSchema ||
            dict.elementType instanceof ArraySchema ||
            dict.elementType instanceof DictionarySchema ||
            dict.elementType instanceof AnySchema) {
            NodeHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_complex);
            return CliCommonSchema.CodeModel.Complexity.dictionary_complex;
        }
        NodeHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_simple);
        return CliCommonSchema.CodeModel.Complexity.dictionary_simple;
    }

    private calculateArray(arr: ArraySchema) {
        let complexity = NodeHelper.getComplexity(arr);
        if (!isNullOrUndefined(complexity)) {
            if (complexity === CliCommonSchema.CodeModel.Complexity.unknown) {
                // we have been here before, a circle found
                NodeHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.array_complex)
                return CliCommonSchema.CodeModel.Complexity.array_complex;
            }
            else {
                return complexity;
            }
        }
        NodeHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.unknown);

        if (arr.elementType instanceof ObjectSchema ||
            arr.elementType instanceof ArraySchema ||
            arr.elementType instanceof DictionarySchema ||
            arr.elementType instanceof AnySchema) {
            NodeHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.array_complex);
            return CliCommonSchema.CodeModel.Complexity.array_complex;
        }
        NodeHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.array_simple);
        return CliCommonSchema.CodeModel.Complexity.array_simple;
    }

    private calculateObject(obj: ObjectSchema) {

        let complexity = NodeHelper.getComplexity(obj);
        if (!isNullOrUndefined(complexity)) {
            if (complexity === CliCommonSchema.CodeModel.Complexity.unknown) {
                // we have been here before, a circle found
                NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex)
                return CliCommonSchema.CodeModel.Complexity.object_complex;
            }
            else {
                return complexity;
            }
        }

        if (NodeHelper.HasSubClass(obj))
            return NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);

        NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.unknown);

        complexity = CliCommonSchema.CodeModel.Complexity.object_simple;
        if (obj.properties && obj.properties.length > 0) {
            for (let prop of obj.properties) {
                if (isObjectSchema(prop.schema)) {
                    this.calculateObject(prop.schema);
                    return NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                }
                else if (prop.schema instanceof ArraySchema) {
                    let c = this.calculateArray(prop.schema);
                    if (c == CliCommonSchema.CodeModel.Complexity.array_complex) {
                        return NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                    }
                }
                else if (prop.schema instanceof DictionarySchema) {
                    this.calculateDict(prop.schema);
                    return NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                }
                else if (prop.schema instanceof AnySchema) {
                    return NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                }
            }
        }
        return NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_simple);
    }

    private setSimplifyIndicator(schema: ObjectSchema) {
        let indicator: CliCommonSchema.CodeModel.SimplifyIndicator = {
            simplifiable: true,
            propertyCountIfSimplify: 0,
        };
        let impossible: CliCommonSchema.CodeModel.SimplifyIndicator = {
            simplifiable: false,
            propertyCountIfSimplify: 10000
        };
        let flag: CliCommonSchema.CodeModel.SimplifyIndicator = {
            simplifiable: false,
            propertyCountIfSimplify: -1
        };

        let pre = NodeHelper.getSimplifyIndicator(schema);
        if (!isNullOrUndefined(pre) && pre.propertyCountIfSimplify === -1) {
            // circle found
            return NodeHelper.setSimplifyIndicator(schema, impossible);
        }

        NodeHelper.setSimplifyIndicator(schema, flag);

        for (let p of getAllProperties(schema)) {
            if (p.readOnly)
                continue;
            if (p.schema instanceof ConstantSchema)
                continue;
            if (p.schema instanceof AnySchema ||
                p.schema instanceof ArraySchema ||
                p.schema instanceof DictionarySchema) {
                return NodeHelper.setSimplifyIndicator(schema, impossible);
            }
            else if (p.schema instanceof ObjectSchema) {
                if (NodeHelper.HasSubClass(p.schema)) {
                    return NodeHelper.setSimplifyIndicator(schema, impossible);
                }
                let pi = this.setSimplifyIndicator(p.schema);
                if (pi.simplifiable === true) {
                    indicator.propertyCountIfSimplify += (pi.propertyCountIfSimplify);
                }
                else {
                    return NodeHelper.setSimplifyIndicator(schema, impossible);
                }
            }
            else {
                indicator.propertyCountIfSimplify++;
            }
        }

        return NodeHelper.setSimplifyIndicator(schema, indicator);
    }

    public setInCircle(schema: ObjectSchema | DictionarySchema | ArraySchema, stack: (ObjectSchema | DictionarySchema | ArraySchema)[], tag: string) {

        let flag = NodeHelper.getMark(schema);
        if (!isNullOrUndefined(flag)) {
            if (flag === tag) {
                // we find a circle
                let msg = "Circle Found: " + NodeHelper.getDefaultNameWithType(schema);
                for (let i = stack.length - 1; i >= 0; i--) {
                    msg += '->' + NodeHelper.getDefaultNameWithType(stack[i]);
                    NodeHelper.setInCircle(stack[i], true);
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
            NodeHelper.setMark(schema, tag);

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
        NodeHelper.setMark(schema, "checked");
    }

    public process() {

        this.session.model.schemas.objects.forEach(obj => {
            NodeHelper.clearComplex(obj);
            NodeHelper.clearSimplifyIndicator(obj);
            NodeHelper.clearMark(obj);
        });

        this.session.model.schemas.dictionaries?.forEach(dict => {
            NodeHelper.clearComplex(dict);
            NodeHelper.clearMark(dict);
        });

        this.session.model.schemas.arrays?.forEach(arr => {
            NodeHelper.clearComplex(arr);
            NodeHelper.clearMark(arr);
        })

        let tag = 1;
        this.session.model.schemas.objects.forEach(obj => {
            this.calculateObject(obj);
            this.setSimplifyIndicator(obj);
            this.setInCircle(obj, [], tag.toString());
            tag++;
        });

        this.session.model.schemas.dictionaries?.forEach(dict => {
            this.calculateDict(dict);
            this.setInCircle(dict, [], tag.toString());
            tag++;
        });

        this.session.model.schemas.arrays?.forEach(arr => {
            this.calculateArray(arr);
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