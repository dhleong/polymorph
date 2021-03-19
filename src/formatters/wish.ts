
import { IFormatter } from '../formatter';
import { StringPart } from '../parser';
import {
    Ability,
    AmmunitionType,
    ArmorType,
    BonusType,
    ICreaturePart,
    ICylinderSpellArea,
    IItemPart,
    IRadialSpellArea,
    IRectangularSpellArea,
    ISection,
    ISpellDice,
    ISpellPart,
    IStringPart,
    ITablePart,
    ItemKind,
    Part,
    PartType,
    Size,
    SpellAreaType,
    SpellAttackType,
    SpellSchool,
    WeaponType,
} from '../parser/interface';
import { isNumber } from '../parser/utils';

interface IWishSpellPart extends ISpellPart {
    id: string;
}

const spellAreaKeyword = {
    [SpellAreaType.Circle]: ':circle',
    [SpellAreaType.Cone]: ':cone',
    [SpellAreaType.Cube]: ':cube',
    [SpellAreaType.Cylinder]: ':cylinder',
    [SpellAreaType.Line]: ':line',
    [SpellAreaType.Sphere]: ':sphere',
    [SpellAreaType.Square]: ':square',
};

const spellSchoolKeyword = {
    [SpellSchool.Abjuration]: ':abj',
    [SpellSchool.Conjuration]: ':cnj',
    [SpellSchool.Divination]: ':div',
    [SpellSchool.Enchantment]: ':enc',
    [SpellSchool.Evocation]: ':evo',
    [SpellSchool.Illusion]: ':ill',
    [SpellSchool.Necromancy]: ':nec',
    [SpellSchool.Transmutation]: ':trx',
};

const abilityKeyword = {
    [Ability.Str]: ':str',
    [Ability.Dex]: ':dex',
    [Ability.Con]: ':con',
    [Ability.Int]: ':int',
    [Ability.Wis]: ':wis',
    [Ability.Cha]: ':cha',
};

export function maxDiceValue(dice): number {
    dice = dice.replace(/ /g, '');
    const parts = dice.split(/[+-]/);
    if (parts.length > 2) throw new Error(`Unexpected dice spec: ${dice}`);

    const [count, sides] = parts[0].split(/[dD]/);
    let max = parseInt(count, 10) * parseInt(sides, 10);

    if (parts.length > 1) {
        const mod = parseInt(parts[1], 10);
        if (dice.indexOf('+') !== -1) {
            max += mod;
        } else {
            max -= mod;
        }
    }
    return max;
}

export function nameToId(name: string): string {
    return name.toLowerCase()
        .trim()
        // .replace(/^ \/a-z/g, '')
        .replace(/[^a-z0-9+]+/g, '-')
        .replace('-+', '+');
}

function spellId(name: string): string {
    return 'spell/' + nameToId(name);
}

function splitDie(die: string): number[] {
    return die.split('d').map(it => parseInt(it, 10));
}

/**
 * Quote-ify a string
 */
function q(value: any) {
    return `"${value.toString().trim().replace(/"/, '\"')}"`;
}

function formatComponents(raw: string): string {
    if (!raw) return;

    let result = '';

    if (raw.startsWith('V')) {
        result += 'v';
    }

    if (raw.endsWith('S') || raw.indexOf('S,') !== -1) {
        result += 's';
    }

    if (result !== '') {
        result = ':' + result;
    }

    const materialStart = raw.indexOf('(');
    if (materialStart !== -1) {
        result = '[' + result + ' ';
        result += q(raw.substring(materialStart + 1, raw.lastIndexOf(')')));
        result += ']';
    }

    return result;
}

function formatRow(items: IStringPart[]) {
    let first = true;
    let str = '[';
    for (const header of items) {
        if (first) first = false;
        else str += ' ';

        str += formatInfo([header]);
    }
    str += ']';
    return str;
}

