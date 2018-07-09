
import { IFormatter } from '../formatter';
import { StringPart } from '../parser';
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
        .replace(/^ \/a-z/g, '')
        .replace(/[^a-z]+/g, '-');
}

function spellId(name: string): string {
    return 'spells/' + nameToId(name);
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

        console.log(this.lists);

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
}
