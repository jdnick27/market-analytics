// Tiny formatter that converts indicator snapshots into short X posts.
// No deps. Works with ts-node or after tsc compilation.

export type Signal = "buy" | "sell" | "hold";

export type Snapshot = {
  ticker: string;          // e.g. "NVDA"
  score: number;           // e.g. 1143
  indicators: Record<string, Signal>;
};

export type PostOptions = {
  // Max number of items to list in strengths/weaknesses line
  maxBullets?: number;
  // Emojis to use (override if you want)
  emojis?: {
    header?: string[]; // one will be picked based on vibe
    strength?: string;
    weakness?: string;
    vibeBull?: string;
    vibeBear?: string;
    vibeNeutral?: string;
  };
  // Include the score in the header line
  showScore?: boolean;
  // Optional hashtags appended as a final line
  hashtags?: string[];
};

// --- Category helpers -------------------------------------------------------

const FUNDAMENTAL_KEYS = [
  "Current Ratio",
  "Debt/Equity",
  "Net Margin",
  "Operating Cash Flow",
  "Net Cash Flow",
  "Comprehensive Income",
  "Revenue Growth (Q)",
  "Revenue Growth (Y)",
  "Net Income Growth (Q)",
  "Net Income Growth (Y)",
  "Op Cash Flow Growth (Q)",
  "Op Cash Flow Growth (Y)",
];

const TECHNICAL_KEYS = [
  "RSI",
  "SMA",
  "EMA",
  "MACD",
  "52W",
  "SHORT_INT",
  "SHORT_VOL",
];

// For nicer display names if your raw keys are like "SHORT_INT"
const PRETTY_NAME: Record<string, string> = {
  SHORT_INT: "Short Interest",
  SHORT_VOL: "Short Vol",
  "52W": "52-Week",
};

const pretty = (k: string) => PRETTY_NAME[k] ?? k;

// --- Scoring & vibe ---------------------------------------------------------

function vibeFromCounts(buys: number, sells: number, holds: number): "bull" | "bear" | "neutral" {
  const net = buys - sells;
  // Simple thresholds; tweak to taste
  if (net >= 3 || (buys >= 6 && sells <= 2)) return "bull";
  if (net <= -3 || (sells >= 6 && buys <= 2)) return "bear";
  return "neutral";
}

function headerEmoji(vibe: "bull" | "bear" | "neutral", options: PostOptions) {
  const e = options.emojis;
  if (vibe === "bull") return e?.header?.[0] ?? "📈";
  if (vibe === "bear") return e?.header?.[1] ?? "📉";
  return e?.header?.[2] ?? "📊";
}

// --- Summarization logic ----------------------------------------------------

function pickTop(
  indicators: Record<string, Signal>,
  want: Signal,
  pool: string[],
  max: number
): string[] {
  const matches = pool.filter((k) => indicators[k] === want);
  // Sort to prefer human-friendly order (fundamentals first by default)
  return matches.slice(0, max).map(pretty);
}

function summarizeStrengths(indicators: Record<string, Signal>, max: number): string {
  const fBuys = pickTop(indicators, "buy", FUNDAMENTAL_KEYS, max);
  const tBuys = pickTop(indicators, "buy", TECHNICAL_KEYS, Math.max(0, max - fBuys.length));

  if (fBuys.length + tBuys.length === 0) {
    // fallback: “broad strength” if many holds but few sells
    const buys = Object.values(indicators).filter((s) => s === "buy").length;
    const sells = Object.values(indicators).filter((s) => s === "sell").length;
    if (buys >= sells) return "Broad support across metrics";
    return "Selective strength";
  }

  const bullets = [...fBuys, ...tBuys];
  return bullets.length === 1 ? `${bullets[0]} strong`
                              : bullets.join(", ") + " strong";
}

function summarizeWeaknesses(indicators: Record<string, Signal>, max: number): string {
  const fSells = pickTop(indicators, "sell", FUNDAMENTAL_KEYS, max);
  const tSells = pickTop(indicators, "sell", TECHNICAL_KEYS, Math.max(0, max - fSells.length));

  if (fSells.length + tSells.length === 0) {
    // fallback if no direct "sell" signals
    const holds = Object.values(indicators).filter((s) => s === "hold").length;
    if (holds > 0) return "Some metrics mixed";
    return "Minor technical noise";
  }

  const bullets = [...fSells, ...tSells];
  return bullets.length === 1 ? `${bullets[0]} weak`
                              : bullets.join(", ") + " weak";
}