function formatPart(part: Part): string {
    switch (part.type) {
    case PartType.STRING:
        return part.toString();

    case PartType.TABLE:
        const table = part as ITablePart;
        let str = '{';

        let lastRowLength = -1;
        for (const headerRow of table.headers) {
            str += ':headers ' + formatRow(headerRow);
            lastRowLength = headerRow.length;

            // make room for :rows
            if (table.rows.length) {
                str += '\n ';
            }
            break;
        }

        if (table.rows.length) {
            str += ':rows [';

            let first = true;
            for (const row of table.rows) {
                if (first) first = false;
                else str += '\n        ';

                if (lastRowLength !== -1 && row.length !== lastRowLength) {
                    console.error('Dropping unbalanced table:', table.toJson());
                    return '';
                }
                lastRowLength = row.length;

                str += formatRow(row);
            }

            str += ']';
        }

        str += '}';
        return str;

    case PartType.ITEM:
        console.log('TODO: format item:', part);
        break;
    case PartType.CREATURE:
        console.log('TODO: format creature:', part);
        break;
    }

    return '';
}

/**
 * Formats a sequence of Parts as either a string or a vector
 */
export function formatInfo(
    info: Part[],
    variantInfo?: {[key: string]: string},
) {
    let allString = true;
    const formatted: [PartType, string][] = [];
    for (const p of info) {
        const partFormatted = formatPart(p);
        if (partFormatted === '') continue;

        if (p.type !== PartType.STRING) {
            allString = false;
        }

        formatted.push([p.type, partFormatted]);
    }

    if (variantInfo) {
        formatted.push([
            PartType.STRING,
            Object.keys(variantInfo).map(key =>
                `**${key}**: ${variantInfo[key]}`,
            ).join('\n'),
        ]);
    }

    if (allString) {
        return q(formatted.map(pair => pair[1]).join('\n'));
    }

    return formatted.reduce((result, [type, value]) => {
        const quotified = (type === PartType.STRING)
            ? q(value)
            : value;

        return result + '\n' + quotified;
    }, '[') + ']';
}

export function generateDiceFn(dice: ISpellDice, spellLevel: number): string {
    const plusStart = dice.base.indexOf('+');
    if (
        !(dice.slotLevelBuff || dice.charLevelBuff)
        && plusStart === -1
    ) {
        return q(dice.base);
    }

    let params = '';
    let parts = '';
    if (dice.slotLevelBuff) {
        params += 'spell-level ';
        const [dieCount, dieSize] = splitDie(dice.base);
        const [buffDieCount, buffDieSize] = splitDie(dice.slotLevelBuff);

        if (dieSize !== buffDieSize) {
            // mixed die sizes never happen normally, so this is
            // probably not actually a spell we need to show dice for
            // eg: arcane hand
            return;
        }

        if (!dieSize) {
            if (buffDieSize) {
                throw new Error('Dice mixed with fixed heal amount?');
            }

            // fixed amount (eg: Heal)
            parts += `(+ ${dice.base} (* ${dice.slotLevelBuff}`
                + ` (- spell-level ${spellLevel})`
                + `))`;

        } else {
            const totalDice = dieCount - spellLevel;
            if (totalDice === 0) {
                // can probably roll the above case into this
                parts += 'spell-level';
            } else if (buffDieCount === 1) {
                parts += `(+ ${totalDice} spell-level)`;
            } else {
                // eg circle of death
                parts += `(+ ${dieCount} (* ${buffDieCount} ` +
                    `(- spell-level ${spellLevel})))`;
            }
        }

        if (dieSize) {
            parts += ` "d${dieSize}"`;
        }
    } else if (dice.charLevelBuff) {

        params += 'total-level ';

        const [dieCount, dieSize] = splitDie(dice.base);
        const [buffDieCount, buffDieSize] = splitDie(dice.charLevelBuff);

        if (dieSize !== buffDieSize) {
            // mixed die sizes never happen normally, so this is
            // probably not actually a spell we need to show dice for
            // eg: arcane hand
            return;
        }

        parts += `(cond
    (< total-level 5) ${dieCount}
    (< total-level 11) ${dieCount + buffDieCount}
    (< total-level 17) ${dieCount + 2 * buffDieCount}
    :else ${dieCount + 3 * buffDieCount})
    "d${dieSize}"`;
    }

    if (!parts.length) {
        if (plusStart !== -1) {
            parts += q(dice.base.substring(0, plusStart).trimRight());
        } else {
            parts += q(dice.base);
        }
    }

    if (dice.base.includes('spellcasting ability')) {
        params += 'spell-mod ';
        parts += ' " + " spell-mod';
    }

    parts = parts.replace('" "', '');

    return `(fn [${params.trimRight()}]
    (str ${parts}))`;
}

