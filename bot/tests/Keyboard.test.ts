import { expect, test } from "@jest/globals";
import { makeKeyboard } from "../src/presentation/keyboard/makeKeyboard";
import {
    MAX_KEYBOARD_BUTTONS,
    MAX_KEYBOARD_BUTTONS_PER_ROW,
    MAX_KEYBOARD_ROWS,
} from "../src/presentation/keyboard/KeyboardLimits";

test("shared keyboard contract rejects more than six rows", () => {
    const rows = Array.from({ length: MAX_KEYBOARD_ROWS + 1 }, (_, index) => [
        { text: String(index), command: String(index) },
    ]);

    expect(() => makeKeyboard(rows)).toThrow("Keyboard cannot contain more than 6 rows");
});

test("shared keyboard contract rejects more than five buttons in a row", () => {
    const row = Array.from({ length: MAX_KEYBOARD_BUTTONS_PER_ROW + 1 }, (_, index) => ({
        text: String(index),
        command: String(index),
    }));

    expect(() => makeKeyboard([row])).toThrow("Keyboard row cannot contain more than 5 buttons");
});

test("shared keyboard contract rejects more than ten buttons in total", () => {
    const buttons = Array.from({ length: MAX_KEYBOARD_BUTTONS + 1 }, (_, index) => ({
        text: String(index),
        command: String(index),
    }));
    const rows = Array.from({ length: 6 }, (_, index) => buttons.slice(index * 2, index * 2 + 2));

    expect(() => makeKeyboard(rows)).toThrow("Keyboard cannot contain more than 10 buttons");
});

test("shared keyboard contract accepts exactly ten buttons", () => {
    const row = Array.from({ length: MAX_KEYBOARD_BUTTONS_PER_ROW }, (_, index) => ({
        text: String(index),
        command: String(index),
    }));

    expect(() => makeKeyboard([row, row])).not.toThrow();
});
