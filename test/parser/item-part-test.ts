import * as chai from 'chai';

import { ItemPart } from '../../src/parser';
import {
    ArmorType,
    BonusType,
    IItemPart,
    ItemKind,
    ItemRarity,
    swordWeaponTypes,
} from '../../src/parser/interface';
import { loadTextItems, parsePage } from '../test-utils';

chai.should();

async function loadItemFromItems(fileName: string): Promise<IItemPart> {
    const items = await loadTextItems(fileName);
    const sections = parsePage(items);

    // NOTE: sections[0] is the "Item Name" section

    return ItemPart.from(sections[1], sections[2]);
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
});
