import {
    ArmorType,
    heavyArmorTypes,
    IItemPart,
    ISection,
    IStringPart,
    ItemKind,
    ItemRarity,
    lightArmorTypes,
    mediumArmorTypes,
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

function extractArmorTypes(str: string): ArmorType[] {
    console.log('extract armor types from', str);

    const [includeStr, excludeStr] = str.split('but not');
    const results = [];
    const includeAll = str.includes('all');

    for (const k of Object.keys(ArmorType)) {
        if (parseInt(k, 10)) continue;

        if (includeAll || includeStr.includes(k.toLowerCase())) {
            results.push(ArmorType[k]);
        }
    }

    if (str.includes('light')) {
        for (const t of lightArmorTypes) {
            results.push(t);
        }
    }

    if (str.includes('medium')) {
        for (const t of mediumArmorTypes) {
            results.push(t);
        }
    }

    if (str.includes('heavy')) {
        for (const t of heavyArmorTypes) {
            results.push(t);
        }
    }

    for (const k of Object.keys(ArmorType)) {
        if (parseInt(k, 10)) continue;

        if (excludeStr && excludeStr.includes(k.toLowerCase())) {
            const idx = results.indexOf(ArmorType[k]);
            if (idx !== -1) {
                results.splice(idx, 1);
            }
        }
    }

    if (results.length) {
        return results;
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

        // const [kindRaw, rarityRaw] = meta.split(/, +/);
        const [, kindRaw, rarityRaw] = meta.match(/^(.*?(?:\([^)]+\))?), (.*)$/);
        if (!rarityRaw) {
            throw new Error(`No rarity part for ${name}: ${meta}`);
        }
        const attunes = rarityRaw.includes('attunement');

        let armorTypes: ArmorType[];
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
        } else if (kindRaw.includes('potion')) {
            kind = ItemKind.Potion;
        } else if (kindRaw.includes('armor')) {
            kind = ItemKind.Armor;
            armorTypes = extractArmorTypes(kindRaw);
        }
        // FIXME all the things

        // TODO charges

        return new ItemPart(
            name,
            kind,
            kindRaw,
            rarityFromString(rarityRaw),
            info,
            armorTypes,
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
        readonly armorTypes?: ArmorType[],
        readonly attunes?: boolean,
    ) {}

    postProcess() { /* nop */ }

    toJson() {
        return Object.assign({}, this);
    }
}
