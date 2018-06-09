import * as chai from 'chai';

import { loadJsonSections } from '../test-utils';

import {
    alignmentFromString,
    CreaturePart,
} from '../../src/parser/creature-part';
import {
    Alignment,
    Size,
} from '../../src/parser/interface';

chai.should();

describe('alignmentFromString', () => {
    it('works', () => {
        alignmentFromString('lawful good').should.equal(Alignment.LawfulGood);
        alignmentFromString('lawful neutral').should.equal(Alignment.LawfulNeutral);
        alignmentFromString('lawful evil').should.equal(Alignment.LawfulEvil);

        alignmentFromString('neutral good').should.equal(Alignment.NeutralGood);
        alignmentFromString('neutral').should.equal(Alignment.TrueNeutral);
        alignmentFromString('neutral evil').should.equal(Alignment.NeutralEvil);

        alignmentFromString('chaotic good').should.equal(Alignment.ChaoticGood);
        alignmentFromString('chaotic neutral').should.equal(Alignment.ChaoticNeutral);
        alignmentFromString('chaotic evil').should.equal(Alignment.ChaoticEvil);
    });

    it('handles special cases', () => {
        alignmentFromString('unaligned').should.equal(Alignment.Unaligned);
        alignmentFromString('any alignment').should.equal(Alignment.Any);

    });
});

describe('CreaturePart', () => {
    describe('sizeKindAlign parsing', () => {
        it('handles very specific kinds', () => {
            const c = new CreaturePart();
            c.readSizeKindAlign('Medium humanoid (human, shapechanger), neutral good');

            c.size.should.equal(Size.Medium);
            c.kind.should.equal('humanoid (human, shapechanger)');
            c.align.should.equal(Alignment.NeutralGood);
        });
    });

    describe('parsing', () => {
        const abolethPromise =
            loadJsonSections('aboleth.raw.json', /* canHaveTables =*/false)
                .then(CreaturePart.from);

        const waterElementalPromise =
            loadJsonSections('water-elemental.raw.json', /* canHaveTables =*/false)
                .then(CreaturePart.from);

        it('handles legendary creatures', async () => {
            const part = await abolethPromise;

            part.name.should.equal('Aboleth');
            part.size.should.equal(Size.Large);
            part.kind.should.equal('aberration');
            part.align.should.equal(Alignment.LawfulEvil);

            part.ac.should.equal(17);
            part.acSource.should.equal('(natural armor)');
            part.hp.should.equal(135);
            part.hpRoll.should.equal('(18d10 + 36)');
            part.speed.should.equal('10 ft., swim 40 ft.');

            part.abilities.str.should.equal(21);
            part.abilities.dex.should.equal(9);
            part.abilities.con.should.equal(15);
            part.abilities.int.should.equal(18);
            part.abilities.wis.should.equal(15);
            part.abilities.cha.should.equal(18);

            part.savingThrows.should.equal('Con +6, Int +8, Wis +6');
            part.senses.should.equal('darkvision 120 ft., passive Perception 20');
            part.skills.should.equal('History +12, Perception +10');
            part.should.have.property('immunities').that.is.undefined;
            part.should.have.property('resistances').that.is.undefined;

            part.languages.should.equal('Deep Speech, telepathy 120 ft.');
            part.cr.should.equal(10);
            part.exp.should.equal(5900);

            part.info.should.not.be.empty;
            part.info[0].str.should.include('Amphibious');
        });

        it('handles water elemental', async () => {
            const part = await waterElementalPromise;

            part.name.should.equal('Water Elemental');
        });
    });
});
