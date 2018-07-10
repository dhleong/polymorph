import * as chai from 'chai';

import { SpellPart } from '../../src/parser';
import { Ability, ISpellPart, SpellAttackType, SpellSchool } from '../../src/parser/interface';

import { loadTextItems, parsePage } from '../test-utils';

chai.should();

async function loadSpellFromItems(fileName: string): Promise<ISpellPart> {
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

    it('works for Contagion', async () => {
        const sp = await loadSpellFromItems('contagion-spell.txt');

        sp.name.should.equal('Contagion');
        sp.level.should.equal(5);
        sp.school.should.equal(SpellSchool.Necromancy);
        sp.concentration.should.be.false;
        sp.ritual.should.be.false;
        sp.castTime.should.equal('1 action');
        sp.range.should.equal('Touch');
        sp.components.should.equal('V, S');
        sp.duration.should.equal('7 days');
        sp.info.should.not.be.empty;

        sp.info[0].toString()
            .should.match(/^Your touch inflicts disease./);
    });

    it('guesses damage dice', async () => {
        const fireball = await loadSpellFromItems('fireball-spell.txt');

        fireball.name.should.equal('Fireball');
        fireball.level.should.equal(3);
        fireball.dice.base.should.equal('8d6');
        fireball.dice.slotLevelBuff.should.equal('1d6');
        fireball.dice.damageType.should.equal('fire');
        fireball.dice.save.should.equal(Ability.Dex);
    });

    it('handles scaling cantrips and spell attacks', async () => {
        const fireball = await loadSpellFromItems('firebolt-spell.txt');

        fireball.name.should.equal('Fire Bolt');
        fireball.level.should.equal(0);
        fireball.dice.base.should.equal('1d10');
        fireball.dice.charLevelBuff.should.equal('1d10');
        fireball.dice.damageType.should.equal('fire');
        fireball.dice.attackType.should.equal(SpellAttackType.Ranged);
    });

    it('handles constant damage bonuses', async () => {
        const sp = await loadSpellFromItems('disintegrate-spell.txt');

        sp.name.should.equal('Disintegrate');
        sp.level.should.equal(6);
        sp.dice.base.should.equal('10d6 + 40');
        sp.dice.slotLevelBuff.should.equal('3d6');
        sp.dice.damageType.should.equal('force');
        sp.dice.save.should.equal(Ability.Dex);
    });

    it('handles healing spells with bonuses', async () => {
        const word = await loadSpellFromItems('healing-word-spell.txt');

        word.name.should.equal('Healing Word');
        word.level.should.equal(1);
        word.dice.base.should.equal('1d4 + your spellcasting ability modifier');
        word.dice.slotLevelBuff.should.equal('1d4');
        word.dice.should.not.have.property('damageType');
        word.dice.should.not.have.property('attackType');
    });

    it('handles constant value healing spells', async () => {
        const word = await loadSpellFromItems('heal-spell.txt');

        word.name.should.equal('Heal');
        word.level.should.equal(6);
        word.dice.base.should.equal('70');
        word.dice.slotLevelBuff.should.equal('10');
        word.dice.should.not.have.property('damageType');
        word.dice.should.not.have.property('attackType');
    });
});