function vibeLine(vibe: "bull" | "bear" | "neutral", options: PostOptions) {
  const e = options.emojis;
  if (vibe === "bull") return `${e?.vibeBull ?? "🚀"} Bullish setup`;
  if (vibe === "bear") return `${e?.vibeBear ?? "⚠️"} Cautious / Bearish tilt`;
  return `${e?.vibeNeutral ?? "⚖️"} Mixed / Watchlist`;
}

// --- Main formatter ---------------------------------------------------------

export function formatPost(
  snap: Snapshot,
  options: PostOptions = {}
): string {
  const maxBullets = options.maxBullets ?? 2;
  const showScore = options.showScore ?? true;

  const vals = Object.values(snap.indicators);
  const buys = vals.filter((s) => s === "buy").length;
  const sells = vals.filter((s) => s === "sell").length;
  const holds = vals.filter((s) => s === "hold").length;

  const vibe = vibeFromCounts(buys, sells, holds);
  const headEmoji = headerEmoji(vibe, options);
  const strength = summarizeStrengths(snap.indicators, maxBullets);
  const weakness = summarizeWeaknesses(snap.indicators, maxBullets);
  const e = options.emojis ?? {};

  const lines = [
    showScore
      ? `$${snap.ticker} ${headEmoji} Score: ${snap.score}`
      : `$${snap.ticker} ${headEmoji}`,
    `${e.strength ?? "✅"} ${strength}`,
    `${e.weakness ?? "❌"} ${weakness}\n${vibeLine(vibe, options)}`,
  ];

  if (options.hashtags && options.hashtags.length > 0) {
    const tags = options.hashtags
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .join(" ");
    lines.push(tags);
  }

  return lines.join("\n");
}

// --- Batch helper -----------------------------------------------------------

export function formatPosts(snaps: Snapshot[], options?: PostOptions): string[] {
  return snaps.map((s) => formatPost(s, options));
}

// --- Example usage ----------------------------------------------------------

if (require.main === module) {
  const posts: Snapshot[] = [
    {
      ticker: "NVDA",
      score: 1143,
      indicators: {
        RSI: "hold",
        SMA: "buy",
        "52W": "hold",
        SHORT_INT: "buy",
        SHORT_VOL: "sell",
        EMA: "buy",
        MACD: "sell",
        "Current Ratio": "buy",
        "Debt/Equity": "buy",
        "Net Margin": "buy",
        "Operating Cash Flow": "buy",
        "Net Cash Flow": "buy",
        "Comprehensive Income": "buy",
        "Revenue Growth (Q)": "buy",
        "Revenue Growth (Y)": "buy",
        "Net Income Growth (Q)": "buy",
        "Net Income Growth (Y)": "buy",
        "Op Cash Flow Growth (Q)": "buy",
        "Op Cash Flow Growth (Y)": "buy",
      },
    },
    {
      ticker: "CRM",
      score: 1107,
      indicators: {
        RSI: "hold",
        SMA: "sell",
        "52W": "hold",
        SHORT_INT: "buy",
        SHORT_VOL: "hold",
        EMA: "sell",
        MACD: "buy",
        "Current Ratio": "hold",
        "Debt/Equity": "buy",
        "Net Margin": "buy",
        "Operating Cash Flow": "buy",
        "Net Cash Flow": "buy",
        "Comprehensive Income": "buy",
        "Revenue Growth (Q)": "buy",
        "Revenue Growth (Y)": "buy",
        "Net Income Growth (Q)": "buy",
        "Net Income Growth (Y)": "buy",
        "Op Cash Flow Growth (Q)": "buy",
        "Op Cash Flow Growth (Y)": "buy",
      },
    },
  ];

  const out = formatPosts(posts, {
    hashtags: ["stocks", "analysis"],
  });
  console.log(out.join("\n\n---\n\n"));
}
