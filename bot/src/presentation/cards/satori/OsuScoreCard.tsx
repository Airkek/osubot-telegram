import type { CSSProperties } from "react";
import { IScoreCardModel } from "presentation/cards/satori/IScoreCardModel";

/*
 * Карточка скора для satori → resvg. Холст 1000×520.
 * Те же ограничения, что и у карточки профиля: только flex, инлайн-стили,
 * display: flex у каждого div с более чем одним ребёнком.
 */

const FONT = "Torus, Mulish, NotoSansSC";

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

const FULL: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: 1000,
    height: 520,
    display: "flex",
    boxSizing: "border-box",
};

const WIDE = /[⺀-鿿぀-ヿ가-힯豈-﫿＀-￯]/;

function titleSize(title: string): number {
    let units = 0;
    for (const ch of title) {
        units += WIDE.test(ch) ? 1 : 0.58;
    }
    return Math.max(26, Math.min(44, Math.floor(880 / Math.max(units, 1))));
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

function Cell({ label, value, valueColor = P.text }: { label: string; value: string; valueColor?: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, flexBasis: 0, minWidth: 0 }}>
            <div style={{ display: "flex" }}>
                <span
                    style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: P.muted,
                        fontFamily: FONT,
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </span>
            </div>
            <div style={{ display: "flex" }}>
                <span style={{ fontSize: 25, fontWeight: 800, color: valueColor, fontFamily: FONT, lineHeight: 1 }}>
                    {value}
                </span>
            </div>
        </div>
    );
}

export function OsuScoreCard({ model }: { model: IScoreCardModel }) {
    const gradeColor = GRADE_COLORS[(model.grade ?? "").toUpperCase()] ?? P.text;

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                width: 1000,
                height: 520,
                overflow: "hidden",
                background: P.base,
                fontFamily: FONT,
            }}
        >
            {model.cover ? (
                <img src={model.cover} width={1000} height={520} style={{ ...FULL, objectFit: "cover" }} />
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
                    <div style={{ display: "flex" }}>
                        <span
                            style={{
                                fontSize: titleSize(model.title),
                                fontWeight: 800,
                                color: P.text,
                                fontFamily: FONT,
                                lineHeight: 1.1,
                                letterSpacing: -0.5,
                                whiteSpace: "nowrap",
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

                <div style={{ display: "flex", alignItems: "center", gap: 28, flex: 1 }}>
                    {model.grade ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 96,
                                height: 96,
                                borderRadius: 20,
                                background: "rgba(255,255,255,0.08)",
                                border: `2px solid ${gradeColor}`,
                                flexShrink: 0,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 46,
                                    fontWeight: 900,
                                    color: gradeColor,
                                    fontFamily: FONT,
                                    lineHeight: 1,
                                }}
                            >
                                {model.grade}
                            </span>
                        </div>
                    ) : null}

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex" }}>
                            <span
                                style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: P.muted,
                                    fontFamily: FONT,
                                    lineHeight: 1.2,
                                }}
                            >
                                {model.labels.score}
                            </span>
                        </div>
                        <div style={{ display: "flex" }}>
                            <span
                                style={{
                                    fontSize: 64,
                                    fontWeight: 900,
                                    color: P.text,
                                    fontFamily: FONT,
                                    lineHeight: 0.95,
                                    letterSpacing: -1.5,
                                }}
                            >
                                {model.score}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: "flex", flex: 1 }} />

                    {model.pp.length > 0 ? (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
                            {model.pp.map((entry, index) => (
                                <div key={entry.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ display: "flex" }}>
                                        <span
                                            style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: P.muted,
                                                fontFamily: FONT,
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            {entry.label}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex" }}>
                                        <span
                                            style={{
                                                fontSize: index === 0 ? 52 : 30,
                                                fontWeight: 900,
                                                color: index === 0 ? P.pink : P.pinkSoft,
                                                fontFamily: FONT,
                                                lineHeight: 1,
                                                letterSpacing: -1,
                                            }}
                                        >
                                            {entry.value}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                {model.personalTop || model.globalRank || model.date ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        {model.personalTop ? (
                            <Chip text={model.personalTop} bg="rgba(255,102,171,0.20)" color={P.pinkSoft} />
                        ) : null}
                        {model.globalRank ? <Chip text={model.globalRank} /> : null}
                        {model.failedAt ? (
                            <Chip text={model.failedAt} bg="rgba(240,97,97,0.20)" color="#ffb3b3" />
                        ) : null}
                        <div style={{ display: "flex", flex: 1 }} />
                        {model.date ? (
                            <span
                                style={{ fontSize: 15, fontWeight: 700, color: P.dim, fontFamily: FONT, lineHeight: 1 }}
                            >
                                {model.date}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        padding: "16px 24px",
                        borderRadius: 18,
                        background: P.panel,
                        border: `1px solid ${P.panelBorder}`,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <Cell label={model.labels.accuracy} value={model.accuracy} />
                        <Cell label={model.labels.combo} value={model.combo} />
                        {model.counts.map((entry) => (
                            <Cell key={entry.label} label={entry.label} value={entry.value} />
                        ))}
                    </div>

                    {model.facts.length > 0 ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                paddingTop: 12,
                                borderTop: `1px solid ${P.line}`,
                            }}
                        >
                            {model.facts.map((fact) => (
                                <div key={fact.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: P.dim,
                                            fontFamily: FONT,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {fact.label}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 800,
                                            color: P.muted,
                                            fontFamily: FONT,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {fact.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