/**
 * Formats spell data in a way that can be used
 * by WISH.
 */
export class WishSpellsFormatter implements IFormatter {

    private spells: {[key: string]: IWishSpellPart} = {};
    private lists: {[key: string]: string[]} = {};

    private currentHeader = '';
    private currentSpellList = '';

    constructor(
        readonly output: NodeJS.WriteStream,
    ) {}

    async format(section: ISection) {

        if (section.level === 1) {
            this.currentHeader = section.getHeader(false);
        }

        // prep to categorize by spell lists:
        if (this.currentHeader === 'Spell Lists') {
            const header = section.getHeader(false);
            if (header.endsWith(' Spells')) {
                this.currentSpellList = nameToId(
                    header.substring(0, header.indexOf(' ')),
                );
                this.lists[this.currentSpellList] = [];

            } else if (section.level === 5) {
                for (const part of section.parts) {
                    const name = (part as StringPart).str;
                    if (name.length) {
                        this.lists[this.currentSpellList].push(spellId(name));
                    }
                }
            }
        }

        for (const part of section.parts) {
            switch (part.type) {
            case PartType.SPELL:
                this.onSpell(part as ISpellPart);
                break;
            }
        }
    }

    onSpell(spell: ISpellPart) {
        if (!spell.name) {
            console.warn('No name for spell:', spell);
            return;
        }
        const id = spellId(spell.name);
        if (this.spells[id]) {
            throw new Error(`Duplicated spell id: ${id}`);
        }

        const s = spell as IWishSpellPart;
        s.id = id;
        this.spells[id] = s;
    }

    async end() {
        this.output.write(`;; Auto-generated using the Polymorph project

[:!add-to-list
 {:id :all-spells
  :type :5e/spell}

 [
`);

        for (const s of Object.values(this.spells)) {

            const comp = formatComponents(s.components);

            this.output.write(`
  {:spell-level ${s.level}
   :id :${s.id}
   :name ${q(s.name)}
   :time ${q(s.castTime)}
   :range ${q(s.range)}
   :duration ${q(s.duration)}
   :school ${spellSchoolKeyword[s.school]}
   :desc ${formatInfo(s.info)}`);

            // components?
            if (comp) this.writePart('comp', comp);
            if (s.ritual) this.writePart('rit?', 'true');
            if (s.concentration) this.writePart('con?', 'true');

            if (s.save) {
                this.writePart('save', abilityKeyword[s.save]);
            }

            if (s.area) {
                let part = '[' + spellAreaKeyword[s.area.type];

                switch (s.area.type) {
                    // cylinder
                    case SpellAreaType.Cylinder:
                        const cylinder = s.area as ICylinderSpellArea;
                        part += ` ${cylinder.radius}, ${cylinder.height}`;
                        break;

                    // radial:
                    case SpellAreaType.Circle:
                    case SpellAreaType.Sphere:
                    case SpellAreaType.Cone:
                        const radial = s.area as IRadialSpellArea;
                        part += ` ${radial.radius}`;
                        break;

                    // rectangular:
                    case SpellAreaType.Cube:
                    case SpellAreaType.Line:
                    case SpellAreaType.Square:
                        const rect = s.area as IRectangularSpellArea;
                        part += ` ${rect.length}, ${rect.width}`;
                        break;
                }

                part += ']';

                this.writePart('aoe', part);
            }

            if (s.dice) {
                if (s.dice.attackType !== null && s.dice.attackType !== undefined) {
                    this.writePart('attack', s.dice.attackType === SpellAttackType.Ranged
                        ? ':ranged'
                        : ':melee',
                    );
                }

                if (s.dice.damageType) {
                    this.writePart('damage', ':' + s.dice.damageType.toLowerCase());
                }

                const dice = generateDiceFn(s.dice, s.level);
                if (dice) this.writePart('dice', dice);
            }

            this.output.write(`
   }
`);
        }

        this.output.write(` ]\n]`);

        for (const listId of Object.keys(this.lists)) {
            this.output.write(`
[:!add-to-list

 {:id :${listId}/spells-list
  :type :5e/spell}

 [`);

            for (const theSpellId of this.lists[listId]) {
                this.output.write(`:${theSpellId}\n  `);
            }

            this.output.write(` ]\n]`);
        }

        console.log(`Exported ${Object.keys(this.spells).length} spells`);
    }

