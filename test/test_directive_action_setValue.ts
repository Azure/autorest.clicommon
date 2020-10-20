import { assert } from 'chai';
import 'mocha';
import { ActionSet, ActionSetProperty, ActionSetValue } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";

describe('Test Directive - Action - setValue', function () {
    var descriptor = {
        parent: null,
        targetIndex: -1,
        target: null,
        exampleName: 'Example1'
    };

    it('directive setProperty - string', () => {
        let baseline = "someValue";
        let action = new ActionSetValue(baseline, "a.b.c");

        descriptor.target = new Metadata();
        action.process(descriptor);
        assert.deepEqual(descriptor.target.a.b.c, baseline);
    });

    it('directive setProperty - number', () => {
        let baseline = 123;
        let action = new ActionSetValue(baseline, "a.b.c");

        descriptor.target = new Metadata();
        action.process(descriptor);
        assert.deepEqual(descriptor.target.a.b.c, baseline);
    });

    it('directive setProperty - object', () => {
        let baseline = {
            key: "someValue",
        };
        let action = new ActionSetValue(baseline, "a.b.c");

        descriptor.target = new Metadata();
        action.process(descriptor);
        assert.deepEqual(descriptor.target.a.b.c, baseline);
    });

});