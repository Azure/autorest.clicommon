import { Operation } from "@azure-tools/codemodel";
import { assert } from 'chai';
import 'mocha';
import { NodeSelector } from '../src/plugins/modifier/cliDirectiveSelector';
import "@azure-tools/codemodel";


describe('Test Directive - Selector - apiVersion', function () {
    it('select apiVersion - normal', () => {

        let selector = new NodeSelector({
            select: 'operation',
            where: {
                operationGroup: 'og1',
                operation: 'o1',
                apiVersion: '2020-01-01',
            }
        });

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: new Operation('fake', 'fake description'),
            apiVersions: ['2020-01-01']
        }));

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: new Operation('fake', 'fake description'),
            apiVersions: ['2019-08-07', '2020-01-01']
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: new Operation('fake', 'fake description'),
            apiVersions: ['2020-01-02']
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og2',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: new Operation('fake', 'fake description'),
            apiVersions: []
        }));
    });

 
    it('select parameter - without operationGroup', () => {
        let selector = new NodeSelector({
            select: 'operation',
            where: {
                operation: 'o1',
                apiVersion: '2020-01-01',
            }
        });

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: new Operation('fake', 'fake description'),
            apiVersions: ['2020-01-01']
        }));

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: new Operation('fake', 'fake description'),
            apiVersions: ['2019-08-07', '2020-01-01']
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: new Operation('fake', 'fake description'),
            apiVersions: ['2020-01-02']
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og2',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: new Operation('fake', 'fake description'),
            apiVersions: []
        })); 
    });
});