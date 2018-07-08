
import { IFormatter } from '../formatter';
import {
    ISection,
    ISpellPart,
    Part,
    PartType,
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

function nameToId(name: string): string {
    return name.toLowerCase()
        .replace(/^ \/a-z/, '')
        .replace(/[^a-z]+/, '-');
}

/**
 * Quote-ify a string
 */
function q(value: any) {
    return `"${value.toString().replace(/"/, '\"')}"`;
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
    return info.toString(); // FIXME
}

/**
 * Formats item and spell data in a way that can be used
 * by WISH.
 */
export class WishFormatter implements IFormatter {

    private spells: {[key: string]: IWishSpellPart} = {};

    constructor(
        readonly output: NodeJS.WriteStream,
    ) {}

    async format(section: ISection) {
        // if (section.getHeader(fals
        // TODO categorize by spell lists?

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
        const id = nameToId(spell.name);
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
 {:id :all-spells-list
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
   :range ${q(s.range)}`);

            if (comp) {
                this.output.write(`
   :comp ${comp}`);
            }

            this.output.write(`
   :duration ${q(s.duration)}
   :school ${spellSchoolKeyword[s.school]}
   :desc ${q(desc)}
   }
`);

            // TODO :dice calculation
            // TODO :rit? and :con? tags
            // TODO :attack ?
            // TODO :damage ?
        }

        this.output.write(` ]\n]`);

        console.log(`Exported ${Object.keys(this.spells).length} spells`);
    }
}
