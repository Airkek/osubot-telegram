import type { CSSProperties } from "react";
import { IBeatmapCardModel } from "presentation/cards/satori/IBeatmapCardModel";

/*
 * Карточка карты для satori → resvg. Холст 1000×420.
 * Используется и для инфо о карте (сетка PP на 95/98/99/100%), и для
 * PP-карточки (один расчёт по запрошенным параметрам).
 */

const FONT = "Torus, Mulish, NotoSansSC";

export const BEATMAP_CARD_WIDTH = 1000;
export const BEATMAP_CARD_HEIGHT = 420;

const P = {
    base: "#18121d",
    text: "#f6f1f8",
    muted: "#b9adc2",
    dim: "#7d7286",
    pink: "#ff66ab",
    pinkSoft: "#ff9cc8",
    chip: "rgba(255,255,255,0.10)",
    line: "rgba(255,255,255,0.14)",
    panel: "rgba(255,255,255,0.06)",
    panelBorder: "rgba(255,255,255,0.08)",
};

const FULL: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: BEATMAP_CARD_WIDTH,
    height: BEATMAP_CARD_HEIGHT,
    display: "flex",
    boxSizing: "border-box",
};

const WIDE = /[⺀-鿿぀-ヿ가-힯豈-﫿＀-￯]/;

function titleSize(title: string): number {
    let units = 0;
    for (const ch of title) {
        units += WIDE.test(ch) ? 1 : 0.58;
    }
    return Math.max(26, Math.min(46, Math.floor(880 / Math.max(units, 1))));
}

function Chip({ text, bg = P.chip, color = P.text }: { text: string; bg?: string; color?: string }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                height: 28,
                padding: "0 11px",
                borderRadius: 999,
                background: bg,
            }}
        >
            <span style={{ fontSize: 15, fontWeight: 800, color, fontFamily: FONT, lineHeight: 1 }}>{text}</span>
        </div>
    );
}

export function OsuBeatmapCard({ model }: { model: IBeatmapCardModel }) {
    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                width: BEATMAP_CARD_WIDTH,
                height: BEATMAP_CARD_HEIGHT,
                overflow: "hidden",
                background: P.base,
                fontFamily: FONT,
            }}
        >
            {model.cover ? (
                <img
                    src={model.cover}
                    width={BEATMAP_CARD_WIDTH}
                    height={BEATMAP_CARD_HEIGHT}
                    style={{ ...FULL, objectFit: "cover" }}
                />
            ) : (
                <div
                    style={{
                        ...FULL,
                        backgroundImage: "linear-gradient(135deg, #2c1834 0%, #1a1420 55%, #121a24 100%)",
                    }}
                />
            )}

            <div
                style={{
                    ...FULL,
                    backgroundImage:
                        "linear-gradient(90deg, rgba(24,18,29,0.96) 0%, rgba(24,18,29,0.90) 50%, rgba(24,18,29,0.82) 100%)",
                }}
            />
            <div
                style={{ ...FULL, backgroundImage: "linear-gradient(0deg, rgba(24,18,29,1) 8%, rgba(24,18,29,0) 60%)" }}
            />
            <div
                style={{
                    ...FULL,
                    height: 4,
                    backgroundImage: "linear-gradient(90deg, #ff66ab 0%, #ff66ab 35%, rgba(255,102,171,0) 100%)",
                }}
            />

            <div style={{ ...FULL, flexDirection: "column", padding: "28px 36px 26px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", overflow: "hidden", minWidth: 0 }}>
                        <span
                            style={{
                                fontSize: titleSize(model.title),
                                fontWeight: 800,
                                color: P.text,
                                fontFamily: FONT,
                                lineHeight: 1.1,
                                letterSpacing: -0.5,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {model.title}
                        </span>
                    </div>
                    <div style={{ display: "flex" }}>
                        <span
                            style={{
                                fontSize: 19,
                                fontWeight: 700,
                                color: P.muted,
                                fontFamily: FONT,
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {`${model.artist} · ${model.mapper}`}
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Chip text={model.version} bg="rgba(139,92,246,0.22)" color="#d6c4ff" />
                        <Chip text={model.status} />
                        {model.mods ? <Chip text={model.mods} bg="rgba(255,102,171,0.20)" color={P.pinkSoft} /> : null}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 30, flex: 1 }}>
                    {model.pp.map((entry, index) => (
                        <div key={entry.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex" }}>
                                <span
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: P.muted,
                                        fontFamily: FONT,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {entry.label}
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-end" }}>
                                <span
                                    style={{
                                        fontSize: model.pp.length > 1 ? 46 : 76,
                                        fontWeight: 900,
                                        color: index === model.pp.length - 1 ? P.pink : P.pinkSoft,
                                        fontFamily: FONT,
                                        lineHeight: 0.95,
                                        letterSpacing: -1.5,
                                    }}
                                >
                                    {entry.value}
                                </span>
                                <span
                                    style={{
                                        fontSize: model.pp.length > 1 ? 20 : 30,
                                        fontWeight: 800,
                                        color: P.pinkSoft,
                                        fontFamily: FONT,
                                        lineHeight: 1,
                                        marginLeft: 5,
                                        marginBottom: 2,
                                    }}
                                >
                                    pp
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {model.note ? (
                    <div style={{ display: "flex", marginBottom: 12 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: P.dim, fontFamily: FONT, lineHeight: 1 }}>
                            {model.note}
                        </span>
                    </div>
                ) : null}

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        height: 62,
                        padding: "0 24px",
                        borderRadius: 18,
                        background: P.panel,
                        border: `1px solid ${P.panelBorder}`,
                    }}
                >
                    {model.facts.map((fact) => (
                        <div key={fact.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span
                                style={{ fontSize: 15, fontWeight: 700, color: P.dim, fontFamily: FONT, lineHeight: 1 }}
                            >
                                {fact.label}
                            </span>
                            <span
                                style={{
                                    fontSize: 19,
                                    fontWeight: 800,
                                    color: P.text,
                                    fontFamily: FONT,
                                    lineHeight: 1,
                                }}
                            >
                                {fact.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
