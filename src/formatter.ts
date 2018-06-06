
import { ISection } from './parser/interface';

export interface IFormatter {

    format(section: ISection): Promise<void>;

    /**
     * Called when there are no more sections to format.
     * It is not your responsibility to close `output`,
     * however; this is merely lifecycle callback in case
     * the implementation does not output immediately when
     * `format()` is called.
     */
    end(): Promise<void>;
}
