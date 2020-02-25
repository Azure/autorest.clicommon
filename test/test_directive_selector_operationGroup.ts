import { expect, assert } from 'chai';
import 'mocha';
import { NodeSelector } from '../src/plugins/modifier/cliDirectiveSelector';
import "@azure-tools/codemodel";
import { ChoiceSchema, ChoiceValue, CodeModel, ObjectSchema, Operation, OperationGroup, Parameter, Property, SealedChoiceSchema } from "@azure-tools/codemodel";


describe('Test Directive - Selector - operationGroup', function () {
    it('select operationGroup - normal', () => {

        let selector = new NodeSelector({
            select: 'operationGroup',
            where: {
                operationGroup: 'og1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            target: new OperationGroup('fake'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            target: new OperationGroup('fake'),
        }));
    });

    it('select operationGroup - implicit select', () => {
        let selector = new NodeSelector({
            where: {
                operationGroup: 'og1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            target: new OperationGroup('fake'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            target: new OperationGroup('fake'),
        }));
    });

    it('select operationGroup - alias', () => {
        let alias = ['resource', 'group'];

        alias.forEach((v) => {
            let s = {
                where: {}
            };
            s.where[v] = 'og1';
            let selector = new NodeSelector(s);

            assert.isTrue(selector.match({
                operationGroupName: 'og1',
                target: new OperationGroup('fake'),
            }));

            assert.isNotTrue(selector.match({
                operationGroupName: 'og1+',
                target: new OperationGroup('fake'),
            }));
        });
    });


    it('select operationGroup - regex', () => {
        let selector = new NodeSelector({
            where: {
                operationGroup: '^og1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1og2',
            target: new OperationGroup('fake'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og0og1og2',
            target: new OperationGroup('fake'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og0og1',
            target: new OperationGroup('fake'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og',
            target: new OperationGroup('fake'),
        }));
    });
});