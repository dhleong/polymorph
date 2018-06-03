
export interface IStringPart {
    str: string;
}

export interface ITablePart {
    headers: IStringPart[][];
    rows: IStringPart[][];
}

// union type of all part kinds
export type Part = IStringPart | ITablePart;

export interface ISection {
    level: number;
    parts: Part[];
}
