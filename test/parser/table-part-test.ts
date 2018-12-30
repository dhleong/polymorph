import * as chai from 'chai';

import { TablePart } from '../../src/parser';
import {
    loadTextItems,
    parsePage,
    tableFromSection,
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

    it('consolidates parts of the same, wide cell type 2', async () => {
        const table = tableSection(
            await loadTextItems('oath-of-devotion-spells.txt'),
        ).toJson();

        table.rows.should.deep.equal([
            [ '3rd', 'protection from evil and good, sanctuary' ],
            [ '5th', 'lesser restoration, zone of truth' ],
            [ '9th', 'beacon of hope, dispel magic' ],
            [ '13th', 'freedom of movement, guardian of faith' ],
            [ '17th', 'commune, flame strike' ],
        ]);
    });

    it('handles tables split across pages', async () => {
        const table = tableSection(
            await loadTextItems('lifestyle-expenses.txt'),
        ).toJson();

        table.rows.should.deep.equal([
            [
                'Wretched',
                '—',
            ],
            [
                'Squalid',
                '1 sp',
            ],
            [
                'Poor',
                '2 sp',
            ],
            [
                'Modest',
                '1 gp',
            ],
            [
                'Comfortable',
                '2 gp',
            ],
            [
                'Wealthy',
                '4 gp',
            ],
            [
                'Aristocratic',
                '10 gp minimum',
            ],
        ]);
    });

    it.skip('handles more tables split across pages', async () => {
        const table = tableFromSection(
            await loadTextItems('confusion-table.txt'),
        ).toJson();

        table.headers.should.deep.equal([
            ['d10', 'Behavior'],
        ]);

        table.rows.should.deep.equal([
            // tslint:disable-next-line
            ['1', 'The creature uses all its movement to move in a random direction. To determine the direction, roll a d8 and assign a direction to each die face. The creature doesn’t take an action this turn.'],
            ['2–6', 'The creature doesn’t move or take actions this turn.'],
            // tslint:disable-next-line
            ['7–8', 'The creature uses its action to make a melee attack against a randomly determined creature within its reach. If there is no creature within its reach, the creature does nothing this turn.'],
            ['9–10', 'The creature can act and move normally.'],
        ]);
    });

    it('handles wide tables in a two-column layout', async () => {
        const table = tableFromSection(
            await loadTextItems('teleport-table.txt'),
        ).toJson();

        table.headers.should.deep.equal([
            ['Familiarity', 'Mishap', 'Similar Area', 'Off Target', 'On Target'],
        ]);

        table.rows.should.deep.equal([
            ['Permanent circle', '—', '—', '—', '01–100'],
            ['Associated object', '—', '—', '—', '01–100'],
            ['Very familiar', '01–05', '06–13', '14–24', '25–100'],
            ['Seen casually', '01–33', '34–43', '44–53', '54–100'],
            ['Viewed once', '01–43', '44–53', '54–73', '74–100'],
            ['Description', '01–43', '44–53', '54–73', '74–100'],
            ['False destination', '01–50', '51–100', '—', '—'],
        ]);
    });
});
