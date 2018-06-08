import * as chai from 'chai';

import { loadJsonSections } from '../test-utils';

import { CreaturePart } from '../../src/parser/creature-part';

chai.should();

describe('CreaturePart', () => {
    describe('parsing', () => {
        const creaturePromise =
            loadJsonSections('aboleth.raw.json')
                .then(CreaturePart.from);

        it('works', async () => {
            const part = await creaturePromise;

            part.name.should.equal('Aboleth');
            part.ac.should.equal(17);
            part.acSource.should.equal('(natural armor)');
            part.hp.should.equal(135);
            part.hpRoll.should.equal('(18d10 + 36)');

            part.abilities.str.should.equal(21);
        });
    });
});
