import { Host, Session, startSession } from "@azure-tools/autorest-extension-base";
import { CodeModel, Request, codeModelSchema, Metadata, ObjectSchema, isObjectSchema, Property, Extensions, Scheme, ComplexSchema, Operation, OperationGroup, Parameter, VirtualParameter, ImplementationLocation } from "@azure-tools/codemodel";
import { isNullOrUndefined, isArray } from "util";
import { Helper } from "../helper";
import { CliConst, M4Node } from "../schema";
import { Dumper } from "../dumper";
import { Dictionary, values } from '@azure-tools/linq';
import { NodeHelper } from "../nodeHelper";
import { FlattenHelper } from "../flattenHelper";


export class PolyModifier {

    private readonly POLY_AS_RESOURCE = "cli-poly-as-resource";
    private readonly POLY_AS_RESOURCE_PARAMETER = "cli-poly-as-resource-parameter";
    private readonly POLY_AS_RESOURCE_DISCRIMINATOR = "cli-poly-as-resource-discriminator";

    constructor(protected session: Session<CodeModel>) {
    }

    public process() {
        this.processPolyAsResource();
    }

    private isPolyAsResource(group: OperationGroup, op: Operation, param: Parameter) {
        return (NodeHelper.isPolyAsResource(param));
    }

    private buildSubclassOperationName(op: Operation, subClassName: string) {
        return `${op.language.default.name}_${subClassName}`;
    }

    /**
     * a simple object clone by using Json serialize and parse
     * @param obj
     */
    private cloneObject<T>(obj: T) : T {
        return JSON.parse(JSON.stringify(obj)) as T;
    }

    private cloneObjectTopLevel(obj: any) {
        let r = {};
        for (let key in obj) {
            r[key] = obj[key];
        }
        return r;
    }

    private cloneOperationForSubclass(op: Operation, newOpName: string, baseSchema: ObjectSchema, subSchema: ObjectSchema) {

        let polyParam: Parameter = null;

        let cloneParam = (p: Parameter): Parameter => {

            const vp = new Parameter(p.language.default.name, p.language.default.description, p.schema === baseSchema ? subSchema : p.schema, {
                implementation: p.implementation,
                extensions: {},
                language: this.cloneObject(p.language),
                protocol: p.protocol,
            });

            //const vp = new VirtualParameter(p.language.default.name, p.language.default.description, p.schema === baseSchema ? subSchema : p.schema, {
            //    implementation: p.implementation,
            //    extensions: {},
            //});
            //delete (<any>vp).serializedName;
            //delete (<any>vp).readOnly;
            //delete (<any>vp).isDiscriminator;
            //delete (<any>vp).flattenedNames;

            //vp.language = this.cloneObject(p.language);

            // set other property as ref
            for (let key in p)
                if (isNullOrUndefined(vp[key]))
                    vp[key] = p[key];

            if (p.schema === baseSchema) {
                if (polyParam !== null)
                    throw Error(`Mulitple poly as resource Parameter found: 1) ${polyParam.language.default.name}, 2) ${p.language.default.name}`);
                else {
                    polyParam = p;
                    vp.extensions[this.POLY_AS_RESOURCE_DISCRIMINATOR] = baseSchema.properties.find(p => p.isDiscriminator).language['cli'].cliKey;
                }
            }
            
            return vp;
        };

        let cloneRequest = (req: Request): Request => {
            let rr = new Request(req);
            rr.extensions = this.cloneObjectTopLevel(rr.extensions);
            rr.language = this.cloneObject(rr.language);
            rr.parameters = rr.parameters.map(p => cloneParam(p));
            rr.updateSignatureParameters();
            return rr;
        }

        let op2 = new Operation(
            newOpName,
            op.language.default['description'],
            op
        );
        op2.language = this.cloneObject(op2.language);
        op2.language.default.name = newOpName;
        op2.language['cli'].name = newOpName;
        op2.extensions = this.cloneObjectTopLevel(op2.extensions);
        op2.parameters = op2.parameters.map(p => cloneParam(p));
        op2.requests = op2.requests.map(r => cloneRequest(r));
        op2.extensions[this.POLY_AS_RESOURCE_PARAMETER] = polyParam.language.default.name;
        // Do we need to deep copy response? seems no need

        return op2;
    }

    private cloneAndExpandOperation(op: Operation, subClassSchema: ObjectSchema) {
        let r = new Operation(
            NodeHelper.getCliKey(op) + "#" + subClassSchema.discriminatorValue,
            NodeHelper.getCliDescription(op),
            op
        );
        r.requests[0].signatureParameters
    }

    public processPolyAsResource() {

        this.session.model.operationGroups.forEach(g => {
            if (g.operations.findIndex(op => op.requests.length > 1) >= 0)
                throw Error("Multiple requests in one operation found! not supported yet");

            // we need to modify the operations arry, so get a copy of it first
            let operations = g.operations.filter(op => op.requests?.length == 1);

            operations.forEach(op => {

                let request = op.requests[0];
                if (isNullOrUndefined(request.parameters))
                    return;
                let allPolyParam = request.parameters.filter(p =>
                    p.schema instanceof ObjectSchema && (p.schema as ObjectSchema).discriminator && this.isPolyAsResource(g, op, p));
                if (allPolyParam.length == 0)
                    return;
                if (allPolyParam.length > 1) {
                    Helper.logError('multiple polymorphism parameter as resource found, take the first one by default: ' + allPolyParam.map(p => p.language['cli']));
                    return;
                }

                let polyParam = allPolyParam[0];
                let baseSchema = polyParam.schema as ObjectSchema;
                let allSubClass = baseSchema.discriminator.all;

                for (let key in allSubClass) {
                    let subClass = allSubClass[key];
                    if (!(subClass instanceof ObjectSchema)) {
                        Helper.logWarning("subclass is not ObjectSchema: " + subClass.language.default.name);
                        continue;
                    }
                    if (NodeHelper.HasSubClass(subClass)) {
                        Helper.logWarning("skip subclass which also has subclass: " + subClass.language.default.name);
                        continue;
                    }

                    let op2: Operation = this.cloneOperationForSubclass(op, this.buildSubclassOperationName(op, key), baseSchema, subClass);
                    g.addOperation(op2);

                    if (isNullOrUndefined(op2.extensions[this.POLY_AS_RESOURCE_PARAMETER]))
                        throw Error("No poly parameter found? Operation: " + op.language.default.name);

                    let polyParamName = op2.extensions[this.POLY_AS_RESOURCE_PARAMETER];
    
                    let req = op2.requests[0];
                    FlattenHelper.flattenParameter(req, req.parameters.find(p => p.language.default.name === polyParamName), `${subClass.discriminatorValue}_`);
                }
            });
        });
    }
}

export async function processRequest(host: Host) {

    const session = await Helper.init(host);

    Helper.dumper.dumpCodeModel('poly-as-resource-pre');

    let rd = new PolyModifier(session);
    rd.process();

    Helper.dumper.dumpCodeModel('poly-as-resource-post');

    Helper.outputToModelerfour();
    await Helper.dumper.persistAsync();
}