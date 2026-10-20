import type { CSSProperties } from "react";
import { IGameUser } from "games/users/IGameUser";
import { IProfileCardLabels } from "presentation/cards/satori/IProfileCardLabels";

/*
 * Карточка профиля для satori → resvg. Холст 1000×400.
 * Ограничения satori: только flex, инлайн-стили, у каждого div с более чем
 * одним ребёнком обязателен display: flex, текст — внутри отдельного span.
 */

export interface IProfileCardProps {
    user: IGameUser;
    labels: IProfileCardLabels;
    serverName: string;
    avatar?: string;
    background?: string;
}

const FONT = "Torus, Mulish, NotoSansSC";

const P = {
    base: "#18121d",
    text: "#f6f1f8",
    muted: "#b9adc2",
    dim: "#7d7286",
    pink: "#ff66ab",
    pinkSoft: "#ff9cc8",
    countryRank: "#ddd3e4",
    chip: "rgba(255,255,255,0.10)",
    line: "rgba(255,255,255,0.14)",
    panel: "rgba(255,255,255,0.06)",
    panelBorder: "rgba(255,255,255,0.08)",
};

const MODES = ["osu!", "osu!taiko", "osu!catch", "osu!mania"];

const GRADES: Array<[keyof NonNullable<IGameUser["grades"]>, string, string]> = [
    ["ssh", "SS", "#e4ecf6"],
    ["ss", "SS", "#ffd166"],
    ["sh", "S", "#cdd6e2"],
    ["s", "S", "#ffb547"],
    ["a", "A", "#8fe04d"],
];

// Обычный пробел: тонкого (U+2009) может не оказаться в Torus.
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const WIDE = /[⺀-鿿぀-ヿ가-힯豈-﫿＀-￯]/;

// Ширина ника в em: иероглиф ≈ 1, остальное ≈ 0.62. Влезает в ~700px.
function nickSize(nick: string): number {
    let units = 0;
    for (const ch of nick) {
        units += WIDE.test(ch) ? 1 : 0.62;
    }
    return Math.max(28, Math.min(54, Math.floor(700 / Math.max(units, 1))));
}

function formatPlaytime(playtime: number, labels: IProfileCardLabels): string {
    const hours = Math.floor(playtime / 3600);
    const minutes = Math.floor((playtime % 3600) / 60);
    return `${group(hours)}${labels.hour} ${minutes}${labels.minute}`;
}

// height вместе с padding: без border-box контент вылезает за холст.
const FULL: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: 1000,
    height: 400,
    display: "flex",
    boxSizing: "border-box",
};

function Chip({ text, bg = P.chip, color = P.text, dot }: { text: string; bg?: string; color?: string; dot?: string }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                height: 30,
                padding: "0 12px",
                borderRadius: 999,
                background: bg,
            }}
        >
            {dot ? (
                <div
                    style={{ display: "flex", width: 8, height: 8, borderRadius: 4, background: dot, marginRight: 8 }}
                />
            ) : null}
            <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: FONT, lineHeight: 1, letterSpacing: 0.3 }}>
                {text}
            </span>
        </div>
    );
}

function Label({ text }: { text: string }) {
    return (
        <span
            style={{
                fontSize: 16,
                fontWeight: 700,
                color: P.muted,
                fontFamily: FONT,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
            }}
        >
            {text}
        </span>
    );
}

function Value({ text }: { text: string }) {
    return (
        <span style={{ fontSize: 26, fontWeight: 800, color: P.text, fontFamily: FONT, lineHeight: 1 }}>{text}</span>
    );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, flexBasis: 0, minWidth: 0 }}>
            <div style={{ display: "flex", overflow: "hidden" }}>
                <Label text={label} />
            </div>
            {children}
        </div>
    );
}

