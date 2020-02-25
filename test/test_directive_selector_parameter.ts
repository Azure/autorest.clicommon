import { Parameter } from "@azure-tools/codemodel";
import { expect, assert } from 'chai';
import 'mocha';
import { NodeSelector } from '../src/plugins/modifier/cliDirectiveSelector';
import "@azure-tools/codemodel";


describe('Test Directive - Selector - parameter', function () {
    it('select parameter - normal', () => {

        let selector = new NodeSelector({
            select: 'parameter',
            where: {
                operationGroup: 'og1',
                operation: 'o1',
                parameter: 'p1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1+',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1+',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1+',
            parameterName: 'p1+',
            target: new Parameter('fake', 'fake description', null),
        }));
    });

    it('select parameter - normal without operationGroup', () => {

        let selector = new NodeSelector({
            select: 'parameter',
            where: {
                operation: 'o1',
                parameter: 'p1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1+',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1+',
            target: new Parameter('fake', 'fake description', null),
        }));
    });

    it('select parameter - normal without operation', () => {

        let selector = new NodeSelector({
            select: 'parameter',
            where: {
                operationGroup: 'og1',
                parameter: 'p1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1+',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1+',
            target: new Parameter('fake', 'fake description', null),
        }));
    });

    it('select parameter - implicit select', () => {

        let selector = new NodeSelector({
            where: {
                parameter: 'p1',
            }
        });

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1+',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1+',
            target: new Parameter('fake', 'fake description', null),
        }));
    });

    it('select parameter - alias', () => {

        let selector = new NodeSelector(new Object({
            where: {
                group: 'og1',
                op: 'o1',
                param: 'p1'
            }
        }));

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1+',
            operationName: 'o1',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1+',
            parameterName: 'p1',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1+',
            target: new Parameter('fake', 'fake description', null),
        }));
    });

    it('select parameter - regex', () => {

        let selector = new NodeSelector(new Object({
            where: {
                group: 'og1',
                op: 'o1',
                param: 'p1p2$'
            }
        }));

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p0p1p2',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1p2p3',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1p2',
            target: new Parameter('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            operationGroupName: 'og1',
            operationName: 'o1',
            parameterName: 'p1p3p2',
            target: new Parameter('fake', 'fake description', null),
        }));
    });
});