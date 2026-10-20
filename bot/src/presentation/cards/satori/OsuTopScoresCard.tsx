import type { CSSProperties } from "react";
import { ITopScoresCardModel } from "presentation/cards/satori/ITopScoresCardModel";
import { ITopScoresCardRow } from "presentation/cards/satori/ITopScoresCardRow";

/*
 * Список топ-скоров для satori → resvg. Ширина 1000, высота считается по числу
 * строк. Ограничения те же: только flex, инлайн-стили, display: flex у каждого
 * div с более чем одним ребёнком.
 */

const FONT = "Torus, Mulish, NotoSansSC";

export const ROW_HEIGHT = 86;
export const HEADER_HEIGHT = 92;
export const CARD_PADDING = 26;

const P = {
    base: "#18121d",
    text: "#f6f1f8",
    muted: "#b9adc2",
    dim: "#7d7286",
    pink: "#ff66ab",
    pinkSoft: "#ff9cc8",
    row: "rgba(255,255,255,0.05)",
    rowBorder: "rgba(255,255,255,0.07)",
    chip: "rgba(255,255,255,0.10)",
};

const GRADE_COLORS: Record<string, string> = {
    XH: "#e4ecf6",
    SSH: "#e4ecf6",
    X: "#ffd166",
    SS: "#ffd166",
    SH: "#cdd6e2",
    S: "#ffb547",
    A: "#8fe04d",
    B: "#f0b561",
    C: "#f08f61",
    D: "#f06161",
    F: "#8a7f93",
};

const WIDE = /[⺀-鿿぀-ヿ가-힯豈-﫿＀-￯]/;

function titleSize(title: string): number {
    let units = 0;
    for (const ch of title) {
        units += WIDE.test(ch) ? 1 : 0.56;
    }
    return Math.max(17, Math.min(24, Math.floor(520 / Math.max(units, 1))));
}

function Row({ row }: { row: ITopScoresCardRow }) {
    const gradeColor = GRADE_COLORS[(row.grade ?? "").toUpperCase()] ?? P.text;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                height: ROW_HEIGHT - 8,
                padding: "0 18px",
                borderRadius: 14,
                background: P.row,
                border: `1px solid ${P.rowBorder}`,
            }}
        >
            <div style={{ display: "flex", width: 44, flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: P.dim, fontFamily: FONT, lineHeight: 1 }}>
                    {row.place}
                </span>
            </div>

            {row.cover ? (
                <img
                    src={row.cover}
                    width={92}
                    height={52}
                    style={{ width: 92, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                />
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", overflow: "hidden", minWidth: 0 }}>
                    <span
                        style={{
                            fontSize: titleSize(row.title),
                            fontWeight: 800,
                            color: P.text,
                            fontFamily: FONT,
                            lineHeight: 1.1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {row.title}
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                        style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: P.muted,
                            fontFamily: FONT,
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {row.version}
                    </span>
                    {row.mods ? (
                        <span
                            style={{
                                fontSize: 15,
                                fontWeight: 800,
                                color: P.pinkSoft,
                                fontFamily: FONT,
                                lineHeight: 1,
                            }}
                        >
                            {row.mods}
                        </span>
                    ) : null}
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                    width: 118,
                    flexShrink: 0,
                }}
            >
                <div style={{ display: "flex" }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: P.text, fontFamily: FONT, lineHeight: 1 }}>
                        {row.accuracy}
                    </span>
                </div>
                <div style={{ display: "flex" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: P.dim, fontFamily: FONT, lineHeight: 1 }}>
                        {row.combo}
                    </span>
                </div>
            </div>

            {row.grade ? (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 50,
                        height: 38,
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.07)",
                        border: `1px solid ${gradeColor}`,
                        flexShrink: 0,
                    }}
                >
                    <span style={{ fontSize: 19, fontWeight: 900, color: gradeColor, fontFamily: FONT, lineHeight: 1 }}>
                        {row.grade}
                    </span>
                </div>
            ) : null}

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                    width: 112,
                    flexShrink: 0,
                }}
            >
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: P.pink, fontFamily: FONT, lineHeight: 1 }}>
                        {row.pp ?? "—"}
                    </span>
                    <span
                        style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: P.pinkSoft,
                            fontFamily: FONT,
                            lineHeight: 1,
                            marginLeft: 4,
                        }}
                    >
                        pp
                    </span>
                </div>
                {row.fcPp ? (
                    <div style={{ display: "flex" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: P.dim, fontFamily: FONT, lineHeight: 1 }}>
                            {`FC ${row.fcPp}`}
                        </span>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export function OsuTopScoresCard({ model, height }: { model: ITopScoresCardModel; height: number }) {
    const full: CSSProperties = {
        position: "absolute",
        left: 0,
        top: 0,
        width: 1000,
        height,
        display: "flex",
        boxSizing: "border-box",
    };

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                width: 1000,
                height,
                overflow: "hidden",
                background: P.base,
                fontFamily: FONT,
            }}
        >
            <div
                style={{ ...full, backgroundImage: "linear-gradient(135deg, #241a2c 0%, #18121d 45%, #141a23 100%)" }}
            />
            <div
                style={{
                    ...full,
                    height: 4,
                    backgroundImage: "linear-gradient(90deg, #ff66ab 0%, #ff66ab 35%, rgba(255,102,171,0) 100%)",
                }}
            />

            <div style={{ ...full, flexDirection: "column", padding: `${CARD_PADDING}px 28px` }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, height: HEADER_HEIGHT - CARD_PADDING }}>
                    <span style={{ fontSize: 34, fontWeight: 900, color: P.text, fontFamily: FONT, lineHeight: 1.1 }}>
                        {model.header}
                    </span>
                    <span style={{ fontSize: 19, fontWeight: 700, color: P.muted, fontFamily: FONT, lineHeight: 1.2 }}>
                        {model.subheader}
                    </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {model.rows.map((row) => (
                        <Row key={row.place} row={row} />
                    ))}
                </div>
            </div>
        </div>
    );
}
