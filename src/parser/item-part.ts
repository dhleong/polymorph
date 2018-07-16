import {
    ArmorType,
    axeWeaponTypes,
    BonusType,
    heavyArmorTypes,
    IBonus,
    IItemPart,
    ISection,
    IStringPart,
    ItemKind,
    ItemRarity,
    lightArmorTypes,
    mediumArmorTypes,
    Part,
    PartType,
    slashingWeaponTypes,
    swordWeaponTypes,
    WeaponType,
} from './interface';

function isNumber(n) {
    return !isNaN(parseInt(n, 10));
}

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
    const [includeStr, excludeStr] = str.split('but not');
    const results = [];
    const includeAll = str.includes('all');

    for (const k of Object.keys(ArmorType)) {
        if (isNumber(k)) continue;

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
        if (isNumber(k)) continue;

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

function extractWeaponTypes(str: string): WeaponType[] {
    str = str.toLowerCase();

    if (str.includes('(any sword that deals slashing damage)')) {
        return slashingWeaponTypes;
    }

    let results: WeaponType[] = [];

    if (str.includes('(any)')) {
        for (const k of Object.keys(WeaponType)) {
            if (isNumber(k)) continue;
            results.push(WeaponType[k]);
        }
        return results;
    }

    if (str.match(/any.*sword/)) {
        results = results.concat(swordWeaponTypes);
    }

    if (str.match(/any.*axe/)) {
        results = results.concat(axeWeaponTypes);
    }

    for (const k of Object.keys(WeaponType)) {
        if (!isNumber(k)) continue;

        if (str.includes(k.toLowerCase())) {
            results.push(WeaponType[k]);
        }
    }

    if (results.length) {
        return results;
    }
}

const bonusSearches: Array<[BonusType, RegExp]> = [
    [BonusType.AC, /AC/],
    [BonusType.DamageRolls, /damage rolls/],
    [BonusType.AttackRolls, /^attack rolls/],
    [BonusType.AbilityChecks, /ability checks/],
    [BonusType.SpellAttackRolls, /spell attack rolls/],
    [BonusType.SavingThrows, /saving throws/],
];

function extractBonuses(info: Part[]): IBonus[] {
    const results: IBonus[] = [];

    for (const p of info) {
        if (p.type !== PartType.STRING) continue;
        const str = (p as IStringPart).str;

        // omitting Y is intentional to simplify the match
        // since it could be Y or y.
        const m = str.match(/ou gain a \+(\d+) bonus to ([^.]+)\./);
        if (!m) continue;

        const [, bonus, to] = m;
        if (!to) continue;

        let conditions: string;
        const withStart = to.lastIndexOf('with');
        if (withStart !== -1 && !to.includes('this')) {
            conditions = to.substring(withStart + 'with '.length);
        } else {
            const againstStart = to.lastIndexOf('against');
            if (againstStart !== -1) {
                conditions = to.substring(againstStart + 'against '.length);
            }
        }

        for (const [type, matcher] of bonusSearches) {
            if (to.match(matcher)) {
                const v: IBonus = {
                    type,
                    value: parseInt(bonus, 10),
                };

                if (conditions) {
                    v.conditions = conditions;
                }

                results.push(v);
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

        const [, kindRaw, rarityRaw] = meta.match(/^(.*?(?:\([^)]+\))?), (.*)$/);
        if (!rarityRaw) {
            throw new Error(`No rarity part for ${name}: ${meta}`);
        }
        const attunes = rarityRaw.includes('attunement');

        let armorTypes: ArmorType[];
        let weaponTypes: WeaponType[];
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
            weaponTypes = extractWeaponTypes(kindRaw);
        } else if (kindRaw.includes('potion')) {
            kind = ItemKind.Potion;
        } else if (kindRaw.includes('armor')) {
            kind = ItemKind.Armor;
            armorTypes = extractArmorTypes(kindRaw);
        }

        // TODO charges ?

        return new ItemPart(
            name,
            kind,
            kindRaw,
            rarityFromString(rarityRaw),
            info,
            armorTypes,
            weaponTypes,
            attunes,
            extractBonuses(info),
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
        readonly weaponTypes?: WeaponType[],
        readonly attunes?: boolean,
        readonly bonuses?: IBonus[],
    ) {}

    postProcess() { /* nop */ }

    toJson() {
        return Object.assign({}, this);
    }
}
