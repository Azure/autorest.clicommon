import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme, ComplexSchema, Operation, OperationGroup, Parameter, VirtualParameter, ImplementationLocation, ArraySchema, DictionarySchema } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray, isNull } from "util";
import { Helper } from "../helper";
import { CliConst, M4Node, CliCommonSchema } from "../schema";
import { Dumper } from "../dumper";
import { Dictionary, values } from '@azure-tools/linq';
import { NodeHelper } from "../nodeHelper";
import { FlattenHelper } from "../flattenHelper";

class ComplexMarker {
    constructor(private session: Session<CodeModel>) {
    }

    private calculateDict(dict: DictionarySchema) {
        let complexity = NodeHelper.getComplexity(dict);
        if (!isNullOrUndefined(complexity))
            return complexity;

        if (dict.elementType instanceof ObjectSchema ||
            dict.elementType instanceof ArraySchema ||
            dict.elementType instanceof DictionarySchema) {
            NodeHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_complex);
            return CliCommonSchema.CodeModel.Complexity.dictionary_complex;
        }
        NodeHelper.setComplex(dict, CliCommonSchema.CodeModel.Complexity.dictionary_simple);
        return CliCommonSchema.CodeModel.Complexity.dictionary_simple;
    }

    private calculateArray(arr: ArraySchema) {
        let complexity = NodeHelper.getComplexity(arr);
        if (!isNullOrUndefined(complexity))
            return complexity;

        if (arr.elementType instanceof ObjectSchema ||
            arr.elementType instanceof ArraySchema ||
            arr.elementType instanceof DictionarySchema) {
            NodeHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.array_complex);
            return CliCommonSchema.CodeModel.Complexity.array_complex;
        }
        NodeHelper.setComplex(arr, CliCommonSchema.CodeModel.Complexity.array_simple);
        return CliCommonSchema.CodeModel.Complexity.array_simple;
    }

    private calculateObject(obj: ObjectSchema) {

        let complexity = NodeHelper.getComplexity(obj);
        if (!isNullOrUndefined(complexity))
            return complexity;

        complexity = CliCommonSchema.CodeModel.Complexity.object_simple;
        if (obj.properties && obj.properties.length > 0) {
            for (let prop of obj.properties) {
                if (isObjectSchema(prop.schema)) {
                    let c = this.calculateObject(prop.schema);
                    if (c == CliCommonSchema.CodeModel.Complexity.object_complex) {
                        NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                        return CliCommonSchema.CodeModel.Complexity.object_complex;
                    }
                }
                else if (prop.schema instanceof ArraySchema) {
                    let c = this.calculateArray(prop.schema);
                    if (c == CliCommonSchema.CodeModel.Complexity.array_complex) {
                        NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                        return CliCommonSchema.CodeModel.Complexity.object_complex;
                    }
                }
                else if (prop.schema instanceof DictionarySchema) {
                    this.calculateDict(prop.schema);
                    NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_complex);
                    return CliCommonSchema.CodeModel.Complexity.object_complex;
                }
            }
            NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_simple);
        }
        NodeHelper.setComplex(obj, CliCommonSchema.CodeModel.Complexity.object_simple);
        return CliCommonSchema.CodeModel.Complexity.object_simple;

    }

    public process() {

        this.session.model.schemas.objects.forEach(obj => {
            this.calculateObject(obj);
        });

        this.session.model.schemas.dictionaries.forEach(dict => {
            this.calculateDict(dict);
        });

        this.session.model.schemas.arrays.forEach(arr => {
            this.calculateArray(arr);
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