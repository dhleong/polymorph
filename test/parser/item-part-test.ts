import * as chai from 'chai';

import {
    ArmorType,
    BonusType,
    IItemPart,
    ItemKind,
    ItemRarity,
    swordWeaponTypes,
} from '../../src/parser/interface';
import { loadTextItems, pageParserOf } from '../test-utils';

chai.should();

async function loadItemFromItems(fileName: string): Promise<IItemPart> {
    const items = await loadTextItems(fileName);
    const parser = pageParserOf(items);

    // NOTE: sections[0] is the "Item Name" section

    // return ItemPart.from(sections[1], sections[2]);
    return (parser as any).consolidateItem(2);
}

describe('ItemPart parsing', () => {
    it('works for Cloak of Protection', async () => {
        const item = await loadItemFromItems('cloak-of-protection-item.txt');

        item.name.should.equal('Cloak of Protection');
        item.kind.should.equal(ItemKind.Wondrous);
        item.rarity.should.equal(ItemRarity.Uncommon);
        item.attunes.should.be.true;

        item.info.toString().should.match(/^You gain a \+1/);
        item.bonuses.should.deep.equal([
            {
                type: BonusType.AC,
                value: 1,
            },
            {
                type: BonusType.SavingThrows,
                value: 1,
            },
        ]);
    });

    it('extracts bonuses for Bracers of Defense', async () => {
        const item = await loadItemFromItems('bracers-defense-item.txt');

        item.name.should.equal('Bracers of Defense');
        item.kind.should.equal(ItemKind.Wondrous);
        item.rarity.should.equal(ItemRarity.Rare);
        item.attunes.should.be.true;

        item.info.toString().should.match(/^While wearing/);
        item.bonuses.should.deep.equal([
            {
                type: BonusType.AC,
                value: 2,
            },
        ]);
    });

    it('extracts armor types', async () => {
        const item = await loadItemFromItems('adamantine-armor-item.txt');

        item.name.should.equal('Adamantine Armor');
        item.kind.should.equal(ItemKind.Armor);
        item.rarity.should.equal(ItemRarity.Uncommon);
        item.attunes.should.be.false;
        item.armorTypes.should.deep.equal([
            ArmorType.ChainShirt,
            ArmorType.ScaleMail,
            ArmorType.Breastplate,
            ArmorType.HalfPlate,

            ArmorType.RingMail,
            ArmorType.ChainMail,
            ArmorType.Splint,
            ArmorType.Plate,
        ]);
    });

    it('extracts weapon types', async () => {
        const item = await loadItemFromItems('flame-tongue-item.txt');

        item.name.should.equal('Flame Tongue');
        item.kind.should.equal(ItemKind.MeleeWeapon);
        item.rarity.should.equal(ItemRarity.Rare);
        item.attunes.should.be.true;

        item.weaponTypes.should.deep.equal(swordWeaponTypes);
    });

    it('extracts limited uses from Luck Blade', async () => {
        const item = await loadItemFromItems('luck-blade-item.txt');

        item.name.should.equal('Luck Blade');
        item.kind.should.equal(ItemKind.MeleeWeapon);
        item.rarity.should.equal(ItemRarity.Legendary);
        item.attunes.should.be.true;

        item.weaponTypes.should.deep.equal(swordWeaponTypes);

        item.uses.should.deep.equal([
            {label: 'Luck', charges: 1},
            {label: 'Wish', charges: '1d4 - 1'},
        ]);
    });

    it('extracts limited uses from Mace of Terror', async () => {
        const item = await loadItemFromItems('mace-of-terror-item.txt');

        item.name.should.equal('Mace of Terror');
        item.kind.should.equal(ItemKind.MeleeWeapon);
        item.rarity.should.equal(ItemRarity.Rare);
        item.attunes.should.be.true;

        item.uses.should.deep.equal([
            {charges: 3, regains: '1d3'},
        ]);
    });

    it('extracts non-restoring uses from Deck of Illusions', async () => {
        const item = await loadItemFromItems('deck-illusions.txt');

        item.name.should.equal('Deck of Illusions');
        item.kind.should.equal(ItemKind.Wondrous);
        item.rarity.should.equal(ItemRarity.Uncommon);
        item.attunes.should.be.false;

        item.uses.should.deep.equal([
            {charges: 34, regains: 0},
        ]);
    });

    it('extracts varieties of healing potion', async () => {
        const item = await loadItemFromItems('potion-of-healing-item.txt');

        item.name.should.equal('Potion of Healing');
        item.kind.should.equal(ItemKind.Potion);
        item.should.have.property('rarity').that.is.undefined;
        item.attunes.should.be.false;

        item.info.should.have.lengthOf(2);
        item.variants.should.deep.equal([
            {
                extraInfo: {
                    'HP Regained': '2d4 + 2',
                },
                name: 'Potion of Healing',
                rarity: ItemRarity.Common,
            },

            {
                extraInfo: {
                    'HP Regained': '4d4 + 4',
                },
                name: 'Potion of Greater Healing',
                rarity: ItemRarity.Uncommon,
            },

            {
                extraInfo: {
                    'HP Regained': '8d4 + 8',
                },
                name: 'Potion of Superior Healing',
                rarity: ItemRarity.Rare,
            },

            {
                extraInfo: {
                    'HP Regained': '10d4 + 20',
                },
                name: 'Potion of Supreme Healing',
                rarity: ItemRarity.VeryRare,
            },
        ]);
    });

    it.skip('extracts varieties of giant strength potion', async () => {
        const item = await loadItemFromItems('potion-giant-strength-item.txt');

        item.name.should.equal('Potion of Giant Strength');
        item.kind.should.equal(ItemKind.Potion);
        item.should.have.property('rarity').that.is.undefined;
        item.attunes.should.be.false;

        // TODO
    });
});
