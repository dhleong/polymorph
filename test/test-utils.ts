
import { Parser, Section, TABLE_HEADER_FONT_NAME } from '../src/parser';
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
