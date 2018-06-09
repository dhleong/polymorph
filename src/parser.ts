import { fs } from 'mz';

import { DepthTracker } from './depth-tracker';
import { CreaturePart } from './parser/creature-part';
import { ISection } from './parser/interface';
import { Part, Section } from './parser/section';
import { SpellPart } from './parser/spell-part';
import { StringPart } from './parser/string-part';
import { TablePart } from './parser/table-part';
import { TABLE_HEADER_FONT_NAME } from './parser/utils';
import { ITextItem, processPdf } from './pdf';

// re-export as appropriate:
export { Part, Section, SpellPart, StringPart, TablePart };
export { FormatSpan, Formatting } from './parser/interface';

const SKIPPED_FONT_NAMES = new Set([
    'g_font_error',
]);

export function isCreatureHeader(header: string): boolean {
    return header.startsWith('Appendix MM-A')
        || header.startsWith('Appendix MM-B')
        || header.startsWith('Monsters (');
}

export class Parser {

    private headerLevels = new DepthTracker();

    private sections: Section[] = [];
    private currentSection: Section;

    private topmostHeader = '';

    async parse(data: Buffer): Promise<ISection[]> {
        await processPdf(data, (page, content) =>
            this.processPage(this.skipFooters(content.items)),
        );

        this.postProcess();

        return this.sections;
    }

    processPage(content: ITextItem[]) {
        for (const item of content) {
            if (SKIPPED_FONT_NAMES.has(item.fontName)) {
                if (item.str.length) {
                    throw new Error('Expected error fonts to be blank');
                }
                continue;
            }

            // this will store it at an appropriate place in the headerLevels list
            this.headerLevels.feed(item.height);

            if ((!this.currentSection || this.currentSection.headerLevelValue !== item.height)
                    && !this.shouldMergeTable(item)) {
                const newSection = new Section(item.height);
                if (isCreatureHeader(this.topmostHeader)) {
                    newSection.canHaveTables = false;
                }

                this.currentSection = newSection;
                this.sections.push(newSection);
            }

            this.currentSection.push(item);

            // NOTE: recalculate each time, because a subsequent push()
            // might amend the header
            const estimatedLevel = this.headerLevels.pickLevelFor(item.height);
            if (estimatedLevel <= 1) {
                const header = this.currentSection.getHeader();
                if (header) {
                    this.topmostHeader = header;
                }
            }
        }
    }

    postProcess() {
        let currentHeader = '';
        let currentCreature: Section[] = [];
        for (let i = 0; i < this.sections.length; ++i) {
            const section = this.sections[i];
            section.postProcess();

            section.level = this.headerLevels.pickLevelFor(section.headerLevelValue);

            if (section.level <= 1) {
                currentHeader = section.getHeader();
            }

            if (currentHeader === 'Spell Descriptions'
                && section.level === 5
            ) {
                this.consolidateSpell(i);
                --i;
            }

            const b: number = 2;
            const c: number = 3;
            if (b === c) {
            // if (isCreatureHeader(currentHeader)) {
                // TODO monster categories, like *Angels*

                if (section.level <= 3) {
                    const creaturePart = CreaturePart.from(currentCreature);
                    if (creaturePart) {
                        const firstCreatureSection = currentCreature[0];
                        this.sections.splice(
                            i, 0,
                            Section.fromSectionPart(
                                firstCreatureSection,
                                creaturePart,
                            ),
                        );
                    } else {
                        // restore unparsed parts
                        this.sections.splice(
                            i, 0, ...currentCreature,
                        );
                        i += currentCreature.length;
                    }

                    currentCreature = [];
                }

                if (section.level >= 3) {
                    currentCreature.push(section);
                    this.sections.splice(i, 1);
                    --i;
                }
            }
        }
    }

    private shouldMergeTable(item: ITextItem): boolean {
        if (!this.currentSection) return false;

        const parts = this.currentSection.parts;
        if (!parts.length) return false;

        const lastPart = parts[parts.length - 1];
        if (!(lastPart instanceof TablePart)) return false;

        if (item.fontName !== TABLE_HEADER_FONT_NAME) {
            // if it's not a table header, allow it if its height
            // is *at least* that of the table headers.
            // In practice, the heights should be the same...
            return item.height >= lastPart.lastHeight;
        } else {
            return !lastPart.rows.length;
        }
    }

    private skipFooters(items: ITextItem[]) {
        // is this safe to hard-code?
        const footersOffset = 10;
        return items.slice(footersOffset);
    }

    private consolidateSpell(atIndex: number) {
        const nameI = atIndex - 1;
        const bodySection = this.sections[atIndex];
        const nameSection = this.sections[nameI];

        const spellSection = Section.fromSectionPart(nameSection, SpellPart.from(
            nameSection,
            bodySection,
        ));

        this.sections.splice(nameI, 2, spellSection);
    }
}

export async function parseFile(file: string): Promise<ISection[]> {
    const parser = new Parser();
    const data = await fs.readFile(file);
    return parser.parse(data);
}
