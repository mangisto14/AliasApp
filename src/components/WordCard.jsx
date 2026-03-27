// ═══════════════════════════════════════════════════════════════════
// src/components/WordCard.jsx
// Stateless word display card with glassmorphism, poison & taboo modes.
//
// Props:
//   word, tabooWords[], isPoison, mode, difficulty, points,
//   swipeOffset, swipeAnim, poisonShake, lang
// ═══════════════════════════════════════════════════════════════════

import React from "react";

export default function WordCard({
  word = "",
  tabooWords = [],
  isPoison = false,
  mode = "normal",
  difficulty = 1,
  points = 1,
  swipeOffset = 0,
  swipeAnim = "",
  poisonShake = false,
  lang = "en",
}) {
  // ─── Swipe transform ────────────────────────────────────────────
  const getTransform = () => {
    if (swipeAnim === "got") return "translateX(120px)";
    if (swipeAnim === "skip") return "translateX(-120px)";
    return `translateX(${swipeOffset}px)`;
  };

  const getOpacity = () => {
    if (swipeAnim) return 0;
    return 1 - Math.abs(swipeOffset) / 300;
  };

  const getTransition = () => {
    if (swipeAnim) return "all 0.25s ease-out";
    if (swipeOffset === 0) return "transform 0.2s, opacity 0.2s";
    return "none";
  };

  const showTaboo =
    (mode === "taboo" || mode === "poison") && tabooWords.length > 0;

  const poisonLabel = lang === "he" ? "אסור לדלג!" : "Can't skip!";
  const tabooLabel = lang === "he" ? "מילים אסורות" : "Forbidden words";

  return (
    <div
      className={`relative w-full max-w-sm ${poisonShake ? "shake" : ""}`}
      style={{
        transform: getTransform(),
        opacity: getOpacity(),
        transition: getTransition(),
      }}
    >
      {/* Poison Badge */}
      {isPoison && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-red-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-lg shadow-red-500/30 flex items-center gap-1">
            <span>☠️</span>
            <span>{poisonLabel}</span>
          </div>
        </div>
      )}

      {/* Main Card — Premium Glassmorphism */}
      <div
        className={[
          "rounded-3xl p-6 w-full text-center shadow-2xl",
          "backdrop-blur-md",
          isPoison
            ? "bg-red-500/15 border-2 border-red-400/40 poison-pulse"
            : "bg-white/10 border border-white/20",
        ].join(" ")}
      >
        {/* Word */}
        <p className="text-4xl font-black text-white leading-tight">{word}</p>

        {/* Difficulty stars + points */}
        {difficulty > 0 && (
          <p className="text-xs text-white/30 mt-2">
            {"⭐".repeat(difficulty)} +{points}
          </p>
        )}

        {/* Taboo Words Section */}
        {showTaboo && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-xs text-red-300 font-bold mb-2">
              🚫 {tabooLabel}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {tabooWords.map((tw, i) => (
                <span
                  key={i}
                  className="bg-red-500/20 border border-red-400/30 text-red-200 px-3 py-1 rounded-full text-sm font-semibold"
                >
                  {tw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
