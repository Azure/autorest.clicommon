import "@azure-tools/codemodel";
import { Property } from '@azure-tools/codemodel';
import { assert } from 'chai';
import 'mocha';
import { NodeSelector } from '../src/plugins/modifier/cliDirectiveSelector';


describe('Test Directive - Selector - property', function () {
    it('select property - normal', () => {

        let selector = new NodeSelector({
            select: 'property',
            where: {
                objectSchema: 'obj',
                property: 'os1',
            }
        });

        assert.isTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'os1',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'os1+',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));
    });

    it('select property - normal without schema', () => {

        let selector = new NodeSelector({
            select: 'property',
            where: {
                property: 'os1',
            }
        });

        assert.isTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'os1',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'os1+',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));
    });

    it('select property - implicit select', () => {
        let selector = new NodeSelector({
            where: {
                objectSchema: 'obj',
                property: 'os1',
            }
        });

        assert.isTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'os1',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'os1+',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));
    });

    it('select property - alias', () => {
        let alias = ['prop'];

        alias.forEach((v) => {
            let s = {
                where: {}
            };
            s.where[v] = 'os1';
            let selector = new NodeSelector(s);

            assert.isTrue(selector.match({
                objectSchemaCliKey: 'obj',
                propertyCliKey: 'os1',
                parent: null,
                targetIndex: -1,
                target: new Property('fake', 'fake description', null),
            }));

            assert.isNotTrue(selector.match({
                propertyCliKey: 'os1+',
                parent: null,
                targetIndex: -1,
                target: new Property('fake', 'fake description', null),
            }));
        });
    });


    it('select property - regex', () => {
        let selector = new NodeSelector({
            where: {
                property: '^a[0-9]b$',
            }
        });

        assert.isTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'a1b',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'a12b',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'aab',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'obj',
            propertyCliKey: 'ab',
            parent: null,
            targetIndex: -1,
            target: new Property('fake', 'fake description', null),
        }));
    });
});