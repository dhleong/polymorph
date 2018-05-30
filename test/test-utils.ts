
import { TABLE_HEADER_FONT_NAME } from '../src/parser';
import { ITextItem } from '../src/pdf';

export function textItem(obj: any): ITextItem {
    return {
        dir: 'rtl',
        fontName: obj.tableHeader
            ? TABLE_HEADER_FONT_NAME
            : 'base',
        height: 40.0,
        transform: [],
        width: 20.0,

        ...obj,
    };
}
