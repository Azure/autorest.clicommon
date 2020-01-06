import { CodeModel, Schema, ObjectSchema, SchemaType, Property } from '@azure-tools/codemodel';
import { Session } from '@azure-tools/autorest-extension-base';
import { values, items, length, Dictionary, refCount } from '@azure-tools/linq';

export class Namer {
  codeModel: CodeModel

  constructor(protected session: Session<CodeModel>) {
    this.codeModel = session.model;
  }

  async init() {
    // any configuration if necessary
    return this;
  }

  process() {
    // cleanup 
    for (const operationGroup of values(this.codeModel.operationGroups)) {
        operationGroup.language['cli'] = {};
        operationGroup.language['cli']['name'] = operationGroup.language.default.name;
        operationGroup.language['cli']['description'] = operationGroup.language.default.description;

        for (const operation of values (operationGroup.operations)) {
            operation.language['cli'] = {}
            operation.language['cli']['name'] = operation.language.default.name;
            operation.language['cli']['description'] = operation.language.default.description;

            for (const parameter of values (operation.request.parameters)) {
                parameter.language['cli'] = {}
                parameter.language['cli']['name'] = parameter.language.default.name;
                parameter.language['cli']['description'] = parameter.language.default.description;
            }
        }
    }
    return this.codeModel;
  }
}
