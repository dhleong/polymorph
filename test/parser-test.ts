import * as chai from 'chai';

import { Section, StringPart, TablePart } from '../src/parser';
import { textItem } from './test-utils';

chai.should();

describe('StringPart', () => {
    describe('isOnlyWhitespace', () => {
        it('works', () => {
            new StringPart('  ').isOnlyWhitespace().should.be.true;
            new StringPart('a ').isOnlyWhitespace().should.be.false;
        });
    });
});

describe('Section', () => {
    describe('pushString', () => {
        it("Doesn't add whitespace-only to non-whitespace", () => {
            const section = new Section(0);
            section.pushString('Test ');
            section.pushString('  ');
            section.parts.should.have.length(2);
        });

        it('Adds whitespace between parts', () => {
            const section = new Section(0);
            section.pushString('on using');
            section.pushString('    ');
            section.pushString('the    ');
            section.parts.should.have.length(1);
            section.parts[0].toString().should.equal('on using the ');
        });

        it("Doesn't add unnecessary whitespace between parts", () => {
            const section = new Section(0);
            section.pushString('Sys');
            section.pushString('tem    Reference');
            section.parts.should.have.length(1);
            section.parts[0].toString().should.equal('System Reference');
        });
    });

    describe('Table handling', () => {
        it('Extracts headers', () => {
            const section = new Section(0);
            section.push(textItem({
                str: 'Header 1',
                tableHeader: true,
                y: 420,
            }));
            section.push(textItem({
                str: 'Header 2',
                tableHeader: true,
                y: 420,
            }));

            section.parts.should.have.length(1);
            section.parts[0].should.be.instanceof(TablePart);
        });

        it('Handles basic tables', () => {
            // from The Monk table
            const items = [
                {str: 'Level', y: 483, tableHeader: true},
                {str: '    ', y: 483, tableHeader: true},
                {str: 'Proficiency    Bonus', y: 483, tableHeader: true},
                {str: '    ', y: 483, tableHeader: true},
                {str: 'Martial    Arts', y: 483, tableHeader: true},
                {str: '    ', y: 483, tableHeader: true},

                {str: '1st', y: 472},
                {str: '    ', y: 472},
                {str: '+2', y: 472},
                {str: '    ', y: 472},
                {str: '1d4', y: 472},
                {str: '    ', y: 472},

                {str: '5th', y: 428},
                {str: '    ', y: 428},
                {str: '+3', y: 428},
                {str: '    ', y: 428},
                {str: '1d6', y: 428},
                {str: '    ', y: 428},
            ];

            const section = new Section(0);
            items.forEach(item => {
                section.push(textItem(item));
            });
            section.postProcess();

            section.parts.should.have.length(1);
            section.parts[0].should.be.instanceof(TablePart);

            const table = (section.parts[0] as TablePart).toJson();
            table.headers.should.deep.equal([
                ['Level', 'Proficiency Bonus', 'Martial Arts'],
            ]);
            table.rows.should.deep.equal([
                ['1st', '+2', '1d4'],
                ['5th', '+3', '1d6'],
            ]);
        });
    });
});