    private writePart(key: string, value: string) {
        this.output.write(`\n   :${key} ${value}`);
    }
}

const armorTypeKeyword = {
    [ArmorType.Padded]: ':padded',
    [ArmorType.Leather]: ':leather',
    [ArmorType.StuddedLeather]: ':studded',
    [ArmorType.Hide]: ':hide',
    [ArmorType.ChainShirt]: ':chain-shirt',
    [ArmorType.ScaleMail]: ':scale-mail',
    [ArmorType.Breastplate]: ':breastplate',
    [ArmorType.HalfPlate]: ':half-plate',
    [ArmorType.RingMail]: ':ring-mail',
    [ArmorType.ChainMail]: ':chain-mail',
    [ArmorType.Splint]: ':splint',
    [ArmorType.Plate]: ':plate',
    [ArmorType.Shield]: ':shield',
};

const armorTypeName = {
    [ArmorType.StuddedLeather]: 'Studded Leather',
    [ArmorType.ChainShirt]: 'Chain Shirt',
    [ArmorType.ScaleMail]: 'Scale Mail',
    [ArmorType.HalfPlate]: 'Half Plate',
    [ArmorType.RingMail]: 'Ring Mail',
    [ArmorType.ChainMail]: 'Chain Mail',
};

const weaponTypeMeta = {
    [WeaponType.Club]: {kind: ':club', category: ':simple'},
    [WeaponType.Dagger]: {kind: ':dagger', category: ':simple'},
    [WeaponType.Greatclub]: {kind: ':greatclub', category: ':simple'},
    [WeaponType.Handaxe]: {kind: ':handaxe', category: ':simple'},
    [WeaponType.Javelin]: {kind: ':javelin', category: ':simple'},
    [WeaponType.LightHammer]: {kind: ':light-hammer', category: ':simple'},
    [WeaponType.Mace]: {kind: ':mace', category: ':simple'},
    [WeaponType.Quarterstaff]: {kind: ':quarterstaff', category: ':simple'},
    [WeaponType.Sickle]: {kind: ':sickle', category: ':simple'},
    [WeaponType.Spear]: {kind: ':spear', category: ':simple'},
    [WeaponType.LightCrossbow]: {kind: ':light-crossbow', category: ':simple'},
    [WeaponType.Dart]: {kind: ':dart', category: ':simple'},
    [WeaponType.Shortbow]: {kind: ':shortbow', category: ':simple'},
    [WeaponType.Sling]: {kind: ':sling', category: ':simple'},
    [WeaponType.Battleaxe]: {kind: ':battleaxe', category: ':martial'},
    [WeaponType.Flail]: {kind: ':flail', category: ':martial'},
    [WeaponType.Glaive]: {kind: ':glaive', category: ':martial'},
    [WeaponType.Greataxe]: {kind: ':greataxe', category: ':martial'},
    [WeaponType.Greatsword]: {kind: ':greatsword', category: ':martial'},
    [WeaponType.Halberd]: {kind: ':halberd', category: ':martial'},
    [WeaponType.Lance]: {kind: ':lance', category: ':martial'},
    [WeaponType.Longsword]: {kind: ':longsword', category: ':martial'},
    [WeaponType.Maul]: {kind: ':maul', category: ':martial'},
    [WeaponType.Morningstar]: {kind: ':morningstar', category: ':martial'},
    [WeaponType.Pike]: {kind: ':pike', category: ':martial'},
    [WeaponType.Rapier]: {kind: ':rapier', category: ':martial'},
    [WeaponType.Scimitar]: {kind: ':scimitar', category: ':martial'},
    [WeaponType.Shortsword]: {kind: ':shortsword', category: ':martial'},
    [WeaponType.Trident]: {kind: ':trident', category: ':martial'},
    [WeaponType.WarPick]: {kind: ':warpick', category: ':martial'},
    [WeaponType.Warhammer]: {kind: ':warhammer', category: ':martial'},
    [WeaponType.Whip]: {kind: ':whip', category: ':martial'},
    [WeaponType.Blowgun]: {kind: ':blowgun', category: ':martial'},
    [WeaponType.HandCrossbow]: {kind: ':hand-crossbow', category: ':martial'},
    [WeaponType.HeavyCrossbow]: {kind: ':heavy-crossbow', category: ':martial'},
    [WeaponType.Longbow]: {kind: ':longbow', category: ':martial'},
    [WeaponType.Net]: {kind: ':net', category: ':martial'},
};

