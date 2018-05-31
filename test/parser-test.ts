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
        it('extracts headers', () => {
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

        it('merges obvious splits', () => {
            // from The Monk table
            const items = [
                {str: 'Dragon', y: 483, tableHeader: true},
                {str: '    ', y: 483, tableHeader: true},
                {str: 'Damage    Type', y: 483, tableHeader: true},
                {str: '    ', y: 483, tableHeader: true},
                {str: 'Breath    Weapon', y: 483, tableHeader: true},
                {str: '    ', y: 483, tableHeader: true},

                {str: 'Blue', y: 472},
                {str: '    ', y: 472},
                {str: 'Lightning', y: 472},
                {str: '    ', y: 472},
                {str: '5    by    30    ft.    line    ', y: 472},
                {str: '(Dex.    save)', y: 472},
                {str: '    ', y: 472},
            ];

            const table = tableSection(items).toJson();
            table.rows.should.deep.equal([
                ['Blue', 'Lightning', '5 by 30 ft. line (Dex. save)'],
            ]);
        });

        it('handles basic tables', () => {
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

            const table = tableSection(items).toJson();
            table.headers.should.deep.equal([
                ['Level', 'Proficiency Bonus', 'Martial Arts'],
            ]);
            table.rows.should.deep.equal([
                ['1st', '+2', '1d4'],
                ['5th', '+3', '1d6'],
            ]);
        });

        it('Merges vertically-separated columns', () => {

            // from The Barbarian table
            const items = [
                {str: 'Level', x: 56, y: 320, tableHeader: true},
                {str: '    ', x: 76, y: 320, tableHeader: true},
                {str: 'Proficiency    ', x: 88, y: 331, tableHeader: true},
                {str: 'Bonus', x: 97, y: 320, tableHeader: true},
                {str: '    ', x: 120, y: 320, tableHeader: true},
                {str: 'Features', x: 141, y: 320, tableHeader: true},
                {str: '    ', x: 173, y: 320, tableHeader: true},
                {str: 'Rages', x: 212, y: 320, tableHeader: true},
                {str: '    ', x: 233, y: 320, tableHeader: true},

                {str: '5th', x: 61, y: 210},
                {str: '    ', x: 73, y: 210},
                {str: '+3', x: 104, y: 210},
                {str: '    ', x: 113, y: 210},
                {str: 'Extra    Attack,', x: 141, y: 210},
                {str: '    ', x: 187, y: 210},
                {str: 'Fast    ', x: 141, y: 199},
                {str: 'Movement', x: 141, y: 189},
                {str: '    ', x: 181, y: 189},
                {str: '3', x: 220, y: 210},
                {str: '    ', x: 225, y: 210},
            ];

            const table = tableSection(items).toJson();
            table.headers.should.deep.equal([
                ['Level', 'Proficiency Bonus', 'Features', 'Rages'],
            ]);

            table.rows.should.deep.equal([
                ['5th', '+3', 'Extra Attack, Fast Movement', '3'],
            ]);
        });

        it.skip('handles splits across page columns', () => {
            // TODO see: "relentless rage" for 11th level Barbarian
        });
    });
});

function tableSection(items: any[]): TablePart {
    const section = new Section(0);
    items.forEach(item => {
        section.push(textItem(item));
    });
    section.postProcess();

    section.parts.should.have.length(1);
    section.parts[0].should.be.instanceof(TablePart);

    return section.parts[0] as TablePart;
}
