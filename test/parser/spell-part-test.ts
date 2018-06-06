import * as chai from 'chai';

import { Section, SpellPart, StringPart } from '../../src/parser';
import { FormatSpan, Formatting } from '../../src/parser/interface';

chai.should();

const formattingByStr = {
    b: Formatting.Bold,
    bi: Formatting.BoldItalic,
    i: Formatting.Italic,
};

describe('SpellPart parsing', () => {
    /* tslint:disable */
    const spellNameSection = new Section(3);
    spellNameSection.parts.push(new StringPart('Polymorph'));
    spellNameSection.parts.push(new StringPart(''));

    const firstBody = new StringPart(
        '4th-level transmutation Casting Time: 1 action Range: 60 feet Components: V, S, M (a caterpillar cocoon) Duration: Concentration, up to 1 hour This spell transforms a creature that you can see within range into a new form. An unwilling creature must make a Wisdom saving throw to avoid the effect. The spell has no effect on a shapechanger or a creature with 0 hit points.'
    );
    firstBody.formatting = [
        {
            style: 'i',
            start: 0,
            length: 23,
        },
        {
            style: 'b',
            start: 24,
            length: 13,
        },
        {
            style: 'b',
            start: 47,
            length: 6,
        },
        {
            style: 'b',
            start: 62,
            length: 11,
        },
        {
            style: 'b',
            start: 105,
            length: 9,
        },
    ].map(json => new FormatSpan(
        formattingByStr[json.style],
        json.start,
        json.length,
    ));

    const spellBodySection = new Section(5);
    spellBodySection.parts.push(firstBody);
    spellBodySection.parts.push(new StringPart(
            'The transformation lasts for the duration, or until the target drops to 0 hit points or dies. The new form can be any beast whose challenge rating is equal to or less than the target’s (or the target’s level, if it doesn’t have a challenge rating). The target’s game statistics, including mental ability scores, are replaced by the statistics of the chosen beast. It retains its alignment and personality.',
    ));
    spellBodySection.parts.push(new StringPart(
            'The target assumes the hit points of its new form. When it reverts to its normal form, the creature returns to the number of hit points it had before it transformed. If it reverts as a result of dropping to 0 hit points, any excess damage carries over to its normal form. As long as the excess damage doesn’t reduce the creature’s normal form to 0 hit points, it isn’t knocked unconscious.',
    ));
    spellBodySection.parts.push(new StringPart(
            'The creature is limited in the actions it can perform by the nature of its new form, and it can’t speak, cast spells, or take any other action that requires hands or speech.',
    ));
    spellBodySection.parts.push(new StringPart(
            'The target’s gear melds into the new form. The creature can’t activate, use, wield, or otherwise benefit from any of its equipment.',
    ));
    /* tslint:enable */

    const spellPart = SpellPart.from(
        spellNameSection,
        spellBodySection,
    );

    it('extracts name', () => {
        spellPart.name.should.equal('Polymorph');
    });
});
