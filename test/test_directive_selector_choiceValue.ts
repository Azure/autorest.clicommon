import { assert } from 'chai';
import { ChoiceValue } from "@azure-tools/codemodel";
import 'mocha';
import { NodeSelector } from '../src/plugins/modifier/cliDirectiveSelector';


describe('Test Directive - Selector - choiceValue', function () {
    it('select choiceValue - normal', () => {

        let selector = new NodeSelector({
            select: 'choiceValue',
            where: {
                choiceSchema: 'cs1',
                choiceValue: 'os1',
            }
        });

        assert.isTrue(selector.match({
            choiceSchemaName: 'cs1',
            choiceValueName: 'os1',
            target: new ChoiceValue('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaName: 'os1',
            choiceValueName: 'os1+',
            target: new ChoiceValue('fake', 'fake description', null),
        }));
    });

    it('select choiceValue - normal without choiceSchema', () => {

        let selector = new NodeSelector({
            select: 'choiceValue',
            where: {
                choiceValue: 'os1',
            }
        });

        assert.isTrue(selector.match({
            choiceSchemaName: 'cs1',
            choiceValueName: 'os1',
            target: new ChoiceValue('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaName: 'os1',
            choiceValueName: 'os1+',
            target: new ChoiceValue('fake', 'fake description', null),
        }));
    });

    it('select choiceValue - implicit select', () => {
        let selector = new NodeSelector({
            where: {
                choiceSchema: 'cs1',
                choiceValue: 'os1',
            }
        });

        assert.isTrue(selector.match({
            choiceSchemaName: 'cs1',
            choiceValueName: 'os1',
            target: new ChoiceValue('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaName: 'cs1',
            choiceValueName: 'os1+',
            target: new ChoiceValue('fake', 'fake description', null),
        }));
    });

    it('select choiceValue - alias', () => {
        let alias = ['value'];

        alias.forEach((v) => {
            let s = {
                where: {}
            };
            s.where[v] = 'os1';
            let selector = new NodeSelector(s);

            assert.isTrue(selector.match({
                choiceSchemaName: 'cs1',
                choiceValueName: 'os1',
                target: new ChoiceValue('fake', 'fake description', null),
            }));

            assert.isNotTrue(selector.match({
                choiceSchemaName: 'cs1',
                choiceValueName: 'os1+',
                target: new ChoiceValue('fake', 'fake description', null),
            }));
        });
    });


    it('select choiceValue - regex', () => {
        let selector = new NodeSelector({
            where: {
                choiceSchema: 'cs1',
                choiceValue: '^hw$',
            }
        });

        assert.isTrue(selector.match({
            choiceSchemaName: 'cs1',
            choiceValueName: 'hw',
            target: new ChoiceValue('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaName: 'cs1',
            choiceValueName: 'hww',
            target: new ChoiceValue('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaName: 'cs1',
            choiceValueName: 'hhw',
            target: new ChoiceValue('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaName: 'cs1',
            choiceValueName: 'haw',
            target: new ChoiceValue('fake', 'fake description', null),
        }));
    });
});