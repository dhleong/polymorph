
export enum PartType {
    STRING,
    TABLE,
}

export interface IPart {
    type: PartType;
    toJson(): any;
}

export interface IStringPart extends IPart {
    str: string;
}

export interface ITablePart extends IPart {
    headers: IStringPart[][];
    rows: IStringPart[][];
}

// union type of all part kinds
export type Part = IStringPart | ITablePart;

export interface ISection {
    level: number;
    parts: Part[];
}
