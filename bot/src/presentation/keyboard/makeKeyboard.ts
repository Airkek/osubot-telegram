import { IKeyboard } from "presentation/keyboard/IKeyboard";
import { IKeyboardRow } from "presentation/keyboard/IKeyboardRow";
import {
    MAX_KEYBOARD_BUTTONS,
    MAX_KEYBOARD_BUTTONS_PER_ROW,
    MAX_KEYBOARD_ROWS,
} from "presentation/keyboard/KeyboardLimits";

export function validateKeyboard(rows: readonly IKeyboardRow[]): void {
    if (rows.length > MAX_KEYBOARD_ROWS) {
        throw new RangeError(`Keyboard cannot contain more than ${MAX_KEYBOARD_ROWS} rows`);
    }
    if (rows.some((row) => row.length > MAX_KEYBOARD_BUTTONS_PER_ROW)) {
        throw new RangeError(`Keyboard row cannot contain more than ${MAX_KEYBOARD_BUTTONS_PER_ROW} buttons`);
    }
    const buttonCount = rows.reduce((count, row) => count + row.length, 0);
    if (buttonCount > MAX_KEYBOARD_BUTTONS) {
        throw new RangeError(`Keyboard cannot contain more than ${MAX_KEYBOARD_BUTTONS} buttons`);
    }
}

export function makeKeyboard(rows: readonly IKeyboardRow[]): IKeyboard {
    validateKeyboard(rows);
    return rows as IKeyboard;
}
