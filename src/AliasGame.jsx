// ═══════════════════════════════════════════════════════════════════
// src/AliasGame.jsx
// Main Game Container — imports config, sound hook, and WordCard.
// Manages: teams, scores, timer, phases, language, swipe gestures.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";

// Confetti positions computed once at module level (stable, no re-render issues)
const CONFETTI_ITEMS = [...Array(20)].map((_, i) => ({
  idx: i,
  left: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 2}s`,
  animationDuration: `${2 + Math.random() * 2}s`,
}));

// ─── Data & Config ─────────────────────────────────────────────────
import {
  KIDS_WORDS,
  UI,
  TEAM_THEMES,
  PHASE,
  DEFAULTS,
  DIFFICULTY_MAP,
  DIFFICULTY_POINTS,
  loadCategoryWords,
} from "./data/gameConfig";

// ─── Hooks ─────────────────────────────────────────────────────────
import { useSoundEngine, vibrate } from "./hooks/useSoundEngine";

// ─── Components ────────────────────────────────────────────────────
import WordCard from "./components/WordCard";

const LB_KEY = "alias-lb";

async function storageGet(key) {
  try {
    if (typeof window !== "undefined" && window.storage?.get) {
      const r = await window.storage.get(key);
      if (r?.value != null) return r.value;
    }
  } catch { /* silent */ }
  try {
    return localStorage.getItem(key);
  } catch { /* silent */ }
  return null;
}

async function storageSet(key, value) {
  try {
    if (typeof window !== "undefined" && window.storage?.set) {
      await window.storage.set(key, value);
      return;
    }
  } catch { /* silent */ }
  try {
    localStorage.setItem(key, value);
  } catch { /* silent */ }
}

// ═══════════════════════════════════════════════════════════════════
// WORD ENGINE — Fisher-Yates shuffle, no repeats until pool exhausted
// ═══════════════════════════════════════════════════════════════════
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createWordEngine(poolInput, difficulty, gameMode) {
  let pool = [...poolInput];
  // Filter by difficulty if not "all"
  if (difficulty !== "all" && DIFFICULTY_MAP[difficulty]) {
    const filtered = pool.filter((w) => w.d === DIFFICULTY_MAP[difficulty]);
    if (filtered.length >= DEFAULTS.MIN_POOL_SIZE) pool = filtered;
  }

  shuffle(pool);
  let idx = 0;

  return {
    next() {
      if (idx >= pool.length) {
        shuffle(pool);
        idx = 0;
      }
      const item = pool[idx++] || { word: "", d: 1, taboo: [] };
      return {
        ...item,
        isPoison: gameMode === "poison" && Math.random() < DEFAULTS.POISON_CHANCE,
      };
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// TIMER RING — SVG circular countdown
// ═══════════════════════════════════════════════════════════════════
function TimerRing({ time, max, size = 120 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const urgent = time <= 10;
  return (
    <svg width={size} height={size} className="drop-shadow-lg">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={urgent ? "#ef4444" : "#ffffff"}
        strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - time / max)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.3s" }}
      />
      <text
        x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className={`font-black ${urgent ? "fill-red-400" : "fill-white"}`}
        style={{ fontSize: time < 10 ? "2.5rem" : "2rem" }}
      >
        {time}
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AliasGame() {
  // ─── Core state ────────────────────────────────────────────────
  const [lang, setLang] = useState("he");
  const [phase, setPhase] = useState(PHASE.LOBBY);
  const [teams, setTeams] = useState([
    { name: "", score: 0 },
    { name: "", score: 0 },
  ]);
  const [selectedCategories, setSelectedCategories] = useState(["general"]);
  const [timerDuration, setTimerDuration] = useState(DEFAULTS.TIMER_DURATION);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [roundNum, setRoundNum] = useState(1);
  const [totalRounds, setTotalRounds] = useState(DEFAULTS.TOTAL_ROUNDS);
  const [timeLeft, setTimeLeft] = useState(DEFAULTS.TIMER_DURATION);
  const [currentWordData, setCurrentWordData] = useState(null);
  const [roundWords, setRoundWords] = useState([]);
  const [readyCount, setReadyCount] = useState(3);

  // ─── Feature state ─────────────────────────────────────────────
  const [difficulty, setDifficulty] = useState("all");
  const [gameMode, setGameMode] = useState("normal");
  const [kidsMode, setKidsMode] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showBonus, setShowBonus] = useState(false);
  const [winCondition, setWinCondition] = useState("rounds");
  const [targetScore, setTargetScore] = useState(DEFAULTS.TARGET_SCORE);
  const [isPaused, setIsPaused] = useState(false);
  const [customWords, setCustomWords] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [lightTheme, setLightTheme] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [poisonShake, setPoisonShake] = useState(false);
  const [roundCategoryKey, setRoundCategoryKey] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // ─── Refs ──────────────────────────────────────────────────────
  const timerRef = useRef(null);
  const engineRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  // ─── Derived ───────────────────────────────────────────────────
  const t = UI[lang];
  const isRTL = lang === "he";
  const dir = isRTL ? "rtl" : "ltr";
  const teamTheme = TEAM_THEMES[currentTeamIdx % TEAM_THEMES.length];

  // ─── Sound Hook ────────────────────────────────────────────────
  const sound = useSoundEngine(soundEnabled);

  // ─── Theme classes ─────────────────────────────────────────────
  const themeBg = lightTheme
    ? "bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50"
    : "bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900";
  const themeText = lightTheme ? "text-slate-800" : "text-white";
  const themeSub = lightTheme ? "text-slate-400" : "text-white/40";
  const themeCard = lightTheme
    ? "bg-white border border-slate-200 shadow-md"
    : "bg-white/6 border border-white/10";
  const themeInput = lightTheme
    ? "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
    : "bg-white/5 border-white/10 text-white placeholder-white/30";
  const activePill =
    "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/25";
  const inactivePill = lightTheme
    ? "bg-slate-100 text-slate-500 border border-slate-200"
    : "bg-white/5 text-white/50 border border-white/5";

  // ─── Helpers ───────────────────────────────────────────────────
  const teamName = (i) => teams[i]?.name || `${t.team} ${i + 1}`;
  const pts = (d) => DIFFICULTY_POINTS[d] || 1;
  const getRoundScore = () =>
    roundWords.reduce((s, w) => s + (w.correct ? w.points || 1 : 0), 0);

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // Load leaderboard on mount
  useEffect(() => {
    (async () => {
      const raw = await storageGet(LB_KEY);
      if (!raw) return;
      try {
        setLeaderboardData(JSON.parse(raw));
      } catch { /* silent */ }
    })();
  }, []);

  // Cleanup timer on unmount (prevent memory leaks)
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // GAME LOGIC
  // ═══════════════════════════════════════════════════════════════

  const startPlaying = useCallback(async () => {
    const cat = roundCategoryKey || "general";
    let pool = [];
    if (kidsMode) {
      pool = [...KIDS_WORDS[lang]];
    } else if (cat === "custom") {
      pool = customWords.map((w) => ({ word: w, d: 2, taboo: [] }));
    } else {
      const wordsByLang = await loadCategoryWords(cat);
      pool = [...(wordsByLang?.[lang] || [])];
    }
    if (pool.length === 0) {
      const fallbackByLang = await loadCategoryWords("general");
      pool = [...(fallbackByLang?.[lang] || [])];
    }
    const engine = createWordEngine(pool, difficulty, gameMode);
    engineRef.current = engine;
    setCurrentWordData(engine.next());
    setRoundWords([]);
    setTimeLeft(timerDuration);
    setStreak(0);
    setIsPaused(false);
    setPhase(PHASE.PLAYING);
  }, [roundCategoryKey, lang, difficulty, kidsMode, customWords, gameMode, timerDuration]);

  // Ready countdown: 3 → 2 → 1 → start
  useEffect(() => {
    if (phase !== PHASE.READY) return;
    let count = 3;
    const tick = () => {
      setReadyCount(count);
      if (count <= 1) {
        clearInterval(id);
        void startPlaying();
        return;
      }
      count -= 1;
    };
    tick();
    const id = setInterval(tick, 800);
    return () => clearInterval(id);
  }, [phase, startPlaying]);

  // Game timer with tick sounds, vibration, and auto-end
  useEffect(() => {
    if (phase !== PHASE.PLAYING || isPaused) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 11 && p > 1) sound.playTick();
        if (p <= 5 && p > 1 && vibrationEnabled) vibrate(50);
        if (p <= 1) {
          clearInterval(timerRef.current);
          sound.playAlarm();
          if (vibrationEnabled) vibrate([200, 100, 200]);
          setPhase(PHASE.SUMMARY);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, isPaused, sound, vibrationEnabled]);

  /** nextWord — Handles "Got It" action */
  const handleGotIt = useCallback(() => {
    if (!currentWordData) return;
    setSwipeAnim("got");
    setTimeout(() => setSwipeAnim(""), 250);
    sound.playCorrect();

    const newStreak = streak + 1;
    setStreak(newStreak);
    setRoundWords((p) => [
      ...p,
      { word: currentWordData.word, correct: true, points: pts(currentWordData.d), isPoison: currentWordData.isPoison },
    ]);

    // Streak bonus: +5s every 3 correct in a row
    if (newStreak > 0 && newStreak % DEFAULTS.STREAK_BONUS_THRESHOLD === 0) {
      setTimeLeft((p) => p + DEFAULTS.STREAK_BONUS_SECONDS);
      setShowBonus(true);
      sound.playBonus();
      if (vibrationEnabled) vibrate([100, 50, 100]);
      setTimeout(() => setShowBonus(false), 1500);
    }

    setCurrentWordData(engineRef.current.next());
  }, [currentWordData, streak, vibrationEnabled, sound]);

  /** handleScore — Handles "Skip" action */
  const handleSkip = useCallback(() => {
    if (!currentWordData) return;

    // Poison words CANNOT be skipped
    if (currentWordData.isPoison) {
      sound.playPoison();
      setPoisonShake(true);
      setTimeout(() => setPoisonShake(false), 400);
      if (vibrationEnabled) vibrate([200, 100, 200]);
      return;
    }

    setSwipeAnim("skip");
    setTimeout(() => setSwipeAnim(""), 250);
    sound.playSkip();
    setStreak(0);
    setRoundWords((p) => [
      ...p,
      { word: currentWordData.word, correct: false, points: 0, isPoison: false },
    ]);
    setCurrentWordData(engineRef.current.next());
  }, [currentWordData, vibrationEnabled, sound]);

  // Keyboard: correct / skip / pause (PLAYING only)
  useEffect(() => {
    if (phase !== PHASE.PLAYING || isPaused || showExitConfirm) return;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsPaused(true);
        return;
      }
      const correctKey = isRTL ? e.key === "ArrowLeft" : e.key === "ArrowRight";
      const skipKey = isRTL ? e.key === "ArrowRight" : e.key === "ArrowLeft";
      if (correctKey) {
        e.preventDefault();
        handleGotIt();
      } else if (skipKey) {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, isPaused, showExitConfirm, isRTL, handleGotIt, handleSkip]);

  useEffect(() => {
    if (!showExitConfirm) return;
    const onEsc = (e) => {
      if (e.key === "Escape") setShowExitConfirm(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [showExitConfirm]);

  // ─── Swipe gesture handlers ────────────────────────────────────
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };
  const onTouchMove = (e) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwiping.current = true;
      setSwipeOffset(dx);
    }
  };
  const onTouchEnd = () => {
    if (isSwiping.current) {
      if (swipeOffset > 80) handleGotIt();
      else if (swipeOffset < -80) handleSkip();
    }
    setSwipeOffset(0);
    isSwiping.current = false;
  };

  // ─── Summary helpers ───────────────────────────────────────────
  const toggleWord = (idx) =>
    setRoundWords((p) =>
      p.map((w, i) =>
        i === idx ? { ...w, correct: !w.correct, points: !w.correct ? pts(w.d || 1) : 0 } : w
      )
    );

  const confirmRound = async () => {
    const score = getRoundScore();
    const newTeams = teams.map((tm, i) =>
      i === currentTeamIdx ? { ...tm, score: tm.score + score } : tm
    );
    setTeams(newTeams);

    // Check win by score
    if (winCondition === "score" && newTeams.some((tm) => tm.score >= targetScore)) {
      await saveLeaderboard(newTeams);
      sound.playFanfare();
      setPhase(PHASE.GAMEOVER);
      return;
    }

    const next = (currentTeamIdx + 1) % teams.length;
    const fullRound = next === 0;

    // Check win by rounds
    if (winCondition === "rounds" && fullRound && roundNum >= totalRounds) {
      await saveLeaderboard(newTeams);
      sound.playFanfare();
      setPhase(PHASE.GAMEOVER);
      return;
    }

    setCurrentTeamIdx(next);
    setRoundNum(fullRound ? roundNum + 1 : roundNum);
    setPhase(PHASE.CATEGORY_PICK);
  };

  const saveLeaderboard = async (finalTeams) => {
    try {
      const entry = {
        date: new Date().toLocaleDateString(),
        teams: finalTeams.map((tm, i) => ({
          name: tm.name || `${t.team} ${i + 1}`,
          score: tm.score,
        })),
        winner: finalTeams.reduce(
          (best, tm, i) => (tm.score > (finalTeams[best]?.score || 0) ? i : best),
          0
        ),
      };
      const updated = [entry, ...leaderboardData].slice(0, 20);
      setLeaderboardData(updated);
      await storageSet(LB_KEY, JSON.stringify(updated));
    } catch { /* silent */ }
  };

  const resetGame = () => {
    clearInterval(timerRef.current);
    setPhase(PHASE.LOBBY);
    setTeams((p) => p.map((tm) => ({ ...tm, score: 0 })));
    setCurrentTeamIdx(0);
    setRoundNum(1);
    setRoundWords([]);
    setStreak(0);
    setCurrentWordData(null);
    engineRef.current = null;
    setRoundCategoryKey(null);
    setShowExitConfirm(false);
    setIsPaused(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER — Phase-based routing
  // ═══════════════════════════════════════════════════════════════

  // ─── LEADERBOARD SCREEN ────────────────────────────────────────
  if (showLeaderboard) {
    return (
      <div dir={dir} className={`min-h-screen ${themeBg} flex flex-col p-4`}>
        <button onClick={() => setShowLeaderboard(false)} className={`self-start mb-4 px-4 py-2 rounded-xl text-sm font-bold ${themeCard} ${themeText}`}>
          ← {t.back}
        </button>
        <h2 className={`text-3xl font-black ${themeText} text-center mb-6`}>🏆 {t.leaderboard}</h2>
        <div className="flex-1 overflow-y-auto space-y-3 no-scroll">
          {leaderboardData.length === 0 ? (
            <p className={`text-center ${themeSub} mt-12`}>{t.noHistory}</p>
          ) : (
            leaderboardData.map((e, i) => (
              <div key={i} className={`${themeCard} rounded-2xl p-4 slide-up`} style={{ animationDelay: `${i * 60}ms`, opacity: 0 }}>
                <span className={`text-xs font-semibold ${themeSub}`}>{e.date}</span>
                <div className="mt-2 space-y-1">
                  {e.teams.map((tm, ti) => (
                    <div key={ti} className="flex justify-between">
                      <span className={`text-sm ${ti === e.winner ? "text-amber-500 font-bold" : themeText}`}>
                        {ti === e.winner ? "👑 " : ""}{tm.name}
                      </span>
                      <span className={`text-sm font-bold ${ti === e.winner ? "text-amber-500" : themeSub}`}>{tm.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── CATEGORY PICK ─────────────────────────────────────────────
  if (phase === PHASE.CATEGORY_PICK) {
    const roundCategoryKeys = [
      ...Object.keys(t.categories),
      ...(customWords.length > 0 ? ["custom"] : []),
    ];
    return (
      <div dir={dir} className={`min-h-screen ${themeBg} flex flex-col items-center justify-center p-4`}>
        <div className="w-full max-w-md space-y-6 text-center">
          <p className={`${themeSub} text-sm font-bold uppercase tracking-widest`}>
            {t.round} {roundNum} — {teamName(currentTeamIdx)}
          </p>
          <h2 className={`text-2xl font-black ${themeText}`}>{t.chooseCategory}</h2>
          <div className="grid grid-cols-2 gap-3">
            {roundCategoryKeys.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setRoundCategoryKey(cat);
                  setPhase(PHASE.READY);
                }}
                className={`py-4 rounded-2xl text-base font-bold active:scale-95 ${themeCard} ${themeText} hover:scale-105 transition-all`}
              >
                {cat === "custom" ? `✏️ ${t.customCategory}` : t.categories[cat] || cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── LOBBY ─────────────────────────────────────────────────────
  if (phase === PHASE.LOBBY) {
    const toggleCat = (c) =>
      setSelectedCategories((p) => (p.includes(c) ? (p.length > 1 ? p.filter((x) => x !== c) : p) : [...p, c]));
    const addCW = () => {
      if (customInput.trim()) {
        setCustomWords((p) => [...p, customInput.trim()]);
        setCustomInput("");
        if (!selectedCategories.includes("custom"))
          setSelectedCategories((p) => [...p, "custom"]);
      }
    };

    return (
      <div dir={dir} className={`min-h-screen ${themeBg} flex flex-col`}>
        <div className="flex-1 overflow-y-auto p-4 pb-28 no-scroll">
          <div className="w-full max-w-md mx-auto space-y-4">
            {/* Header */}
            <div className="text-center pt-2 space-y-1">
              <div className="float">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 tracking-tight">
                  {t.title}
                </h1>
              </div>
              <p className={`${themeSub} text-base font-medium`}>{t.subtitle}</p>
            </div>

            {/* Top controls: language, theme, leaderboard */}
            <div className="flex gap-2 justify-center">
              <div className={`${themeCard} rounded-full p-1 flex gap-1`}>
                {[["he", "🇮🇱"], ["en", "🇬🇧"]].map(([l, f]) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    aria-label={l === "he" ? "עברית" : "English"}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${lang === l ? activePill : themeText + " opacity-60"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setLightTheme(!lightTheme)}
                aria-label={lightTheme ? (lang === "he" ? "מצב כהה" : "Dark mode") : lang === "he" ? "מצב בהיר" : "Light mode"}
                className={`${themeCard} rounded-full px-4 py-2 text-sm font-bold ${themeText}`}
                title={lightTheme ? "Dark mode" : "Light mode"}
              >
                {lightTheme ? "🌙" : "☀️"}
              </button>
              <button
                type="button"
                onClick={() => setShowLeaderboard(true)}
                aria-label={t.leaderboard}
                className={`${themeCard} rounded-full px-4 py-2 text-sm font-bold ${themeText}`}
              >
                🏆
              </button>
            </div>

            {/* Teams */}
            <div className={`${themeCard} rounded-2xl p-4 space-y-3`}>
              <div className="flex justify-between items-center">
                <p className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.team}</p>
                {teams.length < 4 && (
                  <button onClick={() => setTeams((p) => [...p, { name: "", score: 0 }])} className="text-amber-500 text-xs font-bold">
                    + {t.addTeam}
                  </button>
                )}
              </div>
              {teams.map((tm, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${TEAM_THEMES[i].bg} flex items-center justify-center text-xl shrink-0`}>
                    {TEAM_THEMES[i].icon}
                  </div>
                  <input type="text" placeholder={`${t.team} ${i + 1}`} value={tm.name}
                    onChange={(e) => setTeams((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    className={`flex-1 ${themeInput} border rounded-xl px-3 py-2.5 font-semibold outline-none focus:border-amber-400/50 transition-all text-sm`} dir={dir} />
                  {teams.length > 2 && (
                    <button onClick={() => setTeams((p) => p.filter((_, j) => j !== i))} className="text-red-400 text-xs font-bold px-2">✕</button>
                  )}
                </div>
              ))}
            </div>

            {/* Game Mode */}
            <div className={`${themeCard} rounded-2xl p-4 space-y-3`}>
              <p className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.gameMode}</p>
              <div className="flex gap-2">
                {[["normal", t.normal, "🎯"], ["poison", t.poison, "☠️"], ["taboo", t.taboo, "🚫"]].map(([m, l, ic]) => (
                  <button key={m} onClick={() => setGameMode(m)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${gameMode === m ? activePill : inactivePill}`}>
                    {ic} {l}
                  </button>
                ))}
              </div>
              {gameMode !== "normal" && (
                <p className={`text-xs ${themeSub} text-center`}>
                  {gameMode === "poison" ? "☠️ " + t.modeDescPoison : "🚫 " + t.modeDescTaboo}
                </p>
              )}
            </div>

            {/* Categories */}
            <div className={`${themeCard} rounded-2xl p-4 space-y-3`}>
              <p className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.category}</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(t.categories).map(([k, l]) => (
                  <button key={k} onClick={() => toggleCat(k)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${selectedCategories.includes(k) ? activePill + " scale-105" : inactivePill}`}>
                    {l}
                  </button>
                ))}
                {customWords.length > 0 && (
                  <button onClick={() => toggleCat("custom")}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${selectedCategories.includes("custom") ? activePill + " scale-105" : inactivePill}`}>
                    ✏️ {t.customCategory} ({customWords.length})
                  </button>
                )}
              </div>
            </div>

            {/* Custom Words */}
            <div className={`${themeCard} rounded-2xl p-4 space-y-3`}>
              <p className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.customWords}</p>
              <div className="flex gap-2">
                <input type="text" value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCW()} placeholder={t.placeholder} dir={dir}
                  className={`flex-1 ${themeInput} border rounded-xl px-3 py-2.5 font-semibold outline-none text-sm`} />
                <button onClick={addCW} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm active:scale-95">
                  {t.addWord}
                </button>
              </div>
              {customWords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customWords.map((w, i) => (
                    <span key={i} className={`${inactivePill} px-3 py-1 rounded-full text-xs flex items-center gap-1`}>
                      {w}
                      <button onClick={() => setCustomWords((p) => p.filter((_, j) => j !== i))} className="text-red-400 font-bold">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Difficulty */}
            <div className={`${themeCard} rounded-2xl p-4 space-y-3`}>
              <p className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.difficulty}</p>
              <div className="flex gap-2">
                {[["all", t.allLevels], ["easy", "⭐" + t.easy], ["medium", "⭐⭐" + t.medium], ["hard", "⭐⭐⭐" + t.hard]].map(([d, l]) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${difficulty === d ? activePill : inactivePill}`}>
                    {l}
                  </button>
                ))}
              </div>
              {difficulty !== "all" && (
                <p className={`text-xs ${themeSub} text-center`}>
                  {t.pointsPerCorrect}: {DIFFICULTY_POINTS[DIFFICULTY_MAP[difficulty]]}
                </p>
              )}
            </div>

            {/* Kids Mode */}
            <div className={`${themeCard} rounded-2xl p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">👶</span>
                <span className={`${themeText} text-sm font-bold`}>{t.kidsMode}</span>
              </div>
              <button onClick={() => setKidsMode(!kidsMode)}
                className={`w-14 h-8 rounded-full transition-all relative ${kidsMode ? "bg-amber-500" : lightTheme ? "bg-slate-200" : "bg-white/20"}`}>
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${kidsMode ? (isRTL ? "left-1" : "right-1") : (isRTL ? "right-1" : "left-1")}`} />
              </button>
            </div>

            {/* Timer & Win Condition */}
            <div className={`${themeCard} rounded-2xl p-4 space-y-4`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.timer}</span>
                  <span className="text-amber-500 font-bold text-sm">{timerDuration}{t.seconds.charAt(0)}</span>
                </div>
                <input type="range" min="30" max="120" step="10" value={timerDuration}
                  onChange={(e) => setTimerDuration(+e.target.value)}
                  className={`w-full ${lightTheme ? "bg-slate-200" : "bg-white/10"}`} />
              </div>
              <div className="flex items-center justify-between">
                <span className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.winCondition}</span>
                <div className={`${lightTheme ? "bg-slate-100" : "bg-white/10"} rounded-full p-1 flex gap-1`}>
                  <button onClick={() => setWinCondition("rounds")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${winCondition === "rounds" ? activePill : themeText + " opacity-60"}`}>
                    {t.byRounds}
                  </button>
                  <button onClick={() => setWinCondition("score")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${winCondition === "score" ? activePill : themeText + " opacity-60"}`}>
                    {t.byScore}
                  </button>
                </div>
              </div>
              {winCondition === "rounds" ? (
                <div className="flex items-center justify-between">
                  <span className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.rounds}</span>
                  <div className="flex gap-2">
                    {[2, 3, 5, 7].map((n) => (
                      <button key={n} onClick={() => setTotalRounds(n)}
                        className={`w-9 h-9 rounded-xl font-bold text-sm transition-all ${totalRounds === n ? "bg-amber-500 text-white shadow-lg" : inactivePill}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.targetScore}</span>
                  <div className="flex gap-2">
                    {[30, 50, 75, 100].map((n) => (
                      <button key={n} onClick={() => setTargetScore(n)}
                        className={`px-3 h-9 rounded-xl font-bold text-sm transition-all ${targetScore === n ? "bg-amber-500 text-white shadow-lg" : inactivePill}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sound & Vibration */}
            <div className={`${themeCard} rounded-2xl p-4 flex gap-3`}>
              <button onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${soundEnabled ? activePill : inactivePill}`}>
                {soundEnabled ? "🔊" : "🔇"} {t.sound}
              </button>
              <button onClick={() => setVibrationEnabled(!vibrationEnabled)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${vibrationEnabled ? activePill : inactivePill}`}>
                {vibrationEnabled ? "📳" : "📴"} {t.vibration}
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Start Button */}
        <div
          className="fixed bottom-0 left-0 right-0 p-4 safe-area-pb"
          style={{ background: lightTheme ? "linear-gradient(transparent, rgb(249 250 251) 30%)" : "linear-gradient(transparent, rgb(15 10 40) 30%)" }}
        >
          <button
            type="button"
            onClick={() => {
              sound.resumeAudio();
              setTeams((p) => p.map((x) => ({ ...x, score: 0 })));
              setCurrentTeamIdx(0);
              setRoundNum(1);
              setRoundCategoryKey(null);
              setPhase(PHASE.CATEGORY_PICK);
            }}
            className="w-full max-w-md mx-auto block py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white text-lg font-black shadow-2xl shadow-orange-500/30 active:scale-95 transition-all pulse"
          >
            {t.startGame}
          </button>
        </div>
      </div>
    );
  }

  // ─── READY SCREEN ──────────────────────────────────────────────
  if (phase === PHASE.READY) {
    return (
      <div dir={dir} className={`min-h-screen bg-gradient-to-br ${teamTheme.bg} flex items-center justify-center p-4`}>
        <div className="text-center space-y-8">
          <div className="space-y-2">
            <p className="text-white/70 text-lg font-semibold uppercase tracking-widest">{t.round} {roundNum}</p>
            <h2 className="text-4xl font-black text-white">
              {isRTL ? `${t.teamTurn} ${teamName(currentTeamIdx)}` : `${teamName(currentTeamIdx)}${t.teamTurn}`}
            </h2>
          </div>
          <div className="text-8xl font-black text-white pop" key={readyCount}>{readyCount || "🎯"}</div>
          <p className="text-white/60 text-lg">{t.getReady}</p>
          {gameMode !== "normal" && (
            <div className="bg-black/20 rounded-xl px-4 py-2 inline-block">
              <span className="text-white/80 text-sm font-semibold">
                {gameMode === "poison" ? "☠️ " + t.poison : "🚫 " + t.taboo}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── PLAYING SCREEN ────────────────────────────────────────────
  if (phase === PHASE.PLAYING) {
    return (
      <div dir={dir}
        className={`min-h-screen bg-gradient-to-br ${teamTheme.bg} flex flex-col select-none`}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

        {/* Exit confirm */}
        {showExitConfirm && (
          <div
            className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-dialog-title"
          >
            <div className={`${themeCard} rounded-2xl p-6 max-w-sm w-full space-y-4 text-center`}>
              <p id="exit-dialog-title" className={`text-xl font-black ${themeText}`}>
                {t.confirmExitTitle}
              </p>
              <p className={`text-sm ${themeSub}`}>{t.confirmExitBody}</p>
              <div className="flex gap-3 flex-col sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className={`flex-1 py-3 rounded-xl font-bold ${inactivePill}`}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={resetGame}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white active:scale-95"
                >
                  {t.exitGame}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pause overlay */}
        {isPaused && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setIsPaused(false)}>
            <div className="text-center space-y-6" onClick={(e) => e.stopPropagation()}>
              <p className="text-6xl">⏸</p>
              <p className="text-white text-3xl font-black">{t.paused}</p>
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="px-8 py-4 rounded-2xl bg-white text-slate-800 font-black text-xl active:scale-95"
              >
                {t.resume}
              </button>
            </div>
          </div>
        )}

        {/* Bonus popup */}
        {showBonus && (
          <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
            <div className="bonus-pop bg-amber-400 text-white px-8 py-4 rounded-3xl shadow-2xl">
              <p className="text-2xl font-black">⏱ +{DEFAULTS.STREAK_BONUS_SECONDS}s {t.bonusTime}</p>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between p-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="bg-black/20 rounded-full px-3 py-1.5 text-white text-xs font-bold shrink-0"
              aria-label={t.exitGame}
            >
              {t.back}
            </button>
            <span className="text-xl">{teamTheme.icon}</span>
            <span className="text-white font-bold text-sm truncate">{teamName(currentTeamIdx)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {streak >= 2 && (
              <div className="bg-amber-500/30 rounded-full px-3 py-1">
                <span className="text-amber-200 text-xs font-bold">🔥{streak}</span>
              </div>
            )}
            <div className="bg-black/20 rounded-full px-3 py-1">
              <span className="text-white/70 text-xs font-semibold">R{roundNum}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPaused(true)}
              className="bg-black/20 rounded-full w-8 h-8 flex items-center justify-center"
              aria-label={t.pause}
            >
              <span className="text-white text-sm">⏸</span>
            </button>
          </div>
        </div>

        {/* Center: Timer + WordCard */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <TimerRing time={timeLeft} max={timerDuration} size={120} />

          <WordCard
            word={currentWordData?.word || ""}
            tabooWords={currentWordData?.taboo || []}
            isPoison={currentWordData?.isPoison || false}
            mode={gameMode}
            difficulty={difficulty !== "all" ? currentWordData?.d : 0}
            points={pts(currentWordData?.d)}
            swipeOffset={swipeOffset}
            swipeAnim={swipeAnim}
            poisonShake={poisonShake}
            lang={lang}
          />

          <div className="flex gap-4 text-white/70 text-sm font-semibold">
            <span className="bg-emerald-500/20 px-3 py-1 rounded-full">✓ {roundWords.filter((w) => w.correct).length}</span>
            <span className="bg-red-500/20 px-3 py-1 rounded-full">✗ {roundWords.filter((w) => !w.correct).length}</span>
          </div>
          <p className="text-white/30 text-xs">{t.swipeHint}</p>
        </div>

        {/* Action buttons */}
        <div className={`p-4 safe-area-pb flex gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={handleSkip}
            disabled={currentWordData?.isPoison}
            aria-label={t.skip}
            className={`flex-1 py-5 rounded-2xl text-lg font-black shadow-xl active:scale-95 transition-all border-2 ${
              currentWordData?.isPoison
                ? "bg-gray-500/50 border-gray-400/30 text-white/40"
                : "bg-red-500/90 border-red-400/30 text-white"
            }`}
          >
            {currentWordData?.isPoison ? "🔒" : t.skip}
          </button>
          <button
            type="button"
            onClick={handleGotIt}
            aria-label={t.gotIt}
            className="flex-1 py-5 rounded-2xl bg-emerald-500/90 text-white text-lg font-black shadow-xl active:scale-95 transition-all border-2 border-emerald-400/30"
          >
            {t.gotIt}
          </button>
        </div>
      </div>
    );
  }

  // ─── ROUND SUMMARY ─────────────────────────────────────────────
  if (phase === PHASE.SUMMARY) {
    const correct = roundWords.filter((w) => w.correct).length;
    const skipped = roundWords.filter((w) => !w.correct).length;
    const score = getRoundScore();

    return (
      <div dir={dir} className={`min-h-screen ${themeBg} flex flex-col p-4`}>
        <div className="text-center space-y-2 py-3">
          <p className={`${themeSub} text-xs font-bold uppercase tracking-widest`}>{t.roundSummary}</p>
          <h2 className={`text-2xl font-black ${themeText}`}>{teamName(currentTeamIdx)}</h2>
          <div className="flex justify-center gap-6 mt-2">
            <div className="text-center"><p className="text-3xl font-black text-emerald-500">{correct}</p><p className="text-xs text-emerald-500/60 font-semibold">{t.correct}</p></div>
            <div className="text-center"><p className="text-3xl font-black text-red-400">{skipped}</p><p className="text-xs text-red-400/60 font-semibold">{t.skipped}</p></div>
            <div className="text-center"><p className="text-3xl font-black text-amber-500">{score}</p><p className="text-xs text-amber-500/60 font-semibold">{t.points}</p></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 py-2 max-h-[40vh] no-scroll">
          {roundWords.map((w, i) => (
            <button key={i} onClick={() => toggleWord(i)}
              className={`slide-up w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border ${
                w.correct
                  ? lightTheme ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/20"
                  : lightTheme ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20"
              }`}
              style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}>
              <div className="flex items-center gap-2">
                <span className={`${themeText} font-semibold`}>{w.word}</span>
                {w.isPoison && <span className="text-xs">☠️</span>}
              </div>
              <span className="text-xl">{w.correct ? "✅" : "❌"}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {teams.map((tm, i) => (
            <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              i === currentTeamIdx ? themeCard : lightTheme ? "bg-slate-50" : "bg-white/5"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{TEAM_THEMES[i].icon}</span>
                <span className={`${themeText} font-bold text-sm`}>{teamName(i)}</span>
              </div>
              <span className="text-amber-500 font-black text-lg">
                {tm.score}{i === currentTeamIdx ? ` + ${score}` : ""}
              </span>
            </div>
          ))}
        </div>
        <button onClick={confirmRound}
          className="mt-4 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white text-lg font-black shadow-2xl shadow-orange-500/30 active:scale-95 transition-all">
          {t.nextTeam}
        </button>
      </div>
    );
  }

  // ─── GAME OVER ─────────────────────────────────────────────────
  if (phase === PHASE.GAMEOVER) {
    const final = teams.map((tm, i) => ({ ...tm, idx: i })).sort((a, b) => b.score - a.score);
    const isTie = final[0].score === final[1].score;
    const medals = ["🥇", "🥈", "🥉", "4️⃣"];

    return (
      <div dir={dir} className={`min-h-screen ${themeBg} flex items-center justify-center p-4`}>
        {CONFETTI_ITEMS.map(({ idx, left, animationDelay, animationDuration }) => (
          <div key={idx} className="confetti"
            style={{ left, animationDelay, animationDuration }}>
            {["🎉", "🎊", "⭐", "✨", "🌟", "💫", "🎯", "🏆"][idx % 8]}
          </div>
        ))}
        <div className="w-full max-w-md text-center space-y-6 reveal">
          <div className="space-y-2">
            <p className={`${themeSub} text-sm font-bold uppercase tracking-widest`}>{t.gameOver}</p>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-rose-400">
              {isTie ? t.tie : `🏆 ${t.winner} 🏆`}
            </h1>
            {!isTie && (
              <div className="mt-4">
                <span className="text-5xl">{TEAM_THEMES[final[0].idx].icon}</span>
                <p className={`text-3xl font-black ${themeText} mt-2`}>{teamName(final[0].idx)}</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {final.map((tm, r) => (
              <div key={tm.idx}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl ${
                  r === 0 ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/30 scale-105" : themeCard
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{medals[r]}</span>
                  <span className="text-xl">{TEAM_THEMES[tm.idx].icon}</span>
                  <span className={`${themeText} font-bold text-lg`}>{teamName(tm.idx)}</span>
                </div>
                <span className={`font-black text-2xl ${r === 0 ? "text-amber-400" : themeSub}`}>{tm.score}</span>
              </div>
            ))}
          </div>
          <button onClick={resetGame}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white text-xl font-black shadow-2xl shadow-orange-500/30 active:scale-95 transition-all">
            {t.playAgain}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
