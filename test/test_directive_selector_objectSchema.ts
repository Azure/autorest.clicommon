import "@azure-tools/codemodel";
import { ObjectSchema } from "@azure-tools/codemodel";
import { assert } from 'chai';
import 'mocha';
import { NodeSelector } from '../src/plugins/modifier/cliDirectiveSelector';


describe('Test Directive - Selector - objectSchema', function () {
    it('select objectSchema - normal', () => {

        let selector = new NodeSelector({
            select: 'objectSchema',
            where: {
                objectSchema: 'os1',
            }
        });

        assert.isTrue(selector.match({
            objectSchemaCliKey: 'os1',
            parent: null,
            targetIndex: -1,
            target: new ObjectSchema('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'os1+',
            parent: null,
            targetIndex: -1,
            target: new ObjectSchema('fake', 'fake description'),
        }));
    });

    it('select objectSchema - implicit select', () => {
        let selector = new NodeSelector({
            where: {
                objectSchema: 'os1',
            }
        });

        assert.isTrue(selector.match({
            objectSchemaCliKey: 'os1',
            parent: null,
            targetIndex: -1,
            target: new ObjectSchema('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'os1+',
            parent: null,
            targetIndex: -1,
            target: new ObjectSchema('fake', 'fake description'),
        }));
    });

    it('select objectSchema - alias', () => {
        let alias = ['type', 'object'];

        alias.forEach((v) => {
            let s = {
                where: {}
            };
            s.where[v] = 'os1';
            let selector = new NodeSelector(s);

            assert.isTrue(selector.match({
                objectSchemaCliKey: 'os1',
                parent: null,
                targetIndex: -1,
                target: new ObjectSchema('fake', 'fake description'),
            }));

            assert.isNotTrue(selector.match({
                objectSchemaCliKey: 'os1+',
                parent: null,
                targetIndex: -1,
                target: new ObjectSchema('fake', 'fake description'),
            }));
        });
    });


    it('select objectSchema - regex', () => {
        let selector = new NodeSelector({
            where: {
                objectSchema: '^og1',
            }
        });

        assert.isTrue(selector.match({
            objectSchemaCliKey: 'og1og2',
            parent: null,
            targetIndex: -1,
            target: new ObjectSchema('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'og0og1og2',
            parent: null,
            targetIndex: -1,
            target: new ObjectSchema('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'og0og1',
            parent: null,
            targetIndex: -1,
            target: new ObjectSchema('fake', 'fake description'),
        }));

        assert.isNotTrue(selector.match({
            objectSchemaCliKey: 'og',
            parent: null,
            targetIndex: -1,
            target: new ObjectSchema('fake', 'fake description'),
        }));
    });
});