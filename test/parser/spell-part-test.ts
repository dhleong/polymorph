import * as chai from 'chai';

const expect = chai.expect;

import { consolidate, SpellPart } from '../../src/parser';
import { Ability, ISpellPart, SpellAreaType, SpellAttackType, SpellSchool } from '../../src/parser/interface';

import { extractAreaOfEffect, extractSave } from '../../src/parser/spell-part';
import { loadTextItems, parsePage } from '../test-utils';

chai.should();

async function loadSpellFromItems(fileName: string): Promise<ISpellPart> {
    const items = await loadTextItems(fileName);
    const sections = parsePage(items);

    // NOTE: sections[0] is the "Spell Descriptions" section

    return consolidate(
        sections,
        2,
        SpellPart.from,
    );
}

describe('SpellPart save extraction', () => {
    it('works for Blindness/Deafness', () => {
        // tslint:disable-next-line
        extractSave('You can blind or deafen a foe. Choose one creature that you can see within range to make a Constitution saving throw. If it fails, the target is either blinded or deafened (your choice) for the duration. At the end of each of its turns, the target can make a Constitution saving throw. On a success, the spell ends.')
        .should.equal(Ability.Con);
    });

    it('works for Hold Person', () => {
        // tslint:disable-next-line
        extractSave('Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. At the end of each of its turns, the target can make another Wisdom saving throw. On a success, the spell ends on the target.')
        .should.equal(Ability.Wis);
    });

    it('works for Zone of Truth', () => {
        // tslint:disable-next-line
        extractSave('You create a magical zone that guards against deception in a 15-foot-radius sphere centered on a point of your choice within range. Until the spell ends, a creature that enters the spell’s area for the first time on a turn or starts its turn there must make a Charisma saving throw. On a failed save, a creature can’t speak a deliberate lie while in the radius. You know whether each creature succeeds or fails on its saving throw.')
        .should.equal(Ability.Cha);
    });
});

describe('SpellPart area extraction', () => {
    it('handles circles', () => {
        // tslint:disable-next-line
        extractAreaOfEffect('For the duration, an intense tremor rips through the ground in a 100-foot-radius circle centered on that point and shakes creatures and structures in contact with the ground in that area')
        .should.deep.equal({
            type: SpellAreaType.Circle,

            radius: 100,
        });
    });

    it('handles cones', () => {
        // tslint:disable-next-line
        extractAreaOfEffect('Each creature in a 60-foot cone must make a Dexterity saving throw')
        .should.deep.equal({
            type: SpellAreaType.Cone,

            radius: 60,
        });
    });

    it('handles cube', () => {
        // tslint:disable-next-line
        extractAreaOfEffect('You create a twisting pattern of colors that weaves through the air inside a 30-foot cube within range')
        .should.deep.equal({
            type: SpellAreaType.Cube,

            length: 30,
            width: 30,
        });
    });

    it('handles cylinders', () => {
        // tslint:disable-next-line
        extractAreaOfEffect('This spell reverses gravity in a 50-foot-radius, 100-foot high cylinder centered on a point within range')
        .should.deep.equal({
            type: SpellAreaType.Cylinder,

            height: 100,
            radius: 50,
        });
    });

    it('handles lines', () => {
        // tslint:disable-next-line
        extractAreaOfEffect('A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you in a direction you choose')
        .should.deep.equal({
            type: SpellAreaType.Line,

            length: 100,
            width: 5,
        });

        // tslint:disable-next-line
        extractAreaOfEffect('A line of strong wind 60 feet long and 10 feet wide blasts from you in a direction you choose for the spell’s duration')
        .should.deep.equal({
            type: SpellAreaType.Line,

            length: 60,
            width: 10,
        });
    });

    it('handles sphere', () => {
        // tslint:disable-next-line
        extractAreaOfEffect('A swirling cloud of smoke shot through with white-hot embers appears in a 20-foot-radius sphere centered on a point within range')
        .should.deep.equal({
            type: SpellAreaType.Sphere,

            radius: 20,
        });
    });

    it('handles square', () => {
        // tslint:disable-next-line
        extractAreaOfEffect('Slick grease covers the ground in a 10-foot square centered on a point within range and turns it into difficult terrain for the duration.')
        .should.deep.equal({
            type: SpellAreaType.Square,

            length: 10,
            width: 10,
        });
    });
});

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

    it('works for Hellish Rebuke', async () => {
        const sp = await loadSpellFromItems('hellish-rebuke-spell.txt');

        sp.name.should.equal('Hellish Rebuke');
        sp.level.should.equal(1);
        sp.school.should.equal(SpellSchool.Evocation);
        sp.concentration.should.be.false;
        sp.ritual.should.be.false;
        sp.castTime.should.equal(
            '1 reaction, which you take in response to being' +
            ' damaged by a creature within 60 feet of you that you can see',
        );
        sp.range.should.equal('60 feet');
        sp.components.should.equal('V, S');
        sp.duration.should.equal('Instantaneous');
        sp.info.should.not.be.empty;

        sp.info[0].toString()
            .should.match(/^You point your finger/);
    });

    it('guesses damage dice', async () => {
        const fireball = await loadSpellFromItems('fireball-spell.txt');

        fireball.name.should.equal('Fireball');
        fireball.level.should.equal(3);
        fireball.dice.base.should.equal('8d6');
        fireball.dice.slotLevelBuff.should.equal('1d6');
        fireball.dice.damageType.should.equal('fire');
        fireball.save.should.equal(Ability.Dex);
        fireball.area.should.deep.equal({
            type: SpellAreaType.Sphere,

            radius: 20,
        });
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
        sp.save.should.equal(Ability.Dex);
        expect(sp.area).to.be.undefined;
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

    it('handles attributes split across columns', async () => {
        const sp = await loadSpellFromItems('protection-from-poison-spell.txt');

        sp.name.should.equal('Protection from Poison');
        sp.range.should.equal('Touch');
        sp.components.should.equal('V, S');
        sp.duration.should.equal('1 hour');
        sp.info[0].toJson().should.have.string('You touch a creature.');
    });

    it('handles tables in the middle of a spell description', async () => {
        const sp = await loadSpellFromItems('animate-objects-spell.txt');

        JSON.stringify(sp.info).should.contain(
            'If you command an object to attack',
        );
    });
});
