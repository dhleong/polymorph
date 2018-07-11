import {
    ArmorType,
    IItemPart,
    ISection,
    IStringPart,
    ItemKind,
    ItemRarity,
    Part,
    PartType,
} from './interface';

function rarityFromString(str: string) {
    const justRarity = str.replace(/ (.*)$/, '');
    switch (justRarity) {
    case 'common':
        return ItemRarity.Common;
    case 'uncommon':
        return ItemRarity.Uncommon;
    case 'rare':
        return ItemRarity.Rare;
    case 'very rare':
        return ItemRarity.VeryRare;
    case 'legendary':
        return ItemRarity.Legendary;
    }
}

export class ItemPart implements IItemPart {
    static from(
        nameSection: ISection,
        bodySection: ISection,
    ): ItemPart {
        const name = (nameSection.parts[0] as IStringPart).str;
        if (!name) {
            console.warn(JSON.stringify(nameSection, null, ' '));
            console.warn(JSON.stringify(bodySection, null, ' '));
            return;
        }

        const meta = (bodySection.parts.shift() as IStringPart).str.toLowerCase();
        const info = bodySection.parts;

        const [kindRaw, rarityRaw] = meta.split(/, +/);
        if (!rarityRaw) {
            throw new Error(`No rarity part for ${name}: ${meta}`);
        }
        const attunes = rarityRaw.includes('attunement');

        let kind = ItemKind.Gear;
        if (kindRaw.includes('wondrous')) {
            kind = ItemKind.Wondrous;
        } else if (
            kindRaw.includes('ammunition')
            || kindRaw.includes('arrow')
        ) {
            kind = ItemKind.Ammunition;
        } else if (kindRaw.includes('weapon')) {
            kind = ItemKind.MeleeWeapon;
        }
        // FIXME all the things

        const armorType: ArmorType = undefined; // TODO

        return new ItemPart(
            name,
            kind,
            kindRaw,
            rarityFromString(rarityRaw),
            info,
            armorType,
            attunes,
        );
    }

    type = PartType.ITEM;

    constructor(
        readonly name: string,
        readonly kind: ItemKind,
        readonly kindRaw: string,
        readonly rarity: ItemRarity,
        readonly info: Part[],
        readonly armorType?: ArmorType,
        readonly attunes?: boolean,
    ) {}

    postProcess() { /* nop */ }

    toJson() {
        return Object.assign({}, this);
    }
}
