import * as chai from 'chai';

import { TablePart } from '../../src/parser';
import {
    loadTextItems,
    parsePage,
    tableSection,
} from '../test-utils';

chai.should();

describe('TablePart', () => {
    it('strips out unnecessary header parts', async () => {
        const bard = tableSection(
            await loadTextItems('the-bard.txt'),
        ).toJson();

        bard.headers[1].should.deep.equal([
            'Level', 'Proficiency Bonus', 'Features',
            'Cantrips Known', 'Spells Known',
            '1st', '2nd', '3rd', '4th', '5th',
            '6th', '7th', '8th', '9th',
        ]);
    });

    it('Includes intentionally blank column cells', async () => {
        const bard = tableSection(
            await loadTextItems('the-bard.txt'),
        ).toJson();

        bard.rows[6].should.deep.equal([
            '7th', '+3',
            '', // features column
            '3', '10',
            '4', '3', '3', '1',

            // 5th-9th:
            '', '', '', '', '',
        ]);
    });

    it('combines obviously connected headers', async () => {
        const table = tableSection(
            await loadTextItems('the-paladin-headers.txt'),
        ).toJson();

        table.headers.should.deep.equal([
            ['The Paladin'],

            ['Level', 'Proficiency Bonus', 'Features',
                '1st', '2nd', '3rd', '4th', '5th'],
        ]);
    });

    it('consolidates parts of the same, wide last cell', async () => {
        const tables = parsePage(
            await loadTextItems('druid-circle-spells.txt'),
        ).map(s => s.parts[0] as TablePart)
            .map(table => table.toJson());

        tables[0].rows.should.deep.equal([
            ['3rd', 'hold person, spike growth'],
            ['5th', 'sleet storm, slow'],
            ['7th', 'freedom of movement, ice storm'],
            ['9th', 'commune with nature, cone of cold'],
        ]);

        tables[1].rows.should.deep.equal([
            ['3rd', 'mirror image, misty step'],
            ['5th', 'water breathing, water walk'],
            ['7th', 'control water, freedom of movement'],
            ['9th', 'conjure elemental, scrying'],
        ]);
    });
});