export function OsuProfileCard({ user, labels, serverName, avatar, background }: IProfileCardProps) {
    const first = (Array.from(user.nickname)[0] ?? "?").toUpperCase();
    const ppSize = user.pp >= 10000 ? 84 : 100;
    const rankSize = String(user.rank.total ?? 0).length >= 6 ? 54 : 64;
    const progress = Math.max(2, Math.min(100, user.levelProgress ?? 0));

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                width: 1000,
                height: 400,
                overflow: "hidden",
                borderRadius: 24,
                background: P.base,
                fontFamily: FONT,
            }}
        >
            {background ? (
                <img src={background} width={1000} height={400} style={{ ...FULL, objectFit: "cover" }} />
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
                        "linear-gradient(90deg, rgba(24,18,29,0.97) 0%, rgba(24,18,29,0.92) 45%, rgba(24,18,29,0.84) 100%)",
                }}
            />
            <div
                style={{
                    ...FULL,
                    backgroundImage: "linear-gradient(0deg, rgba(24,18,29,1) 0%, rgba(24,18,29,0) 55%)",
                }}
            />
            <div
                style={{
                    ...FULL,
                    height: 4,
                    backgroundImage: "linear-gradient(90deg, #ff66ab 0%, #ff66ab 35%, rgba(255,102,171,0) 100%)",
                }}
            />

            <div style={{ ...FULL, flexDirection: "column", padding: "28px 36px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 24, height: 110 }}>
                    {avatar ? (
                        <img
                            src={avatar}
                            width={104}
                            height={104}
                            style={{
                                width: 104,
                                height: 104,
                                borderRadius: 22,
                                objectFit: "cover",
                                border: "3px solid rgba(255,255,255,0.18)",
                                flexShrink: 0,
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                width: 104,
                                height: 104,
                                borderRadius: 22,
                                border: "3px solid rgba(255,255,255,0.18)",
                                backgroundImage: "linear-gradient(135deg, #ff66ab 0%, #8b5cf6 100%)",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 52,
                                    fontWeight: 900,
                                    color: "#ffffff",
                                    fontFamily: FONT,
                                    lineHeight: 1,
                                }}
                            >
                                {first}
                            </span>
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex" }}>
                            <span
                                style={{
                                    fontSize: nickSize(user.nickname),
                                    fontWeight: 800,
                                    color: P.text,
                                    fontFamily: FONT,
                                    lineHeight: 1.1,
                                    letterSpacing: -0.5,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {user.nickname}
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Chip text={user.country} />
                            <Chip text={MODES[user.mode] ?? "osu!"} />
                            <Chip text={serverName} bg="rgba(139,92,246,0.22)" color="#d6c4ff" />
                            {user.is_supporter ? (
                                <Chip
                                    text={labels.supporter}
                                    bg="rgba(255,102,171,0.20)"
                                    color={P.pinkSoft}
                                    dot={P.pink}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 36, flex: 1, paddingBottom: 22 }}>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <span
                            style={{
                                fontSize: ppSize,
                                fontWeight: 900,
                                color: P.pink,
                                fontFamily: FONT,
                                lineHeight: 0.9,
                                letterSpacing: -2,
                            }}
                        >
                            {group(Math.round(user.pp))}
                        </span>
                        <span
                            style={{
                                fontSize: 38,
                                fontWeight: 800,
                                color: P.pinkSoft,
                                fontFamily: FONT,
                                lineHeight: 1,
                                marginLeft: 8,
                                marginBottom: 2,
                            }}
                        >
                            pp
                        </span>
                    </div>

                    <div style={{ display: "flex", width: 2, height: 80, background: P.line }} />

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <Label text={labels.globalRank} />
                        <span
                            style={{
                                fontSize: rankSize,
                                fontWeight: 900,
                                color: P.text,
                                fontFamily: FONT,
                                lineHeight: 0.95,
                                letterSpacing: -1,
                            }}
                        >
                            {user.rank.total ? `#${group(user.rank.total)}` : "—"}
                        </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <Label text={labels.countryRank} />
                        <span
                            style={{
                                fontSize: 40,
                                fontWeight: 800,
                                color: P.countryRank,
                                fontFamily: FONT,
                                lineHeight: 1,
                            }}
                        >
                            {user.rank.country ? `#${group(user.rank.country)}` : "—"}
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 24,
                        height: 84,
                        padding: "0 26px",
                        borderRadius: 18,
                        background: P.panel,
                        border: `1px solid ${P.panelBorder}`,
                    }}
                >
                    <Stat label={labels.accuracy}>
                        <Value text={`${user.accuracy.toFixed(2)}%`} />
                    </Stat>
                    <Stat label={labels.playcount}>
                        <Value text={group(user.playcount ?? 0)} />
                    </Stat>
                    {user.playtime ? (
                        <Stat label={labels.playtime}>
                            <Value text={formatPlaytime(user.playtime, labels)} />
                        </Stat>
                    ) : null}
                    {user.level ? (
                        <Stat label={labels.level}>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                                <Value text={String(Math.floor(user.level))} />
                                {user.levelProgress != null ? (
                                    <span
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 700,
                                            color: P.muted,
                                            fontFamily: FONT,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {`${user.levelProgress}%`}
                                    </span>
                                ) : null}
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    width: "100%",
                                    height: 6,
                                    borderRadius: 3,
                                    background: "rgba(255,255,255,0.14)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        width: `${progress}%`,
                                        height: 6,
                                        borderRadius: 3,
                                        background: P.pink,
                                    }}
                                />
                            </div>
                        </Stat>
                    ) : null}

                    {user.grades ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 18,
                                height: 56,
                                paddingLeft: 24,
                                borderLeft: `2px solid ${P.line}`,
                            }}
                        >
                            {GRADES.map(([key, letter, color]) => {
                                const count = user.grades[key] ?? 0;
                                return (
                                    <div
                                        key={key}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 5,
                                            minWidth: 32,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 18,
                                                fontWeight: 900,
                                                color,
                                                fontFamily: FONT,
                                                lineHeight: 1,
                                            }}
                                        >
                                            {letter}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 24,
                                                fontWeight: 800,
                                                color: count ? P.text : P.dim,
                                                fontFamily: FONT,
                                                lineHeight: 1,
                                            }}
                                        >
                                            {group(count)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
