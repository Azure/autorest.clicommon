import { assert } from 'chai';
import 'mocha';
import { ActionSet, ActionFlatten } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";
import { CliConst } from '../dist/src/schema';

describe('Test Directive - Action - flatten', function () {
    var descriptor = {
        parent: null,
        targetIndex: -1,
        target: null,
    };

    it('Action flatten - normal', () => {
        let action = new ActionFlatten(false);

        descriptor.target = new Metadata();
        let o = descriptor.target;
        action.process(descriptor);
        assert.equal(o.extensions[CliConst.FLATTEN_FLAG], false);


        action = new ActionFlatten(true);

        descriptor.target = new Metadata();
        o = descriptor.target;
        action.process(descriptor);
        assert.equal(o.extensions[CliConst.FLATTEN_FLAG], true);
    });
});