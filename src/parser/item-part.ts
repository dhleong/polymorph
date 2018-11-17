import titleCase = require('title-case');

import {
    ArmorType,
    axeWeaponTypes,
    BonusType,
    heavyArmorTypes,
    IBonus,
    IItemPart,
    IItemUse,
    IItemVariant,
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
import { TablePart } from './table-part';
import { isNumber, stringIsOnlyWhitespace } from './utils';

function rarityFromString(str: string) {
    const justRarity = str.replace(/ (.*)$/, '').toLowerCase();
    switch (justRarity) {
    case 'common':
        return ItemRarity.Common;
    case 'uncommon':
        return ItemRarity.Uncommon;
    case 'rare':
        return ItemRarity.Rare;
    case 'very':
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

function extractUses(info: Part[]): IItemUse[] {
    const results: IItemUse[] = [];

    for (const p of info) {
        if (p.type !== PartType.STRING) continue;
        const sp = p as IStringPart;
        const str = sp.str;

        let use: IItemUse = {charges: 0};
        let extendingPrevious = false;

        const chargesMatch = str.match(/has ([^c]+) (charges|cards)/);
        if (chargesMatch) {
            use.charges = chargesMatch[1]
                .replace('–', '-');
            if (isNumber(use.charges)) {
                use.charges = parseInt(use.charges, 10);
                if (chargesMatch[2] !== 'charges') {
                    // may be hacks...
                    use.regains = 0;
                }
            }
        }

        // v/be used again until the next/norm dd
        if (str.match(/be used again until the next dawn/)) {
            if (use.charges === 0) {
                use.charges = 1;
            }

            if (sp.formatting.length && sp.formatting[0].start === 0) {
                use.label = sp.get(sp.formatting[0])
                    .replace(/\.[ ]*$/, '');
            }
        }

        // v/expended charges.*dawn/norm dd
        const regainedMatch = str.match(/([0-9dD]+) expended charges.*dawn/);
        if (regainedMatch) {
            if (use.charges === 0 && results.length) {
                // this was in a separate paragraph after the
                // initial description of max uses, eg:
                // Mace of Terror
                use = results[results.length - 1];
                extendingPrevious = true;
            }

            use.regains = regainedMatch[1];
        }

        if (!extendingPrevious && use.charges !== 0) {
            results.push(use);
        }
    }

    if (results.length) {
        return results;
    }
}

interface IVariantNameStrategy {
    nameFrom(partialName: string): string;
}

class PlaceholderVariantNameStrategy implements IVariantNameStrategy {

    constructor(
        private readonly format: string,
        private readonly placeholder: string = '...',
    ) {}

    nameFrom(partialName: string): string {
        return this.format.replace(this.placeholder, partialName);
    }
}

function pickNameStrategy(part: IStringPart): IVariantNameStrategy | undefined {
    const s = part.toJson() as string;
    if (s.includes('...')) {
        return new PlaceholderVariantNameStrategy(s);
    }

    // TODO eg: potion of giant strength
}

export function extractVariants(table: TablePart) {
    const variants: IItemVariant[] = [];
    const headers = table.headers[table.headers.length - 1];
    const nameStrategy = pickNameStrategy(headers[0]);
    if (!nameStrategy) return;

    const rarityColumn = headers.findIndex((part) => {
        return part.toJson() === 'Rarity';
    });

    for (const row of table.rows) {
        const partialName = titleCase(row[0].toJson());
        const name = nameStrategy.nameFrom(partialName);
        const variant: IItemVariant = { name };

        if (rarityColumn !== -1) {
            variant.rarity = rarityFromString(row[rarityColumn].toJson());
        }

        // compute suffix
        for (let i = 1; i < headers.length; ++i) {
            if (i === rarityColumn) continue;
            if (!row[i]) break;

            const header = headers[i].toJson() as string;
            if (!header || stringIsOnlyWhitespace(header)) continue;

            const value = row[i].toJson() as string;
            if (!value || stringIsOnlyWhitespace(value)) continue;

            if (!variant.extraInfo) variant.extraInfo = {};
            variant.extraInfo[header] = value;
        }

        variants.push(variant);
    }

    if (variants.length) {
        return variants;
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

        let variants: IItemVariant[] | undefined;
        if (info.length) {
            const table = info.find(part => part instanceof TablePart);

            if (table instanceof TablePart) {
                info.pop(); // remove it from the info

                variants = extractVariants(table);
            }
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
            extractUses(info),
            variants,
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
        readonly uses?: IItemUse[],
        readonly variants?: IItemVariant[],
    ) {}

    postProcess() { /* nop */ }

    toJson() {
        return Object.assign({}, this);
    }
}
