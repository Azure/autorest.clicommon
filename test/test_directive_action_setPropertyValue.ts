import { assert } from 'chai';
import 'mocha';
import { ActionSet, ActionSetProperty } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";

describe('Test Directive - Action - setProperty', function () {
    it('directive setProperty - string', () => {
        let baseline = {
            key: "someValue",
        };
        let action = new ActionSetProperty("someValue", "key", () => true);

        let o = new Metadata();
        action.process(o);
        assert.deepEqual(o.language["cli"], baseline);
    });

    it('directive setProperty - bool', () => {
        let baseline = {
            key: true,
        };
        let action = new ActionSetProperty(true, "key", () => false);

        let o = new Metadata();
        action.process(o);
        assert.deepEqual(o.language["cli"], baseline);
    });

    it('directive setProperty - undefined', () => {
        let baseline = {
            key: "someValue",
        };
        let action = new ActionSetProperty(undefined, "key", () => "someValue");

        let o = new Metadata();
        action.process(o);
        assert.deepEqual(o.language["cli"], baseline);
    });

    it('directive setProperty - null', () => {
        let baseline = {
            key: "someValue",
        };
        let action = new ActionSetProperty(null, "key", () => "someValue");

        let o = new Metadata();
        action.process(o);
        assert.deepEqual(o.language["cli"], baseline);
    });

    it('directive setProperty - array', () => {
        let baseline = {
            key: ['a','b','c'],
        };
        let action = new ActionSetProperty(['a', 'b', 'c'], "key", () => true);

        let o = new Metadata();
        action.process(o);
        assert.deepEqual(o.language["cli"], baseline);
    });

});