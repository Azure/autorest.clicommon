import { assert } from 'chai';
import 'mocha';
import { ActionSet, ActionFlatten, ActionJson } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";
import { NodeHelper, NodeExtensionHelper, NodeCliHelper } from '../src/nodeHelper';

describe('Test Directive - Action - json', function () {
    var descriptor = {
        parent: null,
        targetIndex: -1,
        target: null,
    };

    it('Action json - normal', () => {
        let action = new ActionJson(false);

        descriptor.target = new Metadata();
        let o = descriptor.target;
        action.process(descriptor);
        assert.isUndefined(o.extensions);
        assert.equal(o.language.cli.json, false)

        action = new ActionJson(true);

        descriptor.target = new Metadata();
        o = descriptor.target;
        action.process(descriptor);
        assert.equal(NodeCliHelper.isCliFlatten(o), false);
        assert.equal(o.language.cli.json, true)

    });
});