import * as chai from 'chai';

import { isCreatureHeader } from '../src/parser';
import {
    loadJsonSections, loadTextItems,
    parsePage,
    postProcessSections,
    tableSection,
} from './test-utils';

chai.should();

describe('isCreatureHeader', () => {
    it('detects Misc Creatures and NPCs Appendices', () => {
        isCreatureHeader('Appendix MM-A: Miscellaneous Creatures').should.be.true;
        isCreatureHeader('Appendix MM-B: Nonplayer Characters').should.be.true;
    });

    it('detects alphabetic monster listings', () => {
        isCreatureHeader('Monsters (A)').should.be.true;
        isCreatureHeader('Monsters (B)').should.be.true;
    });

    it('ignores the Monsters section', () => {
        isCreatureHeader('Monsters').should.be.false;
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

    it('gracefully handles empty creature sections', async () => {
        const sections = postProcessSections(
            await loadJsonSections('monsters-b.raw.json', /* canHaveTables =*/false),
        );
        sections.should.have.lengthOf(3);
        sections[0].getHeader().should.equal('Monsters (B)');
        sections[1].getHeader().should.equal('Basilisk');
        sections[2].getHeader().should.equal('Behir');
    });

    it('correctly separates a series of tables', async () => {
        const sections = parsePage(
            await loadTextItems('druid-circle-spells.txt'),
        );

        sections.should.have.lengthOf(2);
        sections[0].getHeader().should.equal('Arctic');
        sections[1].getHeader().should.equal('Coast');
    });
});