const weaponTypeName = {
    [WeaponType.LightHammer]: 'Light Hammer',
    [WeaponType.LightCrossbow]: 'Light Crossbow',
    [WeaponType.WarPick]: 'War Pick',
    [WeaponType.HandCrossbow]: 'Hand Crossbow',
    [WeaponType.HeavyCrossbow]: 'Heavy Crossbow',
};

function stringifyItemKind(item: IItemPart) {
    const kind = item.kind;
    switch (kind) {
    case ItemKind.Ammunition:
        return 'ammunition';
    case ItemKind.Armor:
        return 'armor';
    case ItemKind.Gear:
        return 'gear';
    case ItemKind.MeleeWeapon:
    case ItemKind.RangedWeapon:
        return 'weapon';
    case ItemKind.Potion:
        return 'potion';
    case ItemKind.Wondrous:
        // NOTE: "wondrous" is not very useful for WISH
        for (const p of item.info) {
            if (p.type !== PartType.STRING) continue;
            const str = (p as StringPart).str;
            if (str.match(/\b[wW]ear/)) {
                // if we can wear it, it's gear
                return 'gear';
            }
        }
        return 'other';
    }
}

const bonusPaths = {
    [BonusType.AbilityChecks]: ':buffs :checks',
    [BonusType.AC]: ':buffs :ac',
    [BonusType.SavingThrows]: ':buffs :saves',
    [BonusType.SpellAttackRolls]: ':buffs :spell-atk',
};

// public for testing
export function weaponOpts(item: IItemPart, type: WeaponType) {
    // NOTE: stuff like dice, damage type, versatile-ness
    // will be filled in by Wish
    const weaponName = weaponTypeName[type] || WeaponType[type];
    return {
        name: item.name.toLowerCase().match(/sword|axe|weapon/)
            ? item.name.replace(
                /([sS]word|[aA]xe|[wW]eapon)/,
                weaponName,
            )
            : item.name + ' ' + weaponName,

        ...weaponTypeMeta[type],
    };
}

export class WishItemsFormatter implements IFormatter {

    private itemGroups: IItemPart[] = [];
    private potions: IItemPart[] = [];
    private written = 0;

    constructor(
        readonly output: NodeJS.WriteStream,
    ) {
        output.write(`
[:!declare-items
 {}
`);
    }

    async format(section: ISection) {
        for (const p of section.parts) {
            if (p.type !== PartType.ITEM) continue;

            this.onItem(p as IItemPart);
        }
    }

    async end() {
        this.output.write(`
 ]`);

        // potions group
        this.writeGroup({
            type: ':potion',
        }, this.potions.map(p => [p, {}]));

        for (const item of this.itemGroups) {
            if (item.armorTypes) {
                this.writeArmorGroup(item);
            } else if (item.weaponTypes) {
                this.writeWeaponGroup(item);
            } else if (item.kind === ItemKind.Ammunition) {
                this.writeAmmunitionGroup(item);
            }
        }

        console.log(`Exported ${this.written} items`);
    }

    private onItem(item: IItemPart) {
        if (item.name.includes(' or +3')) {
            // special case for generic magic items
            const baseName = item.name.substring(0, item.name.indexOf(','));

            for (let bonus = 1; bonus <= 3; ++bonus) {
                this.onItem({
                    ...item,
                    name: `${baseName} +${bonus}`,

                    bonuses: [
                        {type: BonusType.AttackRolls, value: bonus},
                        {type: BonusType.DamageRolls, value: bonus},
                    ],
                });
            }

            return;
        }

        if (
            item.kind === ItemKind.Ammunition
                && item.name.includes('Ammunition')
        ) {
            // there's only one, so this is pretty safe
            this.itemGroups.push(item);
            return;
        }

        if (item.armorTypes && item.armorTypes.length > 1) {
            this.itemGroups.push(item);
            return;
        } else if (item.armorTypes) {
            // with a single armor type, we don't need the prefix
            const opts = this.armorOpts(item.armorTypes[0]);
            delete opts.prefix;

            this.writeItem(item, opts);
            return;
        }

        if (item.weaponTypes && item.weaponTypes.length > 1) {
            this.itemGroups.push(item);
            return;
        } else if (item.weaponTypes) {
            // similar to above; for single-type weapons,
            // don't change the name
            const opts = weaponOpts(item, item.weaponTypes[0]);
            delete opts.name;

            this.writeItem(item, opts);
            return;
        }

        if (item.kind === ItemKind.Potion) {
            // group these together
            this.potions.push(item);
            return;
        }

        // just do the normal thing
        this.writeItem(item, {});
    }

