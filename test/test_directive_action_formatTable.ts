import { assert } from 'chai';
import 'mocha';
import { ActionSet, ActionFormatTable } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";

describe('Test Directive - Action - formatTable', function () {
    it('Action formatTable - normal', () => {
        let ori = {
            formatTable: {
                properties: ['a', 'b', 'c'],
            },
        };
        let action = new ActionFormatTable(ori.formatTable);

        let o = new Metadata();
        action.process(o);
        assert.deepEqual(o.language["cli"], ori);
    });
});