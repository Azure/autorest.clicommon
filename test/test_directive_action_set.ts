import { assert } from 'chai';
import 'mocha';
import { ActionSet } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";

describe('Test Directive - Action - set', function () {
    var descriptor = {
        parent: null,
        targetIndex: -1,
        target: null,
    };

    it('Action set - normal', () => {
        let ori = {
            value1: 'abc',
            value2: true,
            value3: [1, 2, 3, 4],
        };
        let action = new ActionSet(ori);

        descriptor.target = new Metadata();
        let o = descriptor.target;
        action.process(descriptor);
        assert.deepEqual(o.language["cli"], ori);
    });
});