    private armorOpts(type: ArmorType) {
        return {
            kind: armorTypeKeyword[type],
            prefix: armorTypeName[type] || ArmorType[type],
        };
    }

    private writeAmmunitionGroup(item: IItemPart) {
        this.writeItemGroup(item, {
            desc: formatInfo(item.info),
            type: ':ammunition',
        }, Object.keys(AmmunitionType)
            .filter(type => !isNumber(type))
            .map(type => {
                const t = AmmunitionType[type];
                return {
                    'name': item.name.replace('Ammunition', type),

                    'default-amount': t === AmmunitionType.BlowgunNeedles
                        ? 50
                        : 20,
                };
            }));
    }

    private writeArmorGroup(item: IItemPart) {
        this.writeItemGroup(item, {
            desc: formatInfo(item.info),
            type: ':armor',
        }, item.armorTypes.map(this.armorOpts.bind(this)));
    }

    private writeWeaponGroup(item: IItemPart) {
        this.writeItemGroup(item, {
            desc: formatInfo(item.info),
            type: ':weapon',
        }, item.weaponTypes.map(weaponOpts.bind(weaponOpts, item)));
    }

    private writeItemGroup(item: IItemPart, header, options) {
        // auto extract some shared props
        if (item.attunes) {
            header['attunes?'] = 'true';
        }

        this.writeGroup(header, options.map(o => [item, o]));
    }

    private writeGroup(header, itemOptionPairs) {

        this.output.write(`

[:!declare-items
`);
        this.writeEdn(header);

        for (const [item, o] of itemOptionPairs) {
            this.writeItem(item, {
                noAttunes: !!header['attunes?'],

                noDesc: !!header.desc,
                noType: !!header.type,

                ...o,
            });
        }

        this.output.write(`]
`);
    }

    private writeEdn(edn, indent = 1) {
        for (let i = 0; i < indent; ++i) {
            this.output.write(' ');
        }

        let first = true;
        this.output.write('{');
        for (const k of Object.keys(edn)) {
            if (first) {
                this.writePart(k, edn[k], '');
            } else {
                this.writePart(k, edn[k]);
            }
            first = false;
        }
        this.output.write('}\n');
    }

    private writeItem(item: IItemPart, options) {
        if (item.variants) {
            // write each variant
            for (const v of item.variants) {
                const varied = {
                    ...item,
                    ...v,
                    variants: undefined,
                };
                this.writeItem(varied, {
                    ...options,

                    variantInfo: v.extraInfo,
                });
            }
            return;
        }

        ++this.written;

        let name = item.name;
        if (options.name) name = options.name;
        if (options.prefix) name = options.prefix + ' ' + name;

        options.name = q(name);
        options.id = `:${nameToId(name)}`;

        if (!options.noType) {
            options.type = ':' + stringifyItemKind(item);
        }

        if (!options.noDesc) {
            options.desc = formatInfo(item.info, options.variantInfo);
        }
        delete options.variantInfo;

        if (!options.noAttunes && item.attunes) {
            options['attunes?'] = 'true';
        }

        const directives = [];
        for (const b of item.bonuses || []) {
            const path = bonusPaths[b.type];
            if (path && !b.conditions) {
                directives.push(`[:!provide-attr [${path} ${options.id}] ${b.value}]`);
            } else if (!path && !b.conditions) {
                options['+'] = b.value;
            }

            // TODO weapon type-specific bonuses, eg: bracers of archery
        }

        for (const u of item.uses || []) {
            let label = name;
            if (u.label) label += `: ${u.label}`;

            const id = nameToId(label) + '#uses';
            let uses = u.charges;
            if (!isNumber(uses)) {
                // convert from dice to max number
                uses = maxDiceValue(uses);
            }

            let restoreAmount = u.regains;
            if (!restoreAmount && restoreAmount !== 0) {
                // restore all
                restoreAmount = uses;
            } else if (!isNumber(restoreAmount)) {
                // it's a dice roll
                const restoreDice = restoreAmount;
                restoreAmount = '' + maxDiceValue(restoreDice);
                restoreAmount += `\n        :restore-dice ${q(restoreDice)}`;
            }

            // NOTE: these all seem to be "at dawn" so :long-rest
            // may not technically be correct....
            directives.push(`[:!add-limited-use
       {:id :${id}
        :name ${q(label)}
        :uses ${uses}
        :restore-trigger :long-rest
        :restore-amount ${restoreAmount}}]`);
        }

        if (directives.length) {
            options['!'] = `[${directives.join('\n      ')}]`;
        }

        delete options.noType;
        delete options.noDesc;
        delete options.noAttunes;
        delete options.prefix;
        this.writeEdn(options);
    }

