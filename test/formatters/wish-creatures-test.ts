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
  {:id :ape
   :name "Ape"
   :ac 12
   :challenge 0.5
   :hit-points "3d8 + 6)"
   :abilities {:str 16 :dex 14 :con 14 :int 6 :wis 12 :cha 7}
   :senses "passive Perception 13"
   :size :medium
   :type :beast
   :speed "30 ft., climb 30 ft."
   :info ["**Actions**" "**Multiattack. **The ape makes two fist attacks." "**Fist. **_Melee Weapon Attack: _+5 to hit, reach 5 ft., one target. _Hit: _6 (1d6 + 3) bludgeoning damage." "**Rock. **_Ranged Weapon Attack: _+5 to hit, range 25/50 ft., one target. _Hit: _6 (1d6 + 3) bludgeoning damage."]}
            `));
        });
    });
});
