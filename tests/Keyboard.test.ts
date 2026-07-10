import { expect, test } from "@jest/globals";
import { makeKeyboard, MAX_KEYBOARD_ROWS } from "../src/Util";

test("shared keyboard contract rejects more than six rows", () => {
    const rows = Array.from({ length: MAX_KEYBOARD_ROWS + 1 }, (_, index) => [
        { text: String(index), command: String(index) },
    ]);

    expect(() => makeKeyboard(rows)).toThrow("Keyboard cannot contain more than 6 rows");
});
