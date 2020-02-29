import { assert } from 'chai';
import 'mocha';
import { ActionSet } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";

describe('Test Directive - Action - set', function () {
    it('Action set - normal', () => {
        let ori = {
            value1: 'abc',
            value2: true,
            value3: [1, 2, 3, 4],
        };
        let action = new ActionSet(ori);

        let o = new Metadata();
        action.process(o);
        assert.deepEqual(o.language["cli"], ori);
    });
});