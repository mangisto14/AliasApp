// ═══════════════════════════════════════════════════════════════════
// src/data/gameConfig.js
// All game constants, word banks (bilingual), i18n, team themes, phases
// ═══════════════════════════════════════════════════════════════════

export const PHASE = Object.freeze({
  LOBBY: "lobby", READY: "ready", PLAYING: "playing",
  SUMMARY: "summary", GAMEOVER: "gameover",
  LEADERBOARD: "leaderboard", CATEGORY_PICK: "category_pick",
});

export const TEAM_THEMES = [
  { bg: "from-orange-500 to-rose-500", icon: "🔥" },
  { bg: "from-cyan-500 to-blue-600", icon: "🌊" },
  { bg: "from-emerald-500 to-teal-600", icon: "🌿" },
  { bg: "from-violet-500 to-purple-600", icon: "⚡" },
];

export const DIFFICULTY_POINTS = { 1: 1, 2: 2, 3: 3 };
export const DIFFICULTY_MAP = { easy: 1, medium: 2, hard: 3 };

export const DEFAULTS = {
  TIMER_DURATION: 60, TOTAL_ROUNDS: 3, TARGET_SCORE: 50,
  STREAK_BONUS_THRESHOLD: 3, STREAK_BONUS_SECONDS: 5,
  POISON_CHANCE: 0.2, MIN_POOL_SIZE: 5,
};

// ═══════════════════════════════════════════════════════════════════
// WORD BANK — dynamic dictionary loader (memory friendly)
// ═══════════════════════════════════════════════════════════════════
const CATEGORY_IMPORTERS = {
  general: () => import("./dictionary/general.json"),
  animals: () => import("./dictionary/animals.json"),
  food: () => import("./dictionary/food.json"),
  actions: () => import("./dictionary/actions.json"),
  movies: () => import("./dictionary/movies.json"),
  places: () => import("./dictionary/places.json"),
  professions: () => import("./dictionary/professions.json"),
  history: () => import("./dictionary/history.json"),
  israeliana: () => import("./dictionary/israeliana.json"),
  tech: () => import("./dictionary/tech.json"),
};

const categoryCache = new Map();

function normalizeCategoryRows(rows) {
  const normalized = { he: [], en: [] };
  if (!Array.isArray(rows)) return normalized;
  rows.forEach((row) => {
    if (!row?.word || !Array.isArray(row?.taboo) || !row?.lang) return;
    if (row.lang !== "he" && row.lang !== "en") return;
    normalized[row.lang].push({
      word: row.word,
      d: row.d ?? 1,
      taboo: row.taboo,
    });
  });
  return normalized;
}

export async function loadCategoryWords(category) {
  const importer = CATEGORY_IMPORTERS[category];
  if (!importer) return { he: [], en: [] };
  if (categoryCache.has(category)) return categoryCache.get(category);
  const mod = await importer();
  const normalized = normalizeCategoryRows(mod?.default || []);
  categoryCache.set(category, normalized);
  return normalized;
}

