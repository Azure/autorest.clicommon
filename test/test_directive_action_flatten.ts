import { assert } from 'chai';
import 'mocha';
import { ActionSet, ActionFlatten } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";
import { NodeHelper, NodeCliHelper, NodeExtensionHelper } from "../src/nodeHelper"

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
        assert.equal(NodeCliHelper.isCliFlatten(o), false);


        action = new ActionFlatten(true);

        descriptor.target = new Metadata();
        o = descriptor.target;
        action.process(descriptor);
        assert.equal(NodeCliHelper.isCliFlatten(o), true);
    });
});