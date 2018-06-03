import * as chai from 'chai';

import { Section, StringPart, TablePart } from '../src/parser';
import { tableSection, textItem } from './test-utils';

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
                {str: 'Dragon', x: 328, y: 483, width: 27, tableHeader: true},
                {str: '    ', x: 355, y: 483, width: 2, tableHeader: true},
                {str: 'Damage    Type', x: 382, width: 50, y: 483, tableHeader: true},
                {str: '    ', x: 433, y: 483, width: 2, tableHeader: true},
                {str: 'Breath    Weapon', x: 450, y: 483, width: 58, tableHeader: true},
                {str: '    ', x: 509, y: 483, width: 2, tableHeader: true},

                {str: 'Blue', x: 328, y: 472},
                {str: '    ', x: 344, y: 472},
                {str: 'Lightning', x: 382, y: 472},
                {str: '    ', x: 416, y: 472},
                {str: '5    by    30    ft.    line    ', x: 450, y: 472},
                {str: '(Dex.    save)', x: 504, y: 472},
                {str: '    ', x: 545, y: 472},
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

        it('handles splits across page columns', () => {
            // see: "relentless rage" for 11th level Barbarian
            // from The Barbarian table
            const items = [
                {str: 'Level', x: 56, y: 320, width: 19, tableHeader: true},
                {str: '    ', x: 76, y: 320, width: 2, tableHeader: true},
                {str: 'Proficiency    ', x: 88, y: 331, width: 43, tableHeader: true},
                {str: 'Bonus', x: 97, y: 320, width: 23, tableHeader: true},
                {str: '    ', x: 120, y: 320, width: 2, tableHeader: true},
                {str: 'Features', x: 141, y: 320, width: 32, tableHeader: true},
                {str: '    ', x: 173, y: 320, width: 2, tableHeader: true},
                {str: 'Rages', x: 212, y: 320, width: 21, tableHeader: true},
                {str: '    ', x: 233, y: 320, width: 2, tableHeader: true},

                {str: '11th', x: 58, y: 101},
                {str: '    ', x: 75, y: 101},
                {str: '+4', x: 104, y: 101},
                {str: '    ', x: 113, y: 101},
                {str: 'Relentless    ', x: 141, y: 101},
                {str: '4', x: 220, y: 101},
                {str: '    ', x: 225, y: 101},
                {str: '+3', x: 263, y: 101},
                {str: '    ', x: 272, y: 101},
                {str: 'Rage', x: 411, y: 711},
                {str: '    ', x: 429, y: 711},
            ];

            const table = tableSection(items).toJson();
            table.rows.should.deep.equal([
                ['11th', '+4', 'Relentless Rage', '4', '+3'],
            ]);
        });

        it('Consolidates long rows', () => {
            const items = [
                {str: 'The    Cleric', width: 48, height: 144, x: 57, y: 486, tableHeader: true},
                {str: '    ', width: 2, height: 144, x: 106, y: 486, tableHeader: true},
                {str: '    ', width: 2, height: 78, x: 67, y: 471.36, tableHeader: true},
                {str: 'Proficiency', width: 41, height: 78, x: 87, y: 471.36, tableHeader: true},
                {str: '    ', width: 2, height: 78, x: 129, y: 471.36, tableHeader: true},
                {str: '    ', width: 2, height: 78, x: 139, y: 471.36, tableHeader: true},
                {str: 'Cantrips', width: 30, height: 78, x: 312, y: 471.36, tableHeader: true},
                {str: '    ', width: 2, height: 78, x: 343, y: 471.36, tableHeader: true},
                {str: '', width: 0, height: 76, x: 398, y: 470, fontName: 'g_font_error'},
                {str: 'Spell    Slots    per    Spell    Level',
                    width: 94, height: 78, x: 407, y: 470.64, tableHeader: true}, // tslint:disable-line
                {str: '', width: 0, height: 76, x: 501, y: 470, fontName: 'g_font_error'},
                {str: '    ', width: 2, height: 78, x: 510, y: 470.64, tableHeader: true},
                {str: 'Level', width: 19, height: 78, x: 57, y: 459.6, tableHeader: true},
                {str: '    ', width: 2, height: 78, x: 76, y: 459.6, tableHeader: true},
                {str: 'Bonus', width: 23, height: 78, x: 96, y: 459.6, tableHeader: true},
                {str: '    ', width: 2, height: 78, x: 120, y: 459.6, tableHeader: true},
                {str: 'Features', width: 32, height: 78, x: 139, y: 459.6, tableHeader: true},
                {str: '    ', width: 2, height: 78, x: 172, y: 459.6, tableHeader: true},
                {str: 'Known', width: 26, height: 78, x: 315, y: 459.6, tableHeader: true},
                {str: '    ', width: 2, height: 78, x: 341, y: 459.6, tableHeader: true},

                {str: '3rd', width: 12, height: 78, x: 61, y: 414.96, fontName: 'g_d0_f2'},
                {str: '    ', width: 2, height: 78, x: 73, y: 414.96, fontName: 'g_d0_f2'},
                {str: '+2', width: 9, height: 78, x: 103, y: 414.96, fontName: 'g_d0_f2'},
                {str: '    ', width: 2, height: 78, x: 113, y: 414.96, fontName: 'g_d0_f2'},
                {str: '', width: 0, height: 78, x: 139, y: 414.24, fontName: 'g_font_error'},
                {str: '    ', width: 2, height: 78, x: 148, y: 414.24, fontName: 'g_d0_f2'},
                {str: '3', width: 4, height: 78, x: 325, y: 414.96, fontName: 'g_d0_f2'},
                {str: '    ', width: 2, height: 78, x: 330, y: 414.96, fontName: 'g_d0_f2'},
                {str: '4', width: 4, height: 78, x: 357, y: 414.96, fontName: 'g_d0_f2'},
                {str: '    ', width: 2, height: 78, x: 362, y: 414.96, fontName: 'g_d0_f2'},
                {str: '2', width: 4, height: 78, x: 381, y: 414.96, fontName: 'g_d0_f2'},
                {str: '    ', width: 2, height: 78, x: 385, y: 414.96, fontName: 'g_d0_f2'},
            ];

            const table = tableSection(items);

            // before, due to the .72 difference in y caused by the g_font_error
            //  and its whitespace, this would have been split into two rows:
            table.toJson().rows.should.deep.equal([
                ['3rd', '+2', '3', '4', '2'],
            ]);
        });
    });
});

