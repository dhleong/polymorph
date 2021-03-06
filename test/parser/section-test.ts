import * as chai from 'chai';

import { FormatSpan, Formatting, Section, TablePart } from '../../src/parser';
import { StringPart } from '../../src/parser/string-part';
import { loadTextItems, parsePage, tableSection, textItem } from '../test-utils';

chai.should();

describe('Section', () => {
    describe('pushString', () => {
        it("Doesn't add whitespace-only to non-whitespace", () => {
            const section = new Section(0);
            section.pushString(new StringPart('Test '));
            section.pushString(new StringPart('  '));
            section.parts.should.have.length(2);
        });

        it('Adds whitespace between parts', () => {
            const section = new Section(0);
            section.pushString(new StringPart('on using'));
            section.pushString(new StringPart('    '));
            section.pushString(new StringPart('the    '));
            section.parts.should.have.length(1);
            section.parts[0].toString().should.equal('on using the ');
        });

        it('Expands formatting when adding whitespace between parts', () => {
            const section = new Section(0);
            section.pushString({
                fontName: 'g_d0_f3',
                str: 'Bold',
            });
            section.pushString({
                fontName: 'g_d0_f3',
                str: '    ',
            });
            section.pushString({
                fontName: 'g_d0_f3',
                str: '+Also Bold',
            });

            section.parts.should.have.lengthOf(1);

            const part = section.parts[0] as StringPart;
            part.str.should.equal('Bold +Also Bold');
            part.formatting.should.deep.equal([
                new FormatSpan(
                    Formatting.Bold,
                    0,
                    15,
                ),
            ]);
        });

        it("Doesn't add unnecessary whitespace between parts", () => {
            const section = new Section(0);
            section.pushString(new StringPart('Sys'));
            section.pushString(new StringPart('tem    Reference'));
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
            // from the Draconic Ancestry table
            const items = [
                {str: 'Draconic    Ancestry', width: 90, height: 144, x: 328.5602, y: 436.32, fontName: 'g_d0_f6' },
                {str: '    ', width: 2.712, height: 144, x: 418.5777, y: 436.32, fontName: 'g_d0_f6' },

                { str: 'Dragon', width: 27, height: 78.85439999999998, x: 328.5602, y: 421.44, fontName: 'g_d0_f6' },
                { str: '    ', width: 2, height: 78, x: 355.8106, y: 421.44, fontName: 'g_d0_f6' },
                { str: 'Damage    Type', width: 50, height: 78, x: 382.5602, y: 421.44, fontName: 'g_d0_f6' },
                { str: '    ', width: 2, height: 78, x: 433.3521, y: 421.44, fontName: 'g_d0_f6' },
                { str: 'Breath    Weapon', width: 58, height: 78, x: 450.9601, y: 421.44, fontName: 'g_d0_f6' },
                { str: '    ', width: 2, height: 78, x: 509.7897, y: 421.44, fontName: 'g_d0_f6' },
                { str: 'Black', width: 19, height: 78, x: 328.5602, y: 410.64, fontName: 'g_d0_f2' },
                { str: '    ', width: 2, height: 78, x: 347.7291, y: 410.64, fontName: 'g_d0_f2' },
                { str: 'Acid', width: 15, height: 78, x: 382.5602, y: 410.64, fontName: 'g_d0_f2' },
                { str: '    ', width: 2, height: 78, x: 398.3673, y: 410.64, fontName: 'g_d0_f2' },
                { str: '5    by    30    ft.    line    (Dex.    save)',
                    width: 94, height: 78, x: 450.9601, y: 410.64, fontName: 'g_d0_f2' }, // tslint:disable-line
                { str: '    ', width: 2, height: 78, x: 545.0427, y: 410.64, fontName: 'g_d0_f2' },

                { str: 'Blue', width: 16, height: 78, x: 328.5602, y: 399.6, fontName: 'g_d0_f2' },
                { str: '    ', width: 2, height: 78, x: 344.7276, y: 399.6, fontName: 'g_d0_f2' },
                { str: 'Lightning', width: 33, height: 78, x: 382.5602, y: 399.6, fontName: 'g_d0_f2' },
                { str: '    ', width: 2, height: 78, x: 416.1476, y: 399.6, fontName: 'g_d0_f2' },
                { str: '5    by    30    ft.    line    ',
                    width: 54, height: 78, x: 450.9601, y: 399.6, fontName: 'g_d0_f2' }, // tslint:disable-line
                { str: '(Dex.    save)', width: 40, height: 78, x: 504.9909, y: 399.6, fontName: 'g_d0_f2' },
                { str: '    ', width: 2, height: 78, x: 545.0427, y: 399.6, fontName: 'g_d0_f2' },
            ];

            const table = tableSection(items).toJson();
            table.headers.should.deep.equal([
                ['Draconic Ancestry'],
                ['Dragon', 'Damage Type', 'Breath Weapon'],
            ]);
            table.rows.should.deep.equal([
                ['Black', 'Acid', '5 by 30 ft. line (Dex. save)'],
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
                ['3rd', '+2', '', '3', '4', '2'],
            ]);
        });

        it('handles wide column cells', async () => {
            const bard = tableSection(
                await loadTextItems('the-bard.txt'),
            ).toJson();

            bard.rows[4].should.deep.equal([
                '5th', '+3',
                'Bardic Inspiration (d8), Font of Inspiration',
                '3', '8',
                '4', '3', '2',
                '', '', '', '', '', '',
            ]);
        });
    });

    it('Handles table with rows on multiple page columns', async () => {
        // from The Fighter
        const items = await loadTextItems('the-fighter-split.txt');

        const table = tableSection(items).toJson();
        table.headers.should.deep.equal([
            ['The Fighter'],
            ['Level', 'Proficiency Bonus', 'Features'],
        ]);

        table.rows.should.deep.equal([
            ['15th', '+5', 'Martial Archetype feature'],
            ['16th', '+5', 'Ability Score Improvement'],
        ]);
    });

    it('Handles vertically aligned header names', () => {
        const items = [
            { str: 'Creating    Spell    Slots', width: 95, height: 144, x: 328.5602, y: 212.4, fontName: 'g_d0_f6' },
            { str: '    ', width: 2.712, height: 144, x: 423.8688, y: 212.4, fontName: 'g_d0_f6' },
            { str: 'Spell    Slot', width: 34, height: 78, x: 328.5639, y: 197.76, fontName: 'g_d0_f6' },
            { str: '    ', width: 2, height: 78, x: 363.0566, y: 197.76, fontName: 'g_d0_f6' },
            { str: 'Level', width: 19, height: 78, x: 336.1422, y: 186.72, fontName: 'g_d0_f6' },
            { str: '    ', width: 2, height: 78, x: 355.4782, y: 186.72, fontName: 'g_d0_f6' },
            { str: 'Sorcery', width: 28, height: 78, x: 378.73, y: 197.76, fontName: 'g_d0_f6' },
            { str: '    ', width: 2, height: 78, x: 406.7803, y: 197.76, fontName: 'g_d0_f6' },
            { str: 'Point    Cost', width: 38, height: 78, x: 373.6873, y: 186.72, fontName: 'g_d0_f6' },
            { str: '    ', width: 2, height: 78, x: 411.8231, y: 186.72, fontName: 'g_d0_f6' },
        ];

        const table = tableSection(items).toJson();
        table.headers.should.deep.equal([
            ['Creating Spell Slots'],
            ['Spell Slot Level', 'Sorcery Point Cost'],
        ]);
    });
});

