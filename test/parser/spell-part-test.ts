import * as chai from 'chai';

import { SpellPart } from '../../src/parser';
import { SpellSchool } from '../../src/parser/interface';

import { loadTextItems, parsePage } from '../test-utils';

chai.should();

async function loadSpellFromItems(fileName: string) {
    const items = await loadTextItems(fileName);
    const sections = parsePage(items);

    // NOTE: sections[0] is the "Spell Descriptions" section

    return SpellPart.from(sections[1], sections[2]);
}

describe('SpellPart parsing', () => {
    it('works for Polymorph', async () => {
        const spellPart = await loadSpellFromItems('polymorph-spell.txt');

        spellPart.name.should.equal('Polymorph');
        spellPart.level.should.equal(4);
        spellPart.school.should.equal(SpellSchool.Transmutation);
        spellPart.concentration.should.be.true;
        spellPart.ritual.should.be.false;
        spellPart.castTime.should.equal('1 action');
        spellPart.range.should.equal('60 feet');
        spellPart.components.should.equal('V, S, M (a caterpillar cocoon)');
        spellPart.duration.should.equal('Concentration, up to 1 hour');
        spellPart.info.should.have.lengthOf(5);

        spellPart.info[0].toString()
            .should.match(/^This spell transforms a creature/);
    });

    it('works for Alarm', async () => {
        const alarm = await loadSpellFromItems('alarm-spell.txt');

        alarm.name.should.equal('Alarm');
        alarm.level.should.equal(1);
        alarm.school.should.equal(SpellSchool.Abjuration);
        alarm.concentration.should.be.false;
        alarm.ritual.should.be.true;
        alarm.castTime.should.equal('1 minute');
        alarm.range.should.equal('30 feet');
        alarm.components.should.equal('V, S, M (a tiny bell and a piece of fine silver wire)');
        alarm.duration.should.equal('8 hours');
        alarm.info.should.have.lengthOf(3);

        alarm.info[0].toString()
            .should.match(/^You set an alarm against unwanted intrusion./);
    });
});
