import { Operation } from "@azure-tools/codemodel";
import { expect, assert } from 'chai';
import 'mocha';
import { NodeSelector } from '../src/plugins/modifier/cliDirectiveSelector';
import "@azure-tools/codemodel";


describe('Test Directive - Selector - operation', function () {
    it('select operation - normal', () => {

        let selector = new NodeSelector({
            select: 'operation',
            where: {
                operationGroup: 'og1',
                operation: 'o1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1+',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1+',
            target: new Operation('fake', 'fake description'),
        }));
    });

    it('select operation - normal without operationGroup', () => {

        let selector = new NodeSelector({
            select: 'operation',
            where: {
                operation: 'o1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1+',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1+',
            target: new Operation('fake', 'fake description'),
        }));
    });

    it('select operation - implicit select', () => {

        let selector = new NodeSelector({
            where: {
                operationGroup: 'og1',
                operation: 'o1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1+',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1+',
            target: new Operation('fake', 'fake description'),
        }));
    });

    it('select operation - alias', () => {

        let selector = new NodeSelector(new Object({
            where: {
                resource: 'og1',
                op: 'o1',
            }
        }));

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1+',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1+',
            target: new Operation('fake', 'fake description'),
        }));
    });

    it('select operation - regex', () => {

        let selector = new NodeSelector({
            where: {
                operationGroup: 'og1',
                operation: 'o.?1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'oa1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'aboa1cd',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'oab1',
            target: new Operation('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1',
            target: new Operation('fake', 'fake description'),
        }));
    });

});