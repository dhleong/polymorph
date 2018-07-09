
import { StringPart } from '../parser';
import {
    ISection, ISpellPart, IStringPart,
    Part, PartType,
    SpellSchool,
} from './interface';

export class SpellPart implements ISpellPart {
    static from(
        nameSection: ISection,
        bodySection: ISection,
    ): SpellPart {
        const name = (nameSection.parts[0] as IStringPart).str;
        const firstPart = bodySection.parts[0] as IStringPart;
        const fmts = firstPart.formatting;

        let levelAndSchool = '';
        let level: number = 0;
        if (fmts.length > 0) {
            levelAndSchool = firstPart.get(fmts[0]).toLowerCase();
            level = levelAndSchool.includes('cantrip')
                ? 0
                : parseInt(levelAndSchool[0], 10);
        }

        let school: SpellSchool;
        for (const schoolName in SpellSchool) {
            if (typeof(SpellSchool[schoolName]) !== 'number') continue;

            if (levelAndSchool.indexOf(schoolName.toLowerCase()) !== -1) {
                // we've verified this is a valid cast above, but
                // typescript isn't having it unless we trick it
                school = (SpellSchool[schoolName] as any) as SpellSchool;
                break;
            }
        }
        const ritual: boolean = levelAndSchool.indexOf('ritual') !== -1;

        let info: Part[];
        let castTime = '';
        let components = '';
        let range = '';
        let duration = '';
        let concentration = false;

        // NOTE: skip the first part; we looked at it above
        for (let i = 1; i < bodySection.parts.length; ++i) {
            const part = bodySection.parts[i];
            const map = (part as IStringPart).toMapBySpans();
            if (map['Casting Time']) {
                castTime = map['Casting Time'];
            } else if (map.Components) {
                components = map.Components;
            } else if (map.Range) {
                range = map.Range;
            } else if (map.Duration) {
                duration = map.Duration;
                if (duration.indexOf('Concentration') !== -1) {
                    concentration = true;
                }
            } else {
                // must've started the info
                info = bodySection.parts.slice(i)
                    .filter(it =>
                        !(it instanceof StringPart)
                        || it.str !== '',
                    );
                break;
            }
        }

        return new SpellPart(
            name,
            level,
            school,
            concentration,
            ritual,
            castTime,
            range,
            components,
            duration,
            info,
        );
    }

    type = PartType.SPELL;

    constructor(
        readonly name: string,
        readonly level: number,
        readonly school: SpellSchool,
        readonly concentration: boolean,
        readonly ritual: boolean,
        readonly castTime: string,
        readonly range: string,
        readonly components: string,
        readonly duration: string,
        readonly info: Part[],
    ) {}

    postProcess() {
        /* nop */
    }

    toJson() {
        return Object.assign({}, this);
    }
}
