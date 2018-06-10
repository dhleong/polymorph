import * as chai from 'chai';

import {
    loadTextItems,
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

    it('combines obviously connected headers', async () => {
        const table = tableSection(
            await loadTextItems('the-paladin-headers.txt'),
        ).toJson();

        table.headers.should.deep.equal([
            ['The Paladin'], // getHeader handles this

            ['Level', 'Proficiency Bonus', 'Features',
                '1st', '2nd', '3rd', '4th', '5th'],
        ]);
    });
});