// ─── KIDS WORDS ────────────────────────────────────────────────────
export const KIDS_WORDS = {
  he: [
    {word:"כלב",d:1,taboo:["נובח","חיה","זנב"]},{word:"חתול",d:1,taboo:["מיאו","חיה","פרווה"]},
    {word:"שמש",d:1,taboo:["שמיים","חם","צהוב"]},{word:"ירח",d:1,taboo:["לילה","שמיים","עגול"]},
    {word:"בית",d:1,taboo:["גר","דלת","חלון"]},{word:"עץ",d:1,taboo:["עלים","יער","גזע"]},
    {word:"פרח",d:1,taboo:["גן","יפה","צבעוני"]},{word:"ים",d:1,taboo:["מים","גלים","חוף"]},
    {word:"כדור",d:1,taboo:["עגול","משחק","בועט"]},{word:"תפוח",d:1,taboo:["פרי","אדום","עץ"]},
    {word:"גלידה",d:1,taboo:["קר","מתוק","גביע"]},{word:"מכונית",d:1,taboo:["נוסע","גלגלים","כביש"]},
    {word:"אריה",d:1,taboo:["חיה","שואג","מלך"]},{word:"ציפור",d:1,taboo:["עפה","כנפיים","שרה"]},
    {word:"דג",d:1,taboo:["מים","שוחה","סנפיר"]},{word:"פרפר",d:1,taboo:["עף","צבעוני","כנפיים"]},
    {word:"כוכב",d:1,taboo:["שמיים","נוצץ","לילה"]},{word:"גשם",d:1,taboo:["מים","ענן","רטוב"]},
    {word:"שלג",d:1,taboo:["קר","לבן","חורף"]},{word:"עוגה",d:1,taboo:["מתוק","יום הולדת","נרות"]},
    {word:"רכבת",d:1,taboo:["פסים","נוסעת","תחנה"]},{word:"מטוס",d:1,taboo:["עף","שמיים","נוסעים"]},
    {word:"ארנב",d:1,taboo:["אוזניים","קופץ","גזר"]},{word:"קוף",d:1,taboo:["בננה","עץ","מצחיק"]},
  ],
  en: [
    {word:"Dog",d:1,taboo:["bark","animal","tail"]},{word:"Cat",d:1,taboo:["meow","animal","fur"]},
    {word:"Sun",d:1,taboo:["sky","hot","yellow"]},{word:"Moon",d:1,taboo:["night","sky","round"]},
    {word:"House",d:1,taboo:["live","door","window"]},{word:"Tree",d:1,taboo:["leaves","forest","trunk"]},
    {word:"Flower",d:1,taboo:["garden","pretty","colorful"]},{word:"Ocean",d:1,taboo:["water","waves","beach"]},
    {word:"Ball",d:1,taboo:["round","play","kick"]},{word:"Apple",d:1,taboo:["fruit","red","tree"]},
    {word:"Ice Cream",d:1,taboo:["cold","sweet","cone"]},{word:"Car",d:1,taboo:["drive","wheels","road"]},
    {word:"Lion",d:1,taboo:["animal","roar","king"]},{word:"Bird",d:1,taboo:["fly","wings","sing"]},
    {word:"Fish",d:1,taboo:["water","swim","fins"]},{word:"Butterfly",d:1,taboo:["fly","colorful","wings"]},
    {word:"Star",d:1,taboo:["sky","twinkle","night"]},{word:"Rain",d:1,taboo:["water","cloud","wet"]},
    {word:"Snow",d:1,taboo:["cold","white","winter"]},{word:"Cake",d:1,taboo:["sweet","birthday","candles"]},
    {word:"Train",d:1,taboo:["tracks","ride","station"]},{word:"Airplane",d:1,taboo:["fly","sky","passengers"]},
    {word:"Rabbit",d:1,taboo:["ears","hop","carrot"]},{word:"Monkey",d:1,taboo:["banana","tree","funny"]},
  ],
};

