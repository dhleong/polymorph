
import { IFormatter } from '../formatter';
import { StringPart } from '../parser';
import {
    Ability,
    ArmorType,
    IItemPart,
    ISection,
    ISpellDice,
    ISpellPart,
    ItemKind,
    Part,
    PartType,
    SpellAttackType,
    SpellSchool,
} from '../parser/interface';

interface IWishSpellPart extends ISpellPart {
    id: string;
}

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

function nameToId(name: string): string {
    return name.toLowerCase()
        .replace(/^ \/a-z/g, '')
        .replace(/[^a-z]+/g, '-');
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

function stringifyInfo(info: Part[]): string {
    return info.map(it => it.toString()).join('\n');
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
        this.output.write(`
[:!add-to-list
 {:id :all-spells
  :type :5e/spell}

 [
`);

        for (const s of Object.values(this.spells)) {

            const desc = stringifyInfo(s.info);
            const comp = formatComponents(s.components);

            this.output.write(`
  {:spell-level ${s.level}
   :id :${s.id}
   :name ${q(s.name)}
   :time ${q(s.castTime)}
   :range ${q(s.range)}
   :duration ${q(s.duration)}
   :school ${spellSchoolKeyword[s.school]}
   :desc ${q(desc)}`);

            // components?
            if (comp) this.writePart('comp', comp);
            if (s.ritual) this.writePart('rit?', 'true');
            if (s.concentration) this.writePart('con?', 'true');

            if (s.save) {
                this.writePart('save', abilityKeyword[s.save]);
            }

            if (s.dice) {
                if (s.dice.attackType) {
                    this.writePart('attack', s.dice.attackType === SpellAttackType.Ranged
                        ? ':ranged'
                        : ':melee',
                    );
                }

                if (s.dice.damageType) {
                    this.writePart('dam-type', ':' + s.dice.damageType.toLowerCase());
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
};

function stringifyItemKind(kind: ItemKind) {
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
        return 'wondrous';
    }
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
            }
        }

        console.log(`Exported ${this.written} items`);
    }

    private onItem(item: IItemPart) {
        if (item.name.includes('or +3')) {
            // TODO handle these like armorTypes below
            console.log('TODO handle "+1, +2, or +3" items');
            return;
        }

        if (item.armorTypes && item.armorTypes.length > 1) {
            this.itemGroups.push(item);
            return;
        } else if (item.armorTypes) {
            const opts = this.armorOpts(item.armorTypes[0]);
            if (
                item.armorTypes[0] === ArmorType.Shield
                    && item.name.includes('Shield')
            ) {
                delete opts.prefix;
            }

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
        // TODO ac values
        return {
            kind: armorTypeKeyword[type],
            prefix: ArmorType[type],
        };
    }

    private writeArmorGroup(item: IItemPart) {
        this.writeItemGroup(item, {
            desc: q(stringifyInfo(item.info)),
            type: ':armor',
        }, item.armorTypes.map(this.armorOpts.bind(this)));
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
        ++this.written;

        let name = item.name;
        if (options.prefix) name = options.prefix + ' ' + name;

        options.id = `:${nameToId(name)}`;
        options.name = q(name);

        if (!options.noType) {
            options.type = ':' + stringifyItemKind(item.kind);
        }

        if (!options.noDesc) {
            options.desc = q(stringifyInfo(item.info));
        }

        if (!options.noAttunes && item.attunes) {
            options['attunes?'] = 'true';
        }

        // if (options.kind) this.writePart('kind', options.kind);
        // this.output.write(`}`);

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
