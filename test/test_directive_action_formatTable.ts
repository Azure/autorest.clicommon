import { assert } from 'chai';
import 'mocha';
import { ActionSet, ActionFormatTable } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";

describe('Test Directive - Action - formatTable', function () {
    var descriptor = {
        parent: null,
        targetIndex: -1,
        target: null,
    };

    it('Action formatTable - normal', () => {
        let ori = {
            formatTable: {
                properties: ['a', 'b', 'c'],
            },
        };
        let action = new ActionFormatTable(ori.formatTable);

        descriptor.target = new Metadata();
        action.process(descriptor);
        assert.deepEqual(descriptor.target.language["cli"], ori);
    });
});