    private writePart(key: string, value: string, prefix = '\n  ') {
        this.output.write(`${prefix}:${key} ${value}`);
    }
}

function creatureAndNameToId(creatureName: string, featureName: string) {
    return ':creatures-' + nameToId(creatureName) + '/' + nameToId(featureName);
}

function formatCreatureFeatureDefault(
    creatureName: string,
    name: string,
    text: string,
) {
    const id = creatureAndNameToId(creatureName, name);
    return `
        (provide-feature
          {:id ${id}
           :name ${q(name)}
           :desc ${q(text)}})`;
}

function formatCreatureAttack(
    creatureName: string,
    name: string,
    text: string,
) {
    const id = creatureAndNameToId(creatureName, name);

    let s = `
        (provide-attr
          [:attacks ${id}]
          {:id ${id}
           :name ${q(name)}
           :desc ${q(text)}`

    const toHitMatch = text.match(/(-?[0-9]+) to hit/i);
    if (toHitMatch) {
        s += `
           :to-hit ${parseInt(toHitMatch[0], 10)}`;
    }

    return s + '})';
}

function formatCreatureFeature(creatureName: string, info: IStringPart) {
    const s = formatPart(info);
    if (!s.trim().length) {
        return;
    }

    const m = s.match(/^\*\*([^*]+)\*\*(.*)$/);
    if (!m || m.length < 2) return;

    const name = m[1].replace(/\.[ ]+$/, '');
    const text = m[2];

    if (name === 'Actions') {
        return;
    }

    if (name === 'Multiattack' || text.includes('Attack')) {
        return formatCreatureAttack(creatureName, name, text);
    }

    return formatCreatureFeatureDefault(creatureName, name, text);
}

export class WishCreaturesFormatter {

    private written = 0;

    constructor(
        readonly output: NodeJS.WritableStream,
    ) {
        output.write(`;; Auto-generated using the Polymorph project

(declare-list
  {:id :all-creatures
   :type :5e/creature}

`);
    }

    public async format(section: ISection) {
        for (const p of section.parts) {
            if (p.type !== PartType.CREATURE) continue;

            this.onCreature(p as ICreaturePart);
        }
    }

    async end() {
        this.output.write(')');
        console.log(`Exported ${this.written} items`);
    }

    private onCreature(p: ICreaturePart) {
        if (!p.abilities) {
            console.log('No abilities for ', p.name, '; skipping');
            return;
        }

        let abilities = '';
        for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
            abilities += ` :${ability} ${p.abilities[ability]}`;
        }

        this.output.write(`
  {:id :${nameToId(p.name)}
   :name ${q(p.name)}
   :ac ${p.ac}
   :challenge ${p.cr}
   :hit-points ${q(p.hpRoll.replace(/[()]/g, ''))}
   :abilities {${abilities.trim()}}
   :senses ${q(p.senses)}
   :size :${Size[p.size].toLowerCase()}
   :type :${nameToId(p.kind)}
   :speed ${q(p.speed)}`);

        const features = p.info
            .map(line => formatCreatureFeature(p.name, line))
            .filter(it => it != null);
        if (features.length) {
            this.output.write('\n   :! (on-state');

            for (const feature of features) {
                this.output.write(feature);
            }

            this.output.write(')');
        }

        this.output.write('}');
        ++this.written;
    }
}
