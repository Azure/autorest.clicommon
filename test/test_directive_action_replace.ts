import { assert } from 'chai';
import 'mocha';
import { ActionSet, ActionReplace } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node } from '../src/schema';
import { Metadata } from "@azure-tools/codemodel";

describe('Test Directive - Action - replace', function () {
    it('Action replace - part', () => {
        let ori = {
            field: 'p1',
            old: 'oldValue',
            new: 'newValue',
            isRegex: false,
        };
        let action = new ActionReplace(ori);

        let baseline = { p1: 'here is the newValue' };
        let o = new Metadata();
        o.language.default['p1'] = 'here is the oldValue';
        action.process(o);
        assert.deepEqual(o.language['cli'], baseline);
    });

    it('Action replace - whole', () => {
        let ori = {
            field: 'p1',
            old: 'oldValue',
            new: 'newValue',
            isRegex: false,
        };
        let action = new ActionReplace(ori);

        let baseline = { p1: 'newValue' };
        let o = new Metadata();
        o.language.default['p1'] = 'oldValue';
        action.process(o);
        assert.deepEqual(o.language['cli'], baseline);
    });

    it('Action replace - not found', () => {
        let ori = {
            field: 'p1',
            old: 'oldValue',
            new: 'newValue',
            isRegex: false,
        };
        let action = new ActionReplace(ori);

        let baseline = { p1: 'here is the old1Value' };
        let o = new Metadata();
        o.language.default['p1'] = 'here is the old1Value';
        action.process(o);
        assert.deepEqual(o.language['cli'], baseline);
    });

    it('Action replace - regex', () => {
        let ori = {
            field: 'p1',
            old: 'old[0-9]?Value',
            new: 'newValue',
            isRegex: true,
        };
        let action = new ActionReplace(ori);

        let baseline = { p1: 'here is the newValue' };
        let o = new Metadata();
        o.language.default['p1'] = 'here is the old1Value';
        action.process(o);
        assert.deepEqual(o.language['cli'], baseline);
    });

    it('Action replace - regex not found', () => {
        let ori = {
            field: 'p1',
            old: 'old[0-9]+Value',
            new: 'newValue',
            isRegex: true,
        };
        let action = new ActionReplace(ori);

        let baseline = { p1: 'here is the oldValue' };
        let o = new Metadata();
        o.language.default['p1'] = 'here is the oldValue';
        action.process(o);
        assert.deepEqual(o.language['cli'], baseline);
    });

    it('Action replace - regex with group', () => {
        let ori = {
            field: 'p1',
            old: '(old)([0-9]?)(Value)',
            new: '$3_$1_$2',
            isRegex: true,
        };
        let action = new ActionReplace(ori);

        let baseline = { p1: 'here is the Value_old_2' };
        let o = new Metadata();
        o.language.default['p1'] = 'here is the old2Value';
        action.process(o);
        assert.deepEqual(o.language['cli'], baseline);
    });

});