describe('Spell List Section', () => {
    function listItems(section: Section): string[] {
        return section.parts.map(it =>
            (it as StringPart).str,
        ).filter(it => it !== '');
    }

    it('works', async () => {
        const items = await loadTextItems('spell-lists.txt');
        const sections = parsePage(items);

        sections[0].getHeader().should.equal('Spell Lists');
        sections[1].getHeader().should.equal('Bard Spells');
        sections[2].getHeader().should.equal('Cantrips (0 Level)');

        const cantrips = listItems(sections[3]);
        cantrips.should.have.lengthOf(9, JSON.stringify(cantrips));

        sections[4].getHeader().should.equal('1st Level');
        const firstLevel = listItems(sections[5]);
        firstLevel.should.deep.equal([
            'Animal Friendship', 'Bane', 'Charm Person',
            'Comprehend Languages',

            // NOTE these are actually 2nd level spells, but
            // Magic Mouth lines up with the others;
            // See Invisibility is on the next column
            'Magic Mouth',
            'See Invisibility',

            // NOTE: these are 3rd level spells that line up with
            // See Invisibility; their xs are slightly off and
            // have spaces. (Dispel Magic was put together correctly)
            // but I'm including it just in case
            'Dispel Magic',
            'Fear',
            'Glyph of Warding',
            'Hypnotic Pattern',
        ]);

        sections[6].getHeader().should.equal('6th Level');
        const sixthLevel = listItems(sections[7]);
        sixthLevel.should.deep.equal([
            // NOTE: Eyebite is the last entry on its page;
            'Eyebite',
            'Find the Path',
            'Guards and Wards',
        ]);
    });

    it('works pt2', async () => {
        const items = await loadTextItems('wizard-spell-lists.txt');
        const sections = parsePage(items);

        // wizard spells:
        sections[0].getHeader().should.equal('5th Level');
        const fifthLevel = listItems(sections[1]);
        fifthLevel.should.deep.equal([
            // NOTE: Eyebite is the last entry on its page;
            'Animate Objects',
            'Arcane Hand',
            'Cloudkill',
            'Cone of Cold',
        ]);
    });
});