describe('Parser', () => {
    it('Creates tables with rows', () => {
        // from The Barbarian table
        const items = [
            {str: 'The    Barbarian', x: 57, y: 346, height: 144, tableHeader: true},
            {str: '    ', x: 127, y: 346, height: 144, tableHeader: true},

            {str: 'Level', x: 56, y: 320, height: 78, tableHeader: true},
            {str: '    ', x: 76, y: 320, height: 78, tableHeader: true},
            {str: 'Proficiency    ', x: 88, y: 331, height: 78, tableHeader: true},
            {str: 'Bonus', x: 97, y: 320, height: 78, tableHeader: true},
            {str: '    ', x: 120, y: 320, height: 78, tableHeader: true},
            {str: 'Features', x: 141, y: 320, height: 78, tableHeader: true},
            {str: '    ', x: 173, y: 320, height: 78, tableHeader: true},
            {str: 'Rages', x: 212, y: 320, height: 78, tableHeader: true},
            {str: '    ', x: 233, y: 320, height: 78, tableHeader: true},

            {str: '5th', height: 78, x: 61, y: 210},
            {str: '    ', height: 78, x: 73, y: 210},
            {str: '+3', height: 78, x: 104, y: 210},
            {str: '    ', height: 78, x: 113, y: 210},
            {str: 'Extra    Attack,', height: 78, x: 141, y: 210},
            {str: '    ', height: 78, x: 187, y: 210},
            {str: 'Fast    ', height: 78, x: 141, y: 199},
            {str: 'Movement', height: 78, x: 141, y: 189},
            {str: '    ', height: 78, x: 181, y: 189},
            {str: '3', height: 78, x: 220, y: 210},
            {str: '    ', height: 78, x: 225, y: 210},
        ];

        const table = tableSection(items).toJson();
        table.headers.should.deep.equal([
            ['The Barbarian'],
            ['Level', 'Proficiency Bonus', 'Features', 'Rages'],
        ]);

        table.rows.should.deep.equal([
            ['5th', '+3', 'Extra Attack, Fast Movement', '3'],
        ]);
    });

    it('Merges tables at different levels', () => {
        // Excerpt from "The Cleric" table (with header):
        const items = [
            {str: 'The    Cleric', width: 48, height: 144, x: 57, y: 486, tableHeader: true},
            {str: '    ', width: 2, height: 144, x: 106, y: 486, tableHeader: true},
            {str: '    ', width: 2, height: 78, x: 67, y: 471.36, tableHeader: true},
            {str: 'Proficiency', width: 41, height: 78, x: 87, y: 471.36, tableHeader: true},
            {str: '    ', width: 2, height: 78, x: 129, y: 471.36, tableHeader: true},
            {str: '    ', width: 2, height: 78, x: 139, y: 471.36, tableHeader: true},
            {str: 'Cantrips', width: 30, height: 78, x: 312, y: 471.36, tableHeader: true},
            {str: '    ', width: 2, height: 78, x: 343, y: 471.36, tableHeader: true},
            {str: '', width: 0, height: 76, x: 398, y: 470, fontName: 'g_font_error'},
            {str: 'Spell    Slots    per    Spell    Level',
                width: 94, height: 78, x: 407, y: 470.64, tableHeader: true}, // tslint:disable-line
            {str: '', width: 0, height: 76, x: 501, y: 470, fontName: 'g_font_error'},
            {str: '    ', width: 2, height: 78, x: 510, y: 470.64, tableHeader: true},
            {str: 'Level', width: 19, height: 78, x: 57, y: 459.6, tableHeader: true},
            {str: '    ', width: 2, height: 78, x: 76, y: 459.6, tableHeader: true},
            {str: 'Bonus', width: 23, height: 78, x: 96, y: 459.6, tableHeader: true},
            {str: '    ', width: 2, height: 78, x: 120, y: 459.6, tableHeader: true},
            {str: 'Features', width: 32, height: 78, x: 139, y: 459.6, tableHeader: true},
            {str: '    ', width: 2, height: 78, x: 172, y: 459.6, tableHeader: true},
            {str: 'Known', width: 26, height: 78, x: 315, y: 459.6, tableHeader: true},
            {str: '    ', width: 2, height: 78, x: 341, y: 459.6, tableHeader: true},
        ];

        const table = tableSection(items);
        table.toJson().headers.should.deep.equal([
            ['The Cleric'],
            ['Level', 'Proficiency Bonus', 'Features', 'Cantrips Known'],
        ]);
    });
});
