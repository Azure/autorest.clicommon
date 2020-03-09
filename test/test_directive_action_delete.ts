import { assert } from 'chai';
import 'mocha';
import { ActionSet } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";
import { ActionDelete } from '../src/plugins/modifier/cliDirectiveAction';

describe('Test Directive - Action - delete', function () {
    var descriptor = {
        parent: null,
        targetIndex: -1,
        target: null,
    };

    it('Action delete - normal', () => {

        let action = new ActionDelete(true);

        let a = new Metadata();
        a.language.default.name = "a";
        let b = new Metadata();
        b.language.default.name = "b";
        let c = new Metadata();
        c.language.default.name = "c";

        descriptor.parent = [a, b, c];
        descriptor.target = descriptor.parent[1];
        descriptor.targetIndex = 1;
        let o = descriptor.target;
        action.process(descriptor);
        assert.deepEqual(descriptor.parent, [a, c]);
    });
});