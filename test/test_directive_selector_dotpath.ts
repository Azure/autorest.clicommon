import { Parameter, Value } from "@azure-tools/codemodel";
import { expect, assert } from 'chai';
import 'mocha';
import { NodeSelector } from '../src/plugins/modifier/cliDirectiveSelector';
import "@azure-tools/codemodel";

function mockExample(): any{
    return {
        parameters: null,
        responses: null,
    }
}

describe('Test Directive - Selector - dotPath', function () {
    it('select dotPath - normal', () => {

        let selector = new NodeSelector({
            select: 'dotPath',
            where: {
                operationGroup: 'og1',
                operation: 'o1',
                exampleName: 'Example1',
                dotPath: 'a.b.c',
            }
        });

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example2",
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og2',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o2',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));
    });

    it('select dotPath - without exampleName', () => {
        let selector = new NodeSelector({
            select: 'dotPath',
            where: {
                operationGroup: 'og1',
                operation: 'o1',
                dotPath: 'a.b.c',
            }
        });

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example2",
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og2',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o2',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));
    });

    it('select parameter - without operationGroup', () => {

        let selector = new NodeSelector({
            select: 'dotPath',
            where: {
                operation: 'o1',
                exampleName: 'Example1',
                dotPath: 'a.b.c',
            }
        });

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og2',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og2',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example2",
        }));   
    });

    it('select parameter - without operation', () => {

        let selector = new NodeSelector({
            select: 'dotPath',
            where: {
                operationGroup: 'og1',
                exampleName: 'Example1',
                dotPath: 'a.b.c',
            }
        });

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));

        assert.isTrue(selector.match({
            operationGroupCliKey: 'og1',
            operationCliKey: 'o2',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og2',
            operationCliKey: 'o1',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example2",
        }));

        assert.isNotTrue(selector.match({
            operationGroupCliKey: 'og2',
            operationCliKey: 'o2',
            parent: null,
            targetIndex: -1,
            target: mockExample() ,
            exampleName: "Example1",
        }));  
    });
});