// ═══════════════════════════════════════════════════════════════════
// I18N — Full UI translation strings
// ═══════════════════════════════════════════════════════════════════
export const UI = {
  he: {
    title:"אליאס",subtitle:"משחק מילים למסיבות",startGame:"בואו נשחק!",team:"קבוצה",score:"נקודות",
    round:"סיבוב",gotIt:"נכון! ✓",skip:"דלג ✗",nextTeam:"הקבוצה הבאה",roundSummary:"סיכום סיבוב",
    correct:"נכון",skipped:"דילוג",getReady:"התכוננו!",teamTurn:"התור של",
    category:"קטגוריה",
    categories:{general:"כללי",animals:"חיות",food:"אוכל",actions:"פעולות",movies:"סרטים",places:"מקומות",professions:"מקצועות",history:"היסטוריה",israeliana:"ישראליאנה",tech:"טכנולוגיה"},
    timer:"טיימר",seconds:"שניות",winner:"המנצחים!",tie:"תיקו!",gameOver:"סוף המשחק!",
    rounds:"סיבובים",playAgain:"שחקו שוב",difficulty:"רמת קושי",easy:"קל",medium:"בינוני",
    hard:"קשה",allLevels:"הכל",gameMode:"מצב משחק",normal:"רגיל",poison:"מילה רעילה",
    taboo:"טאבו",poisonWarning:"אסור לדלג!",tabooForbidden:"מילים אסורות",
    kidsMode:"מצב ילדים",streak:"רצף",bonusTime:"בונוס זמן!",addTeam:"הוסף קבוצה",
    removeTeam:"הסר",winCondition:"תנאי ניצחון",byRounds:"לפי סיבובים",byScore:"לפי ניקוד",
    targetScore:"יעד",points:"נקודות",pause:"השהה",resume:"המשך",paused:"מושהה",
    customWords:"מילים מותאמות",addWord:"הוסף",placeholder:"הכנס מילה...",
    customCategory:"מותאם אישית",sound:"סאונד",vibration:"רטט",
    leaderboard:"טבלת מובילים",noHistory:"אין היסטוריה עדיין",back:"חזרה",
    chooseCategory:"בחר קטגוריה לסיבוב",pointsPerCorrect:"נקודות למילה",
    modeDescPoison:"20% מהמילים רעילות — אסור לדלג!",
    modeDescTaboo:"מילים אסורות מוצגות — אל תגידו אותן!",
    swipeHint:"← דלג | נכון →",
    exitGame:"יציאה",
    confirmExitTitle:"לצאת מהמשחק?",
    confirmExitBody:"ההתקדמות בסיבוב הנוכחי תיאבד.",
    cancel:"ביטול",
  },
  en: {
    title:"ALIAS",subtitle:"The Party Word Game",startGame:"Let's Play!",team:"Team",score:"Score",
    round:"Round",gotIt:"Got it! ✓",skip:"Skip ✗",nextTeam:"Next Team",roundSummary:"Round Summary",
    correct:"Correct",skipped:"Skipped",getReady:"Get Ready!",teamTurn:"'s Turn",
    category:"Category",
    categories:{general:"General",animals:"Animals",food:"Food",actions:"Actions",movies:"Movies",places:"Places",professions:"Professions",history:"History",israeliana:"Israeliana",tech:"Tech"},
    timer:"Timer",seconds:"seconds",winner:"Winners!",tie:"It's a Tie!",gameOver:"Game Over!",
    rounds:"Rounds",playAgain:"Play Again",difficulty:"Difficulty",easy:"Easy",medium:"Medium",
    hard:"Hard",allLevels:"All",gameMode:"Game Mode",normal:"Normal",poison:"Poison Word",
    taboo:"Taboo",poisonWarning:"Can't skip!",tabooForbidden:"Forbidden words",
    kidsMode:"Kids Mode",streak:"Streak",bonusTime:"Bonus Time!",addTeam:"Add Team",
    removeTeam:"Remove",winCondition:"Win Condition",byRounds:"By Rounds",byScore:"By Score",
    targetScore:"Target",points:"points",pause:"Pause",resume:"Resume",paused:"Paused",
    customWords:"Custom Words",addWord:"Add",placeholder:"Enter a word...",
    customCategory:"Custom",sound:"Sound",vibration:"Vibration",
    leaderboard:"Leaderboard",noHistory:"No history yet",back:"Back",
    chooseCategory:"Choose category for round",pointsPerCorrect:"Points per word",
    modeDescPoison:"20% of words will be poisoned — can't skip!",
    modeDescTaboo:"Forbidden words shown — don't say them!",
    swipeHint:"← Skip | Correct →",
    exitGame:"Exit",
    confirmExitTitle:"Leave game?",
    confirmExitBody:"Current round progress will be lost.",
    cancel:"Cancel",
  },
};
