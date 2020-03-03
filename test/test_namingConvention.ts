import { assert } from 'chai';
import 'mocha';
import { ActionSet, ActionFormatTable } from '../src/plugins/modifier/cliDirectiveAction';
import { M4Node, CliConst, CliCommonSchema } from '../src/schema';
import { Metadata, OperationGroup, Operation, Parameter, ObjectSchema, Property, ChoiceSchema, ChoiceValue } from "@azure-tools/codemodel";
import { Helper } from '../src/helper';

describe('Test NamingConvention', function () {
    it('namingConvention', () => {

        let settings: CliCommonSchema.NamingConvention = {
            appliedTo: ['name', 'alias'],
            singularize: ['operation', 'operationGroup'],
            glossary: ['cats', 'Dogs'],
            override: {
                autoRest: 'AUTOREST',
                AmE: 'AME',
            },
            parameter: 'camel',
            operation: 'pascal',
            operationGroup: 'upper',
            property: 'kebab',
            type: 'snake',
            choice: 'space',
            choiceValue: 'camel'
        };
        settings = Helper.normalizeNamingSettings(settings);

        let group: OperationGroup = new OperationGroup('cats_food');
        Helper.applyNamingConvention(settings, group, 'default');
        assert.equal(group.language['default'].name, 'CATS_FOOD');

        let op: Operation = new Operation('birds_food', 'desc');
        op.language.default['alias'] = ['alias_name1', 'alias_name2'];
        Helper.applyNamingConvention(settings, op, 'default');
        assert.equal(op.language['default'].name, 'BirdFood');
        assert.deepEqual(op.language.default['alias'], ['AliasName1', 'AliasName2']);

        let param: Parameter = new Parameter('try_ame_test', 'desc', null);
        param.language.default['alias'] = 'param_alias';
        Helper.applyNamingConvention(settings, param, 'default');
        assert.equal(param.language['default'].name, 'tryAMETest');
        assert.equal(param.language['default']['alias'], 'paramAlias');

        let schema: ObjectSchema = new ObjectSchema('AUTOREST_is_cool', 'desc');
        schema.language['cli'] = {
            name: 'is_autorest_very_cool',
            alias: 'op_alias_autorest',
        };
        Helper.applyNamingConvention(settings, schema, 'cli');
        assert.equal(schema.language['cli'].name, 'is_AUTOREST_very_cool');
        assert.equal(schema.language['cli'].alias, 'op_alias_AUTOREST');

        let prop: Property = new Property('hello_world', 'desc', null);
        prop.language['cli'] = {
            name: 'hello_world',
            alias: 'prop_alias'
        };
        Helper.applyNamingConvention(settings, prop, 'cli');
        assert.equal(prop.language['cli'].name, 'hello-world');
        assert.equal(prop.language['cli'].alias, 'prop-alias');

        let choice: ChoiceSchema = new ChoiceSchema('name', 'desc');
        choice.language['cli'] = { name: 'all_dogs_are_animal' }
        Helper.applyNamingConvention(settings, choice, 'cli');
        assert.equal(choice.language['cli'].name, 'all dogs are animal');

        let value: ChoiceValue = new ChoiceValue('name', 'desc', null);
        choice.language['cli'] = { name: 'all_dogs_are_animal' }
        Helper.applyNamingConvention(settings, choice, 'cli');
        assert.equal(choice.language['cli'].name, 'all dogs are animal');
    });
});