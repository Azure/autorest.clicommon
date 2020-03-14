import { ChoiceSchema } from "@azure-tools/codemodel";
import { assert } from 'chai';
import 'mocha';
import { NodeSelector } from '../src/plugins/modifier/cliDirectiveSelector';


describe('Test Directive - Selector - choiceSchema', function () {
    it('select objectSchema - normal', () => {

        let selector = new NodeSelector({
            select: 'choiceSchema',
            where: {
                choiceSchema: 'os1',
            }
        });

        assert.isTrue(selector.match({
            choiceSchemaCliKey: 'os1',
            parent: null,
            targetIndex: -1,
            target: new ChoiceSchema('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaCliKey: 'os1+',
            parent: null,
            targetIndex: -1,
            target: new ChoiceSchema('fake', 'fake description'),
        }));
    });

    it('select choiceSchema - implicit select', () => {
        let selector = new NodeSelector({
            where: {
                choiceSchema: 'os1',
            }
        });

        assert.isTrue(selector.match({
            choiceSchemaCliKey: 'os1',
            target: new ChoiceSchema('fake', 'fake description'),
            parent: null,
            targetIndex: -1,
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaCliKey: 'os1+',
            parent: null,
            targetIndex: -1,
            target: new ChoiceSchema('fake', 'fake description'),
        }));
    });

    it('select choiceSchema - alias', () => {
        let alias = ['enum'];

        alias.forEach((v) => {
            let s = {
                where: {}
            };
            s.where[v] = 'os1';
            let selector = new NodeSelector(s);

            assert.isTrue(selector.match({
                choiceSchemaCliKey: 'os1',
                parent: null,
                targetIndex: -1,
                target: new ChoiceSchema('fake', 'fake description'),
            }));

            assert.isNotTrue(selector.match({
                choiceSchemaCliKey: 'os1+',
                parent: null,
                targetIndex: -1,
                target: new ChoiceSchema('fake', 'fake description'),
            }));
        });
    });


    it('select choiceSchema - regex', () => {
        let selector = new NodeSelector({
            where: {
                choiceSchema: '^og1',
            }
        });

        assert.isTrue(selector.match({
            choiceSchemaCliKey: 'og1og2',
            parent: null,
            targetIndex: -1,
            target: new ChoiceSchema('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaCliKey: 'og0og1og2',
            parent: null,
            targetIndex: -1,
            target: new ChoiceSchema('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaCliKey: 'og0og1',
            parent: null,
            targetIndex: -1,
            target: new ChoiceSchema('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            choiceSchemaCliKey: 'og',
            parent: null,
            targetIndex: -1,
            target: new ChoiceSchema('fake', 'fake description'),
        }));
    });
});