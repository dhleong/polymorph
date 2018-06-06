import { fs } from 'mz';

import { DepthTracker } from './depth-tracker';
import { ISection } from './parser/interface';
import { Part, Section } from './parser/section';
import { StringPart } from './parser/string-part';
import { TablePart } from './parser/table-part';
import { TABLE_HEADER_FONT_NAME } from './parser/utils';
import { ITextItem, processPdf } from './pdf';

// re-export as appropriate:
export { Part, TablePart, Section, StringPart };

const SKIPPED_FONT_NAMES = new Set([
    'g_font_error',
]);

export class Parser {

    private headerLevels = new DepthTracker();

    private sections: Section[] = [];
    private currentSection: Section;

    async parse(data: Buffer): Promise<ISection[]> {
        await processPdf(data, (page, content) =>
            this.processPage(this.skipFooters(content.items)),
        );

        for (const section of this.sections) {
            section.postProcess();

            section.level = this.headerLevels.pickLevelFor(section.headerLevelValue);
        }

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
                this.currentSection = newSection;
                this.sections.push(newSection);
            }

            this.currentSection.push(item);
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
}

export async function parseFile(file: string): Promise<ISection[]> {
    const parser = new Parser();
    const data = await fs.readFile(file);
    return parser.parse(data);
}
