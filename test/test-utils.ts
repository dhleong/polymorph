
import { Parser, Section, TablePart } from '../src/parser';
import { TABLE_HEADER_FONT_NAME } from '../src/parser/utils';

import { ITextItem } from '../src/pdf';

export function parsePage(items: any[]): Section[] {
    const parser = new Parser();
    parser.processPage(items.map(raw => textItem(raw)));
    // console.log(
    //     items.map(raw => textItem(raw)),
    // );

    const sections = parser['sections'] as Section[]; // tslint:disable-line
    sections.forEach(s => s.postProcess());
    return sections;
}

/**
 * Parse the given items and assert tha they belong to
 * a single Table in a single Section
 */
export function tableSection(items: any[]): TablePart {
    const sections = parsePage(items);
    sections.should.have.lengthOf(1, JSON.stringify(items));

    const section = sections[0];
    section.parts.should.have.lengthOf(1);

    return section.parts[0] as TablePart;
}

export function textItem(obj: any): ITextItem {
    return {
        dir: 'rtl',
        fontName: obj.tableHeader
            ? TABLE_HEADER_FONT_NAME
            : 'g_d0_f2',
        height: 40.0,
        transform: [],
        width: 20.0,

        ...obj,
    };
}
