import * as chai from 'chai';
import { WishCreaturesFormatter } from '../../src/formatters/wish';
import { Section } from '../../src/parser';
import { CreaturePart } from '../../src/parser/creature-part';

import { loadJsonSections } from '../test-utils';
import { WriteableString } from '../writeable-string';

chai.should();

function withHeader(s: string) {
    return `;; Auto-generated using the Polymorph project

(declare-list
  {:id :all-creatures
   :type :5e/creature}


  ${s.trim()})
    `.trim();
}

describe('Creature formatting', () => {

    let output: WriteableString;
    let formatter: WishCreaturesFormatter;

    async function format(creature: CreaturePart) {
        const s = new Section(0);
        s.parts.push(creature);
        await formatter.format(s);
        await formatter.end();
        return output.toString();
    }

    beforeEach(() => {
        output = new WriteableString();
        formatter = new WishCreaturesFormatter(output);
    });

    describe('of features', () => {
        it('Handles weapon attacks', async () => {
            const part = await loadJsonSections(
                'ape.raw.json', /* canHaveTables =*/false,
            ).then(CreaturePart.from);

            (await format(part)).should.equal(withHeader(`
  {:id :creatures/ape
   :name "Ape"
   :ac 12
   :challenge 0.5
   :hit-points "3d8 + 6"
   :abilities {:str 16 :dex 14 :con 14 :int 6 :wis 12 :cha 7}
   :senses "passive Perception 13"
   :size :medium
   :type :beast
   :speed "30 ft., climb 30 ft."
   :! (on-state
        (provide-attr
          [:attacks :creatures-ape/multiattack]
          {:id :creatures-ape/multiattack
           :name "Multiattack"
           :desc "The ape makes two fist attacks."})
        (provide-attr
          [:attacks :creatures-ape/fist]
          {:id :creatures-ape/fist
           :name "Fist"
           :desc "_Melee Weapon Attack: _+5 to hit, reach 5 ft., one target. _Hit: _6 (1d6 + 3) bludgeoning damage."
           :damage :bludgeoning
           :dice "1d6+3"
           :to-hit 5})
        (provide-attr
          [:attacks :creatures-ape/rock]
          {:id :creatures-ape/rock
           :name "Rock"
           :desc "_Ranged Weapon Attack: _+5 to hit, range 25/50 ft., one target. _Hit: _6 (1d6 + 3) bludgeoning damage."
           :damage :bludgeoning
           :dice "1d6+3"
           :to-hit 5}))}
            `));
        });

        it('Handles attacks with multiple paragraphs', async () => {
            const part = await loadJsonSections(
                'water-elemental.raw.json', /* canHaveTables =*/false,
            ).then(CreaturePart.from);

            (await format(part)).should.contain(`
        (provide-feature
          {:id :creatures-water-elemental/whelm
           :name "Whelm (Recharge 4–6)"
           :desc "Each creature in the elemental’s space must make a DC 15 Strength saving throw. On a failure, a target takes 13 (2d8 + 4) bludgeoning damage. If it is Large or smaller, it is also grappled (escape DC 14). Until this grapple ends, the target is restrained and unable to breathe unless it can breathe water. If the saving throw is successful, the target is pushed out of the elemental’s space
            `.trim());
        });
    });
});
