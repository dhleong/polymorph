
import {
    ISection, ISpellPart, IStringPart,
    PartType,
} from './interface';

export class SpellPart implements ISpellPart {
    static from(
        nameSection: ISection,
        bodySection: ISection,
    ): SpellPart {
        const name = (nameSection.parts[0] as IStringPart).str;

        return new SpellPart(name);
    }

    type = PartType.SPELL;

    constructor(
        readonly name: string,
    ) {}

    postProcess() {
        /* nop */
    }

    toJson() {
        return this;
    }
}
