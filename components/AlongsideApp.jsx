import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, MessageCircle, Leaf, Sun, Moon, Coffee, UtensilsCrossed,
  Footprints, Sparkles, Check, ChevronRight, ChevronDown, Bell, HeartPulse,
  CalendarDays, Download, Upload, Pill, Ban, Smartphone, Send, Briefcase,
  User as UserIcon, Edit3, Trash2, GripVertical, Plus, ArrowRight,
} from "lucide-react";

/* ----------------------------------------------------------------------
   同行｜Alongside — v0.1.0 "Memory"
   AI 開始真正認識使用者：Memory Engine（含信心值、衰退、Observation↔Memory、
   Timeline）、Discussion 直接／經同意寫入 Memory 並自動更新 About You、
   Relationship（內部使用）、以及為未來加密分層預留的資料結構。
---------------------------------------------------------------------- */

const STORAGE_KEY = "alongside_state_v1";

const COLORS = {
  light: {
    bg: "#F6F5F2", phoneBg: "#FBFAF8", surface: "#FFFFFF", surfaceAlt: "#F0EFEA",
    border: "#E7E5DF", textPrimary: "#211F1C", textSecondary: "#6E6B64",
    textTertiary: "#A6A29A", accent: "#6B8F71", accentSoft: "#E4EEE3",
    accent2: "#7480C4", accent2Soft: "#E7E9F7", userBubble: "#6B8F71",
    userBubbleText: "#FFFFFF", aiBubble: "#F0EFEA", danger: "#B97A6B",
    shadow: "0 20px 60px rgba(40,38,32,0.10)", statusBarText: "#211F1C",
  },
  dark: {
    bg: "#0B0C0C", phoneBg: "#141513", surface: "#1D1F1C", surfaceAlt: "#262824",
    border: "#33352F", textPrimary: "#F3F1EC", textSecondary: "#A6A29A",
    textTertiary: "#726F68", accent: "#84AC8A", accentSoft: "#26332A",
    accent2: "#98A2E0", accent2Soft: "#282A3C", userBubble: "#84AC8A",
    userBubbleText: "#12180F", aiBubble: "#262824", danger: "#C99184",
    shadow: "0 20px 60px rgba(0,0,0,0.45)", statusBarText: "#F3F1EC",
  },
};

const SERIF = "'Newsreader', 'Noto Serif TC', serif";
const SANS = "'Inter', 'Noto Sans TC', -apple-system, sans-serif";

// Apple HIG–flavored spring easings: SPRING has a gentle overshoot for small
// elements (chips, bubbles, checkmarks); SPRING_SOFT decelerates smoothly
// with no overshoot, for larger surfaces like the hero card and sheets.
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const SPRING_SOFT = "cubic-bezier(0.32, 0.72, 0, 1)";

const ICONS = { Sun, Moon, Coffee, UtensilsCrossed, Briefcase, Footprints, Sparkles, Smartphone, Pill, HeartPulse, Bell, Home };
const ICON_OPTIONS = ["Sun", "Coffee", "UtensilsCrossed", "Briefcase", "Footprints", "Sparkles", "Moon", "Smartphone", "Pill", "HeartPulse", "Bell", "Home"];

const PHASE_OPTIONS = [
  { id: "morning", emoji: "🌞", label: "早晨" },
  { id: "work", emoji: "💻", label: "工作" },
  { id: "midday", emoji: "🍽", label: "午間" },
  { id: "out", emoji: "🚶", label: "外出" },
  { id: "night", emoji: "🌙", label: "夜晚" },
  { id: "day", emoji: "🌤", label: "其他" },
];
const PHASE_STATUS = {
  morning: { emoji: "🌞", text: "剛起床" },
  work: { emoji: "💻", text: "工作中" },
  midday: { emoji: "🍽", text: "午餐時間" },
  out: { emoji: "🚶", text: "外出中" },
  night: { emoji: "🌙", text: "準備睡覺" },
  day: { emoji: "🌤", text: "忙碌中" },
};

// Fallback lines when no stronger signal applies yet (e.g. very first day,
// no streak, mid-progress with nothing notable) — picked deterministically
// by day-of-year so it still feels calm and non-random, just quietly varied.
const FALLBACK_LINES = [
  "慢慢來就好，不用急。",
  "這個步調，感覺還舒服嗎？",
  "不用急，今天時間還很多。",
  "一步一步來就好。",
];

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

// Consecutive real calendar days (today counts if something's been
// completed today) with at least one completed item. Only counts real
// rollovers, not manual "模擬進入明天" days — that button is for demoing,
// not for inflating a streak that's supposed to reflect real life.
function computeStreak(state) {
  const now = new Date();
  const hasToday = state.todayJourney.some((i) => i.completedAt);
  let streak = hasToday ? 1 : 0;
  for (let back = 1; back < 365; back++) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - back);
    const key = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
    const day = state.history[key];
    if (day && day.entries && day.entries.length > 0) streak += 1;
    else break;
  }
  return streak;
}

function computeGreeting(state) {
  const now = new Date();
  const hour = now.getHours();
  const journey = state.todayJourney;
  const completedToday = journey.filter((i) => i.completedAt).length;
  const total = journey.length;
  const allDone = completedToday > 0 && completedToday >= total;
  const streak = computeStreak(state);

  if (allDone) return "今天都完成了，剩下的時間好好休息。";
  if (streak >= 5) return `已經連續 ${streak} 天了，這個節奏很穩定。`;
  if (streak >= 2 && completedToday === 0 && hour < 11) return `連續 ${streak} 天了，今天也慢慢開始就好。`;
  if (completedToday === 0 && hour < 11) return FALLBACK_LINES[dayOfYear(now) % FALLBACK_LINES.length];
  if (completedToday === 0 && hour >= 11 && hour < 17) return "今天比較忙也沒關係，現在開始也可以。";
  if (completedToday === 0 && hour >= 17) return "晚一點開始，也是開始。";
  if (completedToday === 1) return "開始了，很好。";
  if (completedToday > 1) return `已經完成 ${completedToday} 件事了，繼續這個步調就好。`;
  return FALLBACK_LINES[dayOfYear(now) % FALLBACK_LINES.length];
}

const JOURNEY_TEMPLATE = [
  { id: "wake", label: "起床", iconKey: "Sun", emoji: "🌞", phase: "morning", sub: "新的一天開始了。", reason: "先讓自己醒過來就好，不用急著做什麼。" },
  { id: "milktea", label: "奶茶", iconKey: "Coffee", emoji: "🥛", phase: "morning", sub: "慢慢喝，不用急。", reason: "昨天空腹的時間有點長，先讓身體暖一下，不用急著吃正餐。" },
  { id: "breakfast", label: "早餐", iconKey: "UtensilsCrossed", emoji: "🍳", phase: "morning", sub: "有吃就好，不用豐盛。", reason: "空腹一段時間了，簡單吃點東西，讓身體慢慢醒過來就好。" },
  { id: "work", label: "工作", iconKey: "Briefcase", emoji: "💻", phase: "work", sub: "先從最小的一件事開始。", reason: "早上的專注力通常比較好，先做一件小事，開始就不難了。" },
  { id: "lunch", label: "午餐", iconKey: "UtensilsCrossed", emoji: "🍽", phase: "midday", sub: "找個地方，好好坐著吃。", reason: "工作了一個上午，讓自己好好吃頓飯，是很值得的休息。" },
  { id: "walk", label: "散步", iconKey: "Footprints", emoji: "🚶", phase: "out", sub: "不用刻意，晃一晃就好。", reason: "坐了比較久，起來動一動，等等會更容易靜下心。" },
  { id: "skincare", label: "保養", iconKey: "Sparkles", emoji: "🧴", phase: "night", sub: "洗臉、擦乳液，就好。", reason: "一天差不多要結束了，花一點時間照顧自己，慢慢放鬆下來。" },
  { id: "sleep", label: "睡覺", iconKey: "Moon", emoji: "🌙", phase: "night", sub: "放下手機，關燈。", reason: "時間差不多了，讓身體知道，可以慢慢進入休息了。" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function genId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ----------------------------------------------------------------------
   Memory Engine (v0.1.0)

   This is the AI's curated knowledge about the person — distinct from the
   raw Discussion transcript. Every entry carries content, confidence,
   when it was last confirmed, where it came from, and whether it's still
   considered valid. Everything here lives inside the same localStorage
   blob as the rest of the app (see STORAGE_KEY) — there is no separate
   store. The "layers" below are a logical grouping of the state object's
   own top-level keys, kept deliberately explicit so that if/when real
   end-to-end encryption is added, each layer can be encrypted
   independently without another data-model rewrite:

     chatLayer     -> discussion            (raw conversation)
     memoryLayer   -> memory, relationship  (curated knowledge about the person)
     lifeLayer     -> todayJourney, tomorrowJourney, goals, history
     profileLayer  -> profile, aiPersonality, notifications, healthSync, theme

   `encryption.enabled` is a reserved flag; encryption itself is not
   implemented yet, by design, until this shape has proven itself.
---------------------------------------------------------------------- */

const MEMORY_CATEGORIES = {
  habit: { label: "生活習慣", decays: true, decayRatePerDay: 1.1 },
  work: { label: "工作型態", decays: true, decayRatePerDay: 0.9 },
  preference: { label: "偏好", decays: false, decayRatePerDay: 0 },
  dislike: { label: "不喜歡", decays: false, decayRatePerDay: 0 },
  recent_state: { label: "最近狀態", decays: true, decayRatePerDay: 2.5 },
  long_term_change: { label: "長期變化", decays: true, decayRatePerDay: 0.6 },
};

const MEMORY_ARCHIVE_THRESHOLD = 15; // effective confidence below this -> quietly archived
const TIMELINE_ACTION_LABEL = { add: "新增", update: "更新", remove: "移除", archive: "封存" };

function genMemId() {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// The confidence a memory shows *right now*, factoring in decay since it
// was last confirmed. Nothing is mutated here — this is read-time only,
// so it's always safe to call from a render.
function getEffectiveConfidence(mem, now) {
  const meta = MEMORY_CATEGORIES[mem.category];
  if (!meta || !meta.decays || mem.status !== "active") return mem.confidence;
  const days = (now - new Date(mem.lastUpdate)) / 86400000;
  return Math.max(0, Math.round(mem.confidence - days * meta.decayRatePerDay));
}

function addTimelineEntry(memory, action, label) {
  const entry = { id: genMemId(), date: todayStr(), action, label };
  return [entry, ...memory.timeline].slice(0, 40);
}

// Add or refresh a memory. If an active memory with the same category +
// content already exists, this reinforces it (confidence takes the max,
// lastUpdate resets) rather than creating a duplicate.
function upsertMemory(state, { category, content, confidence, source }) {
  const now = new Date().toISOString();
  const existing = Object.values(state.memory.entries).find(
    (m) => m.category === category && m.content === content && m.status !== "archived"
  );
  const entries = { ...state.memory.entries };
  let action = "update";
  let id;
  if (existing) {
    id = existing.id;
    entries[id] = { ...existing, confidence: Math.max(existing.confidence, confidence), lastUpdate: now, status: "active", source };
  } else {
    id = genMemId();
    entries[id] = { id, category, content, confidence, lastUpdate: now, source, status: "active", createdAt: now };
    action = "add";
  }
  const timeline = addTimelineEntry(state.memory, action, content);
  return { ...state, memory: { ...state.memory, entries, timeline } };
}

function forgetMemory(state, id) {
  const mem = state.memory.entries[id];
  if (!mem) return state;
  const entries = { ...state.memory.entries, [id]: { ...mem, status: "archived" } };
  const timeline = addTimelineEntry(state.memory, "remove", mem.content);
  return { ...state, memory: { ...state.memory, entries, timeline } };
}

// Run once per app load: anything whose effective confidence has quietly
// decayed past the threshold gets archived (with a timeline record), so
// stale "facts" don't linger forever just because no one revisited them.
function runMemoryDecay(state) {
  const now = new Date();
  let entries = state.memory.entries;
  let timeline = state.memory.timeline;
  let changed = false;
  Object.values(entries).forEach((mem) => {
    if (mem.status !== "active") return;
    const meta = MEMORY_CATEGORIES[mem.category];
    if (!meta || !meta.decays) return;
    if (getEffectiveConfidence(mem, now) <= MEMORY_ARCHIVE_THRESHOLD) {
      entries = { ...entries, [mem.id]: { ...mem, status: "archived" } };
      timeline = [{ id: genMemId(), date: todayStr(), action: "archive", label: mem.content }, ...timeline].slice(0, 40);
      changed = true;
    }
  });
  return changed ? { ...state, memory: { ...state.memory, entries, timeline } } : state;
}

// Things the person states directly about themselves in Discussion get
// remembered right away — no need to ask, they said it outright.
function detectDirectStatement(text) {
  const sleepMatch = text.match(/(\d{1,2})[:：]?(\d{2})?\s*點半?\s*睡/);
  if (sleepMatch && /每天|通常|習慣|都/.test(text)) {
    const hh = sleepMatch[1].padStart(2, "0");
    const mm = sleepMatch[2] || (text.includes("半") ? "30" : "00");
    return { category: "habit", content: `習慣 ${hh}:${mm} 睡覺`, confidence: 90, field: "sleep", value: `${hh}:${mm}` };
  }
  if (/加班/.test(text)) {
    return { category: "work", content: "最近常常加班", confidence: 85, field: "workType", value: "最近常常加班" };
  }
  if (/很忙|忙翻|忙死|忙不過來/.test(text)) {
    return { category: "work", content: "最近工作比較忙碌", confidence: 82, field: "workType", value: "最近比較忙碌" };
  }
  const dislikeMatch = text.match(/(?:討厭|不喜歡|不吃)([^\s，。！？,.!?]{1,6})/);
  if (dislikeMatch) {
    const item = dislikeMatch[1];
    return { category: "dislike", content: `不喜歡${item}`, confidence: 88, field: "dislikedFoods", value: item, appendField: true };
  }
  return null;
}

function applyDirectStatement(state, statement) {
  let next = upsertMemory(state, { category: statement.category, content: statement.content, confidence: statement.confidence, source: "discussion" });
  if (statement.field) {
    const profile = { ...next.profile };
    if (statement.appendField) {
      const existingVal = profile[statement.field] || "";
      if (!existingVal.includes(statement.value)) {
        profile[statement.field] = existingVal ? `${existingVal}、${statement.value}` : statement.value;
      }
    } else {
      profile[statement.field] = statement.value;
    }
    next = { ...next, profile };
  }
  return next;
}

// Patterns the AI notices on its own (from what's actually been completed
// over time) are treated as inferences, not facts — these must be
// confirmed before becoming a Memory. Deliberately conservative: needs a
// real run of history and a strong, consistent signal.
function detectInferredCandidate(state) {
  const historyEntries = Object.values(state.history).map((d) => d.entries || []);
  if (historyEntries.length < 3) return null;
  const freq = {};
  historyEntries.forEach((entries) => entries.forEach((e) => { freq[e.label] = (freq[e.label] || 0) + 1; }));
  const totalDays = historyEntries.length;
  const watchWords = ["奶茶", "咖啡", "散步"];
  const [label] = Object.entries(freq)
    .filter(([l, count]) => count / totalDays >= 0.8 && watchWords.some((w) => l.includes(w)))
    .sort((a, b) => b[1] - a[1])[0] || [];
  if (!label) return null;
  const content = `喜歡${label}`;
  const already = Object.values(state.memory.entries).some((m) => m.content === content && m.status !== "archived");
  const declined = (state.memory.declinedSignatures || []).includes(content);
  if (already || declined) return null;
  return { category: "preference", content, confidence: 70, source: "journey_pattern" };
}

function phraseForCandidate(candidate) {
  if (candidate.category === "preference") return `你好像很${candidate.content}。`;
  return `${candidate.content}。`;
}

/* ----------------------------------------------------------------------
   Relationship — internal only, never rendered to the person. Tracks how
   much they engage with Discussion and how often they accept what the AI
   notices, so future versions can let the AI adapt its own tone/pacing
   without needing a settings toggle for it.
---------------------------------------------------------------------- */

function bumpRelationshipOpened(state) {
  const r = state.relationship;
  return {
    ...state,
    relationship: {
      ...r,
      totalDiscussions: r.totalDiscussions + 1,
      firstInteraction: r.firstInteraction || new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
    },
  };
}

function computeRelationshipSummary(relationship) {
  const days = relationship.firstInteraction
    ? Math.max(1, Math.round((Date.now() - new Date(relationship.firstInteraction)) / 86400000))
    : 1;
  const chatFrequency = Math.round((relationship.totalDiscussions / days) * 100) / 100;
  const totalResponses = relationship.acceptedCount + relationship.declinedCount;
  const acceptRate = totalResponses > 0 ? Math.round((relationship.acceptedCount / totalResponses) * 100) : null;
  const trust = Math.min(100, Math.round(relationship.totalDiscussions * 3 + (acceptRate || 50) * 0.5));
  return { chatFrequency, acceptRate, trust };
}

function ensureCurrent(items) {
  if (items.length === 0) return items;
  if (items.some((i) => i.status === "current")) return items;
  const idx = items.findIndex((i) => i.status !== "done");
  if (idx === -1) return items;
  return items.map((it, i) => (i === idx ? { ...it, status: "current" } : it));
}

function createInitialState() {
  return {
    version: 2,
    theme: "light",
    lastOpenedDate: todayStr(),
    profile: {
      name: "", birthday: "", workType: "遠端 · 彈性時間", shift: "無固定班表",
      sleep: "23:30 – 07:30", diet: "少油少糖", dislikedFoods: "香菜、內臟",
      supplements: "維他命 D、魚油", medications: "無",
    },
    aiPersonality: "gentle",
    notifications: { dailyReminder: true, quietMode: false },
    healthSync: { appleHealth: true, googleHealth: false, appleCal: true, googleCal: false },
    goals: [],
    todayJourney: JOURNEY_TEMPLATE.map((t, i) => ({ ...t, status: i === 0 ? "current" : "upcoming", completedAt: null })),
    tomorrowJourney: JOURNEY_TEMPLATE.map((t) => ({ ...t, status: "upcoming", completedAt: null })),
    history: {},
    memory: { entries: {}, timeline: [], pendingConfirmation: null, declinedSignatures: [] },
    relationship: { totalDiscussions: 0, firstInteraction: null, lastInteraction: null, acceptedCount: 0, declinedCount: 0 },
    encryption: { enabled: false },
    discussion: {
      messages: [
        { role: "ai", text: "我發現你這星期有四天，都是下午兩點才吃第一餐。" },
        { role: "ai", text: "昨天也是，今天也是。要不要一起想想看？" },
      ],
      step: 0, showUpdate: false, applied: false,
    },
  };
}

function migrateToV2(parsed) {
  return {
    ...parsed,
    version: 2,
    memory: parsed.memory || { entries: {}, timeline: [], pendingConfirmation: null, declinedSignatures: [] },
    relationship: parsed.relationship || { totalDiscussions: 0, firstInteraction: null, lastInteraction: null, acceptedCount: 0, declinedCount: 0 },
    encryption: parsed.encryption || { enabled: false },
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.version !== 1 && parsed.version !== 2)) return createInitialState();
    return parsed.version === 1 ? migrateToV2(parsed) : parsed;
  } catch (e) {
    return createInitialState();
  }
}

function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage unavailable — fail silently, prototype still works in-memory */
  }
}

// When a new day begins, decide what Discussion should say. If the last
// conversation actually changed something (applied a plan update) and we
// haven't followed up yet, the AI checks back in — a short, real reason to
// open Discussion again instead of finding yesterday's finished chat.
// Otherwise the conversation is left untouched (still worth having).
function nextDiscussionState(discussion) {
  if (discussion.applied && !discussion.followedUp) {
    return {
      messages: [{ role: "ai", text: "這幾天的晨間流程，感覺怎麼樣？" }],
      step: "followup0", showUpdate: false, applied: true, followedUp: true,
    };
  }
  return discussion;
}

function rollToNextDay(state, opts) {
  const { archiveKey, newDate } = opts || {};
  const entries = state.todayJourney.filter((i) => i.completedAt).map((i) => ({ id: i.id, label: i.label, completedAt: i.completedAt }));
  const history = { ...state.history, [archiveKey || state.lastOpenedDate || "unknown"]: { entries } };
  const newToday = state.tomorrowJourney.map((t, i) => ({ ...t, status: i === 0 ? "current" : "upcoming", completedAt: null }));
  const newTomorrow = newToday.map((t) => ({ ...t, status: "upcoming", completedAt: null }));
  return {
    ...state, history, todayJourney: newToday, tomorrowJourney: newTomorrow,
    discussion: nextDiscussionState(state.discussion),
    lastOpenedDate: newDate || todayStr(),
  };
}

/* ----------------------------------------------------------------------
   Global style
---------------------------------------------------------------------- */

const GlobalStyle = ({ bg }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #__next { height: 100%; margin: 0; padding: 0; overscroll-behavior: none; background: ${bg || "#FBFAF8"}; }
    ::-webkit-scrollbar { display: none; }
    @keyframes fadeSlideUp { from { opacity:0; transform:translateY(14px);} to { opacity:1; transform:translateY(0);} }
    @keyframes fadeIn { from { opacity:0;} to { opacity:1;} }
    @keyframes popCheck { 0%{ transform:scale(0.4); opacity:0;} 55%{ transform:scale(1.18); opacity:1;} 100%{ transform:scale(1); opacity:1;} }
    @keyframes screenIn { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
    @keyframes breatheLight { 0%,100% { box-shadow: 0 0 0 0 rgba(107,143,113,0.30);} 50% { box-shadow: 0 0 0 9px rgba(107,143,113,0);} }
    @keyframes breatheDark { 0%,100% { box-shadow: 0 0 0 0 rgba(132,172,138,0.30);} 50% { box-shadow: 0 0 0 9px rgba(132,172,138,0);} }
    @keyframes bobIn { 0% { opacity:0; transform: scale(0.92) translateY(8px);} 100% { opacity:1; transform: scale(1) translateY(0);} }
    @keyframes cardEnter { 0% { opacity:0; transform: translateY(22px) scale(0.98);} 100% { opacity:1; transform: translateY(0) scale(1);} }
    @keyframes cardExit { 0% { opacity:1; transform: translateY(0) scale(1);} 100% { opacity:0; transform: translateY(-26px) scale(0.98);} }
    @keyframes toastIn { from { opacity:0; transform: translate(-50%,-10px);} to { opacity:1; transform: translate(-50%,0);} }
    @keyframes typingDot { 0%, 60%, 100% { opacity: 0.25; transform: translateY(0);} 30% { opacity: 1; transform: translateY(-2px);} }
  `}</style>
);

/* ----------------------------------------------------------------------
   Small shared UI primitives
---------------------------------------------------------------------- */

function Toggle({ checked, onChange, C }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 46, height: 27, borderRadius: 999, border: "none", padding: 0,
        background: checked ? C.accent : C.border, position: "relative",
        cursor: "pointer", transition: "background 0.25s ease", flexShrink: 0,
      }}
      aria-label="toggle"
    >
      <div style={{
        width: 21, height: 21, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: checked ? 22 : 3,
        transition: "left 0.25s cubic-bezier(.4,0,.2,1)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.28)",
      }} />
    </button>
  );
}

function Eyebrow({ children, C }) {
  return (
    <div style={{
      fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: 1.2,
      textTransform: "uppercase", color: C.textTertiary, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, C }) {
  return (
    <div style={{
      fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: 0.6,
      color: C.textTertiary, margin: "22px 4px 8px",
    }}>
      {children}
    </div>
  );
}

function Card({ children, C, style }) {
  return (
    <div style={{ background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

function Row({ icon: Icon, iconBg, iconColor, title, value, onClick, C, right, isLast }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "13px 14px",
      borderBottom: isLast ? "none" : `1px solid ${C.border}`, cursor: onClick ? "pointer" : "default",
    }}>
      {Icon && (
        <div style={{ width: 30, height: 30, borderRadius: 9, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color={iconColor} strokeWidth={2.2} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 500, color: C.textPrimary }}>{title}</div>
        {value && <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.textSecondary, marginTop: 2 }}>{value}</div>}
      </div>
      {right !== undefined ? right : (onClick && <ChevronRight size={16} color={C.textTertiary} />)}
    </div>
  );
}

function EditableRow({ icon: Icon, iconBg, iconColor, title, value, onSave, C, isLast, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { setDraft(value || ""); }, [value]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={iconColor} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 500, color: C.textPrimary }}>{title}</div>
        {editing ? (
          <input
            autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value || ""); setEditing(false); } }}
            placeholder={placeholder}
            style={{ marginTop: 3, width: "100%", border: "none", outline: "none", background: "transparent", borderBottom: `1px solid ${C.accent}`, fontFamily: SANS, fontSize: 12.5, color: C.textPrimary, padding: "2px 0" }}
          />
        ) : (
          <div onClick={() => setEditing(true)} style={{ fontFamily: SANS, fontSize: 12.5, color: value ? C.textSecondary : C.textTertiary, marginTop: 2, cursor: "pointer" }}>
            {value || placeholder || "點擊設定"}
          </div>
        )}
      </div>
      {!editing && <Edit3 size={13} color={C.textTertiary} onClick={() => setEditing(true)} style={{ cursor: "pointer", flexShrink: 0 }} />}
    </div>
  );
}

function inputStyle(C) {
  return {
    width: "100%", border: `1px solid ${C.border}`, outline: "none", background: C.surface,
    borderRadius: 10, padding: "9px 11px", fontFamily: SANS, fontSize: 13, color: C.textPrimary,
  };
}
function ghostBtnStyle(C) {
  return { flex: 1, padding: "10px 0", borderRadius: 999, border: `1px solid ${C.border}`, background: "transparent", color: C.textSecondary, fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer" };
}
function primaryBtnStyle(C) {
  return { flex: 1, padding: "10px 0", borderRadius: 999, border: "none", background: C.accent, color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer" };
}

/* ----------------------------------------------------------------------
   Journey item form (add / edit)
---------------------------------------------------------------------- */

function JourneyForm({ initial, onSave, onCancel, C }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [emoji, setEmoji] = useState(initial?.emoji || "✨");
  const [sub, setSub] = useState(initial?.sub || "");
  const [reason, setReason] = useState(initial?.reason || "");
  const [iconKey, setIconKey] = useState(initial?.iconKey || "Sparkles");
  const [phase, setPhase] = useState(initial?.phase || "day");

  function save() {
    if (!label.trim()) return;
    onSave({ label: label.trim(), emoji: emoji.trim() || "✨", sub: sub.trim(), reason: reason.trim(), iconKey, phase });
  }

  return (
    <div style={{ padding: "16px 14px 18px", background: C.surfaceAlt, borderRadius: 16, marginTop: 8, marginBottom: 10, animation: `fadeSlideUp 0.5s ${SPRING_SOFT}` }}>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="項目名稱，例如：喝水" style={inputStyle(C)} />
      <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="簡短說明（選填）" style={{ ...inputStyle(C), marginTop: 8 }} />
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="為什麼要做這件事（選填）" rows={2}
        style={{ ...inputStyle(C), marginTop: 8, resize: "none", fontFamily: SANS }} />
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} placeholder="🙂"
          style={{ ...inputStyle(C), width: 52, textAlign: "center", flexShrink: 0 }} />
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {ICON_OPTIONS.map((key) => {
            const IconComp = ICONS[key];
            const active = iconKey === key;
            return (
              <button key={key} onClick={() => setIconKey(key)} style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                background: active ? C.accentSoft : "transparent", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <IconComp size={15} color={active ? C.accent : C.textTertiary} />
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {PHASE_OPTIONS.map((p) => {
          const active = phase === p.id;
          return (
            <button key={p.id} onClick={() => setPhase(p.id)} style={{
              padding: "6px 10px", borderRadius: 999, cursor: "pointer",
              border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
              background: active ? C.accentSoft : "transparent",
              color: active ? C.accent : C.textSecondary,
              fontFamily: SANS, fontSize: 11.5, fontWeight: 500,
            }}>
              {p.emoji} {p.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onCancel} style={ghostBtnStyle(C)}>取消</button>
        <button onClick={save} style={primaryBtnStyle(C)}>儲存</button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Drag-to-reorder hook (no external deps, uniform row height)
---------------------------------------------------------------------- */

const ROW_HEIGHT = 54;

function useDragReorder(items, setItems) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragY, setDragY] = useState(0);
  const startIndexRef = useRef(0);
  const startClientYRef = useRef(0);

  function onPointerDown(id, index, e) {
    e.preventDefault();
    setDraggingId(id);
    startIndexRef.current = index;
    startClientYRef.current = e.clientY;
    setDragY(0);
  }

  useEffect(() => {
    if (!draggingId) return;
    function move(e) {
      const delta = e.clientY - startClientYRef.current;
      setDragY(delta);
      const shift = Math.round(delta / ROW_HEIGHT);
      if (shift === 0) return;
      setItems((prev) => {
        const curIndex = prev.findIndex((i) => i.id === draggingId);
        const newIndex = Math.max(0, Math.min(prev.length - 1, curIndex + shift));
        if (curIndex === newIndex) return prev;
        const next = [...prev];
        const [moved] = next.splice(curIndex, 1);
        next.splice(newIndex, 0, moved);
        return next;
      });
      startIndexRef.current += shift;
      startClientYRef.current = e.clientY;
      setDragY(0);
    }
    function up() { setDraggingId(null); setDragY(0); }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [draggingId, setItems]);

  return { draggingId, dragY, onPointerDown };
}

/* ----------------------------------------------------------------------
   Journey manager: a collapsible, editable, draggable list used for
   both "今天的旅程" and "明天的計畫"
---------------------------------------------------------------------- */

function JourneyManager({ title, items, setItems, C, showStatus, defaultExpanded, footer }) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { draggingId, dragY, onPointerDown } = useDragReorder(items, setItems);

  function handleDelete(id) {
    const item = items.find((i) => i.id === id);
    if (!window.confirm(`要刪除「${item?.label}」嗎？`)) return;
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      return showStatus ? ensureCurrent(next) : next;
    });
  }

  function handleSaveEdit(id, patch) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setEditingId(null);
  }

  function handleAdd(patch) {
    setItems((prev) => {
      const next = [...prev, { id: genId(), status: "upcoming", completedAt: null, ...patch }];
      return showStatus ? ensureCurrent(next) : next;
    });
    setEditingId(null);
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, position: "relative" }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "transparent", border: "none", cursor: "pointer", padding: "8px 0",
            fontFamily: SANS, fontSize: 12.5, fontWeight: 500, color: C.textTertiary,
          }}
        >
          <span>{title}</span>
          <ChevronDown size={13} style={{ transition: `transform 0.5s ${SPRING}`, transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
        </button>
        {expanded && (
          <button
            onClick={() => setEditMode((v) => !v)}
            style={{
              position: "absolute", right: 4, background: "transparent", border: "none",
              cursor: "pointer", color: editMode ? C.accent : C.textTertiary, padding: 6,
            }}
          >
            <Edit3 size={13} />
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateRows: expanded ? "1fr" : "0fr", transition: `grid-template-rows 0.55s ${SPRING_SOFT}` }}>
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div style={{ position: "relative", padding: "10px 4px 4px" }}>
            {!editMode && (
              <div style={{ position: "absolute", left: 19, top: 10, bottom: 24, width: 2, background: C.border, borderRadius: 2 }} />
            )}
            {items.map((stage, i) => {
              const Icon = ICONS[stage.iconKey] || Sparkles;
              const isDone = stage.status === "done";
              const isCurrent = stage.status === "current";
              const isDragging = draggingId === stage.id;
              const isEditingThis = editingId === stage.id;
              return (
                <React.Fragment key={stage.id}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 12, position: "relative",
                      marginBottom: 6, minHeight: ROW_HEIGHT - 6,
                      transform: isDragging ? `translateY(${dragY}px)` : "none",
                      zIndex: isDragging ? 5 : 1,
                      opacity: isDragging ? 0.9 : 1,
                    }}
                  >
                    {editMode && (
                      <div onPointerDown={(e) => onPointerDown(stage.id, i, e)} style={{ cursor: "grab", color: C.textTertiary, touchAction: "none", flexShrink: 0 }}>
                        <GripVertical size={15} />
                      </div>
                    )}
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0, zIndex: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: showStatus && isDone ? C.accent : showStatus && isCurrent ? C.surface : C.phoneBg,
                      border: showStatus && isCurrent ? `2px solid ${C.accent}` : showStatus && isDone ? "none" : `2px solid ${C.border}`,
                      transition: "all 0.3s ease",
                    }}>
                      {showStatus && isDone ? (
                        <Check size={13} color="#fff" strokeWidth={3} />
                      ) : (
                        <Icon size={12} color={showStatus && isCurrent ? C.accent : C.textTertiary} strokeWidth={2.2} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontFamily: SANS, fontSize: 14,
                        fontWeight: showStatus && isCurrent ? 600 : 400,
                        color: showStatus && isDone ? C.textSecondary : showStatus && isCurrent ? C.textPrimary : C.textTertiary,
                        textDecoration: showStatus && isDone ? "line-through" : "none",
                        textDecorationColor: C.border,
                      }}>
                        {stage.label}
                      </span>
                      {showStatus && isDone && stage.completedAt && (
                        <span style={{ fontFamily: SANS, fontSize: 10.5, color: C.textTertiary, marginLeft: 8 }}>
                          {new Date(stage.completedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {editMode && (
                      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                        <Edit3 size={13} color={C.textTertiary} style={{ cursor: "pointer" }} onClick={() => setEditingId(isEditingThis ? null : stage.id)} />
                        <Trash2 size={13} color={C.danger} style={{ cursor: "pointer" }} onClick={() => handleDelete(stage.id)} />
                      </div>
                    )}
                  </div>
                  {isEditingThis && (
                    <JourneyForm C={C} initial={stage} onCancel={() => setEditingId(null)} onSave={(patch) => handleSaveEdit(stage.id, patch)} />
                  )}
                </React.Fragment>
              );
            })}

            {editMode && editingId !== "new" && (
              <button
                onClick={() => setEditingId("new")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  width: "100%", padding: "10px 0", marginTop: 6, borderRadius: 12,
                  border: `1.3px dashed ${C.border}`, background: "transparent",
                  color: C.textSecondary, fontFamily: SANS, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                }}
              >
                <Plus size={13} /> 新增項目
              </button>
            )}
            {editingId === "new" && (
              <JourneyForm C={C} initial={null} onCancel={() => setEditingId(null)} onSave={handleAdd} />
            )}
          </div>
        </div>
      </div>
      {expanded && footer}
    </div>
  );
}

/* ----------------------------------------------------------------------
   Today screen
---------------------------------------------------------------------- */

function TodayScreen({ C, theme, state, setState }) {
  const [checking, setChecking] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [pressed, setPressed] = useState(false);

  const journey = state.todayJourney;
  const currentIdx = journey.findIndex((s) => s.status === "current");
  const current = currentIdx >= 0 ? journey[currentIdx] : null;
  const allDone = currentIdx === -1;
  const status = PHASE_STATUS[(current || journey[journey.length - 1])?.phase || "day"];

  const dateLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "long" });
  }, [state.lastOpenedDate]);

  const greeting = useMemo(() => computeGreeting(state), [state.todayJourney, state.history, state.lastOpenedDate]);

  function setTodayJourney(fn) {
    setState((prev) => ({ ...prev, todayJourney: typeof fn === "function" ? fn(prev.todayJourney) : fn }));
  }
  function setTomorrowJourney(fn) {
    setState((prev) => ({ ...prev, tomorrowJourney: typeof fn === "function" ? fn(prev.tomorrowJourney) : fn }));
  }

  function handleComplete() {
    if (!current || checking || exiting) return;
    setChecking(true);
    setTimeout(() => setExiting(true), 260);
    setTimeout(() => {
      setState((prev) => {
        const next = prev.todayJourney.map((s) => ({ ...s }));
        const i = next.findIndex((s) => s.id === current.id);
        next[i].status = "done";
        next[i].completedAt = new Date().toISOString();
        const followingIdx = next.findIndex((s, idx) => idx > i && s.status === "upcoming");
        if (followingIdx !== -1) next[followingIdx].status = "current";
        return { ...prev, todayJourney: next };
      });
      setChecking(false);
      setExiting(false);
    }, 700);
  }

  function handleSimulateNextDay() {
    if (!window.confirm("模擬進入明天？今天的旅程會被記錄，明天的計畫會變成新的今天。")) return;
    setState((prev) => rollToNextDay(prev, { archiveKey: `sim-${Date.now()}`, newDate: todayStr() }));
  }

  const breathe = theme === "dark" ? "breatheDark 3.4s ease-in-out infinite" : "breatheLight 3.4s ease-in-out infinite";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 26px 28px", animation: `screenIn 0.55s ${SPRING_SOFT}` }}>
      <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.textTertiary, marginBottom: 28, textAlign: "center" }}>
        {dateLabel}
      </div>

      <div style={{ marginBottom: 26, animation: "fadeIn 0.9s ease-out" }} key={greeting}>
        <p style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1.6, color: C.textPrimary, margin: 0, fontStyle: "italic", textAlign: "center" }}>
          {greeting}
        </p>
      </div>

      {state.goals.length > 0 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          {state.goals.map((g) => (
            <span key={g} style={{ fontFamily: SANS, fontSize: 11.5, color: C.textTertiary, padding: "4px 2px", fontWeight: 500 }}>
              🎯 {g}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 34 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.surfaceAlt, color: C.textSecondary, padding: "8px 16px", borderRadius: 999, fontFamily: SANS, fontSize: 13, fontWeight: 500 }}>
          <span>{status.emoji}</span>
          <span>{status.text}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {!allDone ? (
          <div
            key={current.id}
            style={{
              background: C.surface, borderRadius: 34, padding: "48px 32px 34px",
              boxShadow: theme === "light" ? "0 4px 32px rgba(40,38,32,0.07)" : "0 4px 32px rgba(0,0,0,0.35)",
              textAlign: "center",
              animation: exiting ? `cardExit 0.5s ${SPRING_SOFT} forwards` : `cardEnter 0.65s ${SPRING_SOFT}`,
            }}
          >
            <div style={{ width: 92, height: 92, borderRadius: "50%", background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, margin: "0 auto 26px", animation: breathe }}>
              {checking ? <Check size={38} color={C.accent} strokeWidth={3} style={{ animation: `popCheck 0.5s ${SPRING}` }} /> : <span>{current.emoji}</span>}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 23, fontWeight: 600, color: C.textPrimary, marginBottom: 9 }}>{current.label}</div>
            <div style={{ fontFamily: SANS, fontSize: 14, color: C.textSecondary, marginBottom: 24 }}>{current.sub}</div>
            {current.reason && (
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15.5, lineHeight: 1.8, color: C.textTertiary, margin: "0 0 30px", padding: "0 4px" }}>
                {current.reason}
              </p>
            )}
            <button
              onClick={handleComplete}
              onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)}
              style={{
                width: "100%", padding: "16px 0", borderRadius: 999, border: "none", background: C.accent, color: "#fff",
                fontFamily: SANS, fontSize: 15.5, fontWeight: 600, cursor: "pointer",
                transform: pressed ? "scale(0.97)" : "scale(1)", transition: `transform 0.4s ${SPRING}`, letterSpacing: 0.5,
              }}
            >
              完成
            </button>
          </div>
        ) : (
          <div style={{ background: C.surface, borderRadius: 34, padding: "50px 32px", textAlign: "center", boxShadow: theme === "light" ? "0 4px 32px rgba(40,38,32,0.07)" : "0 4px 32px rgba(0,0,0,0.35)", animation: `cardEnter 0.65s ${SPRING_SOFT}` }}>
            <div style={{ fontSize: 36, marginBottom: 18 }}>🌙</div>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 20, color: C.textPrimary, marginBottom: 7 }}>今天的旅程都完成了。</div>
            <div style={{ fontFamily: SANS, fontSize: 13.5, color: C.textSecondary }}>晚安，好好休息。</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 44 }}>
        <JourneyManager title="今天的旅程" items={journey} setItems={setTodayJourney} C={C} showStatus defaultExpanded={false} />
        <JourneyManager
          title="明天的計畫" items={state.tomorrowJourney} setItems={setTomorrowJourney} C={C} showStatus={false} defaultExpanded={false}
          footer={
            <button onClick={handleSimulateNextDay} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
              background: "transparent", border: "none", cursor: "pointer", padding: "10px 0 2px",
              fontFamily: SANS, fontSize: 12, fontWeight: 500, color: C.accent2,
            }}>
              模擬進入明天 <ArrowRight size={12} />
            </button>
          }
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Discussion screen
---------------------------------------------------------------------- */

function DiscussionScreen({ C, theme, state, setState }) {
  const d = state.discussion;
  const scrollRef = useRef(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const openedRef = useRef(false);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [d.messages, d.showUpdate, typing, state.memory.pendingConfirmation]);

  // Once per visit: log that a conversation happened, and — if nothing is
  // already waiting for confirmation — quietly check whether a real
  // behavioral pattern has emerged worth asking about.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    setState((prev) => {
      let next = bumpRelationshipOpened(prev);
      if (!next.memory.pendingConfirmation) {
        const candidate = detectInferredCandidate(next);
        if (candidate) next = { ...next, memory: { ...next.memory, pendingConfirmation: candidate } };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateDiscussion(patch) {
    setState((prev) => ({ ...prev, discussion: { ...prev.discussion, ...(typeof patch === "function" ? patch(prev.discussion) : patch) } }));
  }

  const quickReplies = useMemo(() => {
    if (d.step === 0) return ["最近一直躺著滑手機", "最近比較忙，還沒注意"];
    if (d.step === 1) return ["可以試試", "再想想"];
    if (d.step === "followup0") return ["好很多", "普通，再看看"];
    return [];
  }, [d.step]);

  function pushMessage(role, text) {
    updateDiscussion((prev) => ({ messages: [...prev.messages, { role, text }] }));
  }

  function advance(userText) {
    pushMessage("user", userText);

    const statement = detectDirectStatement(userText);
    if (statement) {
      setState((prev) => applyDirectStatement(prev, statement));
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        pushMessage("ai", `好，我記下來了：${statement.content}`);
      }, 900);
      return;
    }

    if (d.step === 0) {
      if (userText === "最近一直躺著滑手機") {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          pushMessage("ai", "這樣啊。如果不勉強自己戒手機，換個地方滑呢？像是去電腦房。");
          updateDiscussion({ step: 1 });
        }, 900);
      } else {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          pushMessage("ai", "了解，那我們先不特別調整，只是想讓你知道，我有在留意這件事。");
          updateDiscussion({ step: 3 });
        }, 900);
      }
    } else if (d.step === 1) {
      if (userText === "可以試試") {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          pushMessage("ai", "好，那我把這個加進明天的計畫。");
          updateDiscussion({ step: 2 });
          setTimeout(() => updateDiscussion({ showUpdate: true }), 550);
        }, 900);
      } else {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          pushMessage("ai", "沒關係，不用勉強，你想到再跟我說。");
          updateDiscussion({ step: 3 });
        }, 900);
      }
    } else if (d.step === "followup0") {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        pushMessage("ai", userText === "好很多" ? "太好了，那就先維持這樣。" : "沒關係，我們可以再一起調整看看。");
        updateDiscussion({ step: "followupEnd" });
      }, 900);
    } else {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        pushMessage("ai", "好，我先記下來，之後我們可以再聊。");
      }, 900);
    }
  }

  function handleSend() {
    if (typing) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    advance(text);
  }

  function handleApply() {
    if (d.applied) return;
    setState((prev) => {
      let tomorrow = prev.tomorrowJourney;
      if (!tomorrow.some((s) => s.id === "scrollroom")) {
        const i = tomorrow.findIndex((s) => s.id === "milktea");
        const newItem = {
          id: "scrollroom", label: "電腦房滑手機", iconKey: "Smartphone", emoji: "📱", phase: "morning",
          sub: "換個地方，感覺會不太一樣。", reason: "還躺在床上很容易越滑越久，換個地方，起床會自然一點。",
          status: "upcoming", completedAt: null,
        };
        tomorrow = [...tomorrow];
        tomorrow.splice(i === -1 ? tomorrow.length : i + 1, 0, newItem);
      }
      const newGoals = Array.from(new Set([...prev.goals, "減少空腹時間", "縮短賴床時間"]));
      return { ...prev, tomorrowJourney: tomorrow, goals: newGoals, discussion: { ...prev.discussion, applied: true } };
    });
  }

  function handleAcceptMemory() {
    const c = state.memory.pendingConfirmation;
    if (!c) return;
    setState((prev) => {
      let next = upsertMemory(prev, { category: c.category, content: c.content, confidence: c.confidence, source: c.source });
      next = {
        ...next,
        memory: { ...next.memory, pendingConfirmation: null },
        relationship: { ...next.relationship, acceptedCount: next.relationship.acceptedCount + 1, lastInteraction: new Date().toISOString() },
      };
      return next;
    });
    pushMessage("ai", "好，我記住了。");
  }

  function handleDeclineMemory() {
    const c = state.memory.pendingConfirmation;
    if (!c) return;
    setState((prev) => ({
      ...prev,
      memory: {
        ...prev.memory, pendingConfirmation: null,
        declinedSignatures: [...(prev.memory.declinedSignatures || []), c.content].slice(-30),
      },
      relationship: { ...prev.relationship, declinedCount: prev.relationship.declinedCount + 1, lastInteraction: new Date().toISOString() },
    }));
    pushMessage("ai", "好，那我先不記。");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, animation: `screenIn 0.55s ${SPRING_SOFT}` }}>
      <div style={{ padding: "18px 20px 4px" }}>
        <Eyebrow C={C}>Discussion</Eyebrow>
        <div style={{ fontFamily: SERIF, fontSize: 22, fontStyle: "italic", color: C.textPrimary }}>一起設計你的生活</div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
        {d.messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "ai" ? "flex-start" : "flex-end", marginBottom: 10, animation: `fadeSlideUp 0.5s ${SPRING_SOFT}`, animationDelay: `${Math.min(i, 2) * 110}ms`, animationFillMode: "backwards" }}>
            <div style={{
              maxWidth: "78%", padding: "10px 14px", borderRadius: 16,
              borderBottomLeftRadius: m.role === "ai" ? 4 : 16, borderBottomRightRadius: m.role === "user" ? 4 : 16,
              background: m.role === "ai" ? C.aiBubble : C.userBubble, color: m.role === "ai" ? C.textPrimary : C.userBubbleText,
              fontFamily: SANS, fontSize: 14.5, lineHeight: 1.5,
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {typing && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10, animation: `fadeSlideUp 0.4s ${SPRING_SOFT}` }}>
            <div style={{
              display: "flex", gap: 4, alignItems: "center", padding: "12px 16px", borderRadius: 16,
              borderBottomLeftRadius: 4, background: C.aiBubble,
            }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: "50%", background: C.textTertiary,
                  animation: "typingDot 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        {!typing && state.memory.pendingConfirmation && (
          <div style={{ marginTop: 4, marginBottom: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, animation: `bobIn 0.6s ${SPRING}` }}>
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 16, lineHeight: 1.5 }}>💡</span>
              <div style={{ fontFamily: SANS, fontSize: 13.5, color: C.textPrimary, lineHeight: 1.7 }}>
                我發現：{phraseForCandidate(state.memory.pendingConfirmation)}
                <br />要不要讓我記住？
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDeclineMemory} style={ghostBtnStyle(C)}>不用</button>
              <button onClick={handleAcceptMemory} style={primaryBtnStyle(C)}>記住</button>
            </div>
          </div>
        )}

        {quickReplies.length > 0 && !typing && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, marginBottom: 6 }}>
            {quickReplies.map((q) => (
              <button key={q} onClick={() => advance(q)} style={{
                padding: "8px 14px", borderRadius: 999, border: `1.3px solid ${C.accent2}`, background: "transparent",
                color: C.accent2, fontFamily: SANS, fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>
                {q}
              </button>
            ))}
          </div>
        )}

        {d.showUpdate && (
          <div style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, animation: `bobIn 0.6s ${SPRING}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <Sparkles size={15} color={C.accent} />
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>本次更新</span>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 8, letterSpacing: 0.4 }}>新增（明天生效）</div>
            {["起床後泡奶茶", "去電腦房滑手機"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={11} color={C.accent} strokeWidth={3} />
                </div>
                <span style={{ fontFamily: SANS, fontSize: 13.5, color: C.textPrimary }}>{t}</span>
              </div>
            ))}
            <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.textTertiary, margin: "14px 0 8px", letterSpacing: 0.4 }}>目標</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              {["減少空腹時間", "縮短賴床時間"].map((g) => (
                <span key={g} style={{ fontFamily: SANS, fontSize: 12, color: C.accent2, background: C.accent2Soft, padding: "5px 11px", borderRadius: 999, fontWeight: 500 }}>{g}</span>
              ))}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: C.textTertiary, marginBottom: 16 }}>會在明天開始時生效，不影響今天。</div>
            <button onClick={handleApply} disabled={d.applied} style={{
              width: "100%", padding: "11px 0", borderRadius: 999, border: "none",
              background: d.applied ? C.accentSoft : C.accent, color: d.applied ? C.accent : "#fff",
              fontFamily: SANS, fontSize: 14, fontWeight: 600, cursor: d.applied ? "default" : "pointer", transition: "all 0.2s ease",
            }}>
              {d.applied ? "已加入明天的計畫 ✓" : "套用到明天的計畫"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: `1px solid ${C.border}`, background: C.phoneBg }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="想聊聊什麼？" disabled={typing}
          style={{ flex: 1, border: "none", outline: "none", background: C.surfaceAlt, borderRadius: 999, padding: "10px 16px", fontFamily: SANS, fontSize: 14, color: C.textPrimary, opacity: typing ? 0.6 : 1 }}
        />
        <button onClick={handleSend} disabled={typing} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: typing ? "default" : "pointer", flexShrink: 0, opacity: typing ? 0.6 : 1 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Insights — derived purely from existing history + today data.
   No new data is stored; these are just computed at render time.
---------------------------------------------------------------------- */

function computeInsights(state) {
  const recordedDays = Object.keys(state.history).length;
  if (recordedDays === 0) return { recordedDays, ready: false };

  const historyEntries = Object.values(state.history).map((d) => d.entries || []);
  const todayEntries = state.todayJourney.filter((i) => i.completedAt).map((i) => ({ label: i.label, completedAt: i.completedAt }));
  const allDays = [...historyEntries, todayEntries];

  const denom = Math.max(state.todayJourney.length, 1);
  const rates = allDays.map((entries) => entries.length / denom);
  const avgRate = Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100);

  const freq = {};
  allDays.forEach((entries) => {
    const seen = new Set();
    entries.forEach((e) => {
      if (!seen.has(e.label)) { freq[e.label] = (freq[e.label] || 0) + 1; seen.add(e.label); }
    });
  });
  const labels = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
  const mostStable = labels[0] || null;
  let mostDelayed = labels.length > 1 ? labels[labels.length - 1] : null;
  if (mostDelayed === mostStable) mostDelayed = null;

  const firstTimes = allDays
    .filter((entries) => entries.length > 0)
    .map((entries) => {
      const earliest = entries.reduce((a, b) => (new Date(a.completedAt) < new Date(b.completedAt) ? a : b));
      const t = new Date(earliest.completedAt);
      return t.getHours() * 60 + t.getMinutes();
    });
  let avgFirstTimeLabel = null;
  if (firstTimes.length) {
    const avgMin = Math.round(firstTimes.reduce((a, b) => a + b, 0) / firstTimes.length);
    avgFirstTimeLabel = `${String(Math.floor(avgMin / 60)).padStart(2, "0")}:${String(avgMin % 60).padStart(2, "0")}`;
  }

  return { recordedDays, ready: true, avgRate, mostStable, mostDelayed, avgFirstTimeLabel };
}

function InsightCard({ C, label, value, sub }) {
  return (
    <div style={{ flex: "1 1 40%", background: C.surfaceAlt, borderRadius: 18, padding: "16px 16px 14px", minWidth: 0 }}>
      <div style={{ fontFamily: SANS, fontSize: 11.5, color: C.textTertiary, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: 19, fontStyle: "italic", color: C.textPrimary, lineHeight: 1.3 }}>{value}</div>
      {sub && <div style={{ fontFamily: SANS, fontSize: 11, color: C.textTertiary, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------------
   My Life screen
---------------------------------------------------------------------- */

function MyLifeScreen({ C, theme, state, setState, onTestNotification }) {
  const insights = useMemo(() => computeInsights(state), [state.history, state.todayJourney]);
  const now = new Date();
  const activeMemories = useMemo(
    () => Object.values(state.memory.entries).filter((m) => m.status === "active").sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate)),
    [state.memory.entries]
  );
  const timeline = state.memory.timeline.slice(0, 6);

  function setProfileField(key, value) {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, [key]: value } }));
  }
  function setNotif(key, value) {
    setState((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  }
  function setHealth(key, value) {
    setState((prev) => ({ ...prev, healthSync: { ...prev.healthSync, [key]: value } }));
  }
  function setTheme(t) {
    setState((prev) => ({ ...prev, theme: t }));
  }
  function setPersonality(id) {
    setState((prev) => ({ ...prev, aiPersonality: id }));
  }
  function handleForgetMemory(id) {
    const mem = state.memory.entries[id];
    if (!window.confirm(`要請 AI 忘記「${mem?.content}」嗎？`)) return;
    setState((prev) => forgetMemory(prev, id));
  }

  const personalities = [
    { id: "gentle", label: "溫柔陪伴" }, { id: "coach", label: "理性教練" }, { id: "humor", label: "幽默朋友" },
  ];

  return (
    <div style={{ padding: "18px 20px 40px", animation: `screenIn 0.55s ${SPRING_SOFT}` }}>
      <Eyebrow C={C}>About You</Eyebrow>
      <div style={{ fontFamily: SERIF, fontSize: 22, fontStyle: "italic", color: C.textPrimary, marginBottom: 2 }}>關於你</div>
      <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.textTertiary, marginBottom: 22 }}>AI 認識你的地方</div>

      <SectionLabel C={C}>AI 知道的你</SectionLabel>
      {!insights.ready ? (
        <Card C={C} style={{ padding: "22px 20px", background: C.surfaceAlt, border: "none" }}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: C.textSecondary, lineHeight: 1.7 }}>
            才剛開始認識你。陪你多過幾天，這裡會慢慢出現屬於你的觀察。
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <InsightCard C={C} label="已經同行" value={`${insights.recordedDays} 天`} />
          <InsightCard C={C} label="最近完成率" value={`${insights.avgRate}%`} />
          {insights.mostStable && <InsightCard C={C} label="最穩定完成" value={insights.mostStable} />}
          {insights.mostDelayed && <InsightCard C={C} label="最容易拖延" value={insights.mostDelayed} />}
          {insights.avgFirstTimeLabel && <InsightCard C={C} label="平均開始時間" value={insights.avgFirstTimeLabel} sub="第一件完成的事" />}
        </div>
      )}

      {activeMemories.length > 0 && (
        <>
          <SectionLabel C={C}>Memory</SectionLabel>
          <Card C={C}>
            {activeMemories.map((m, i) => (
              <Row
                key={m.id} C={C} title={m.content}
                value={`${MEMORY_CATEGORIES[m.category].label} · 信心 ${getEffectiveConfidence(m, now)}%`}
                right={<Trash2 size={13} color={C.textTertiary} style={{ cursor: "pointer" }} onClick={() => handleForgetMemory(m.id)} />}
                isLast={i === activeMemories.length - 1}
              />
            ))}
          </Card>
        </>
      )}

      {timeline.length > 0 && (
        <>
          <SectionLabel C={C}>最近更新</SectionLabel>
          <Card C={C}>
            {timeline.map((t, i) => (
              <Row key={t.id} C={C} title={t.label} value={`${t.date} · ${TIMELINE_ACTION_LABEL[t.action]}`} isLast={i === timeline.length - 1} />
            ))}
          </Card>
        </>
      )}

      <div style={{ marginTop: 40, marginBottom: 4, textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: C.textTertiary }}>
          設定
        </div>
      </div>

      <SectionLabel C={C}>個人資訊</SectionLabel>
      <Card C={C}>
        <EditableRow C={C} icon={UserIcon} iconBg={C.accentSoft} iconColor={C.accent} title="姓名" value={state.profile.name} placeholder="點擊設定姓名" onSave={(v) => setProfileField("name", v)} />
        <EditableRow C={C} icon={CalendarDays} iconBg={C.accentSoft} iconColor={C.accent} title="生日" value={state.profile.birthday} placeholder="點擊設定生日" onSave={(v) => setProfileField("birthday", v)} isLast />
      </Card>

      <SectionLabel C={C}>工作型態</SectionLabel>
      <Card C={C}>
        <EditableRow C={C} icon={Briefcase} iconBg={C.accent2Soft} iconColor={C.accent2} title="工作型態" value={state.profile.workType} onSave={(v) => setProfileField("workType", v)} />
        <EditableRow C={C} icon={CalendarDays} iconBg={C.accent2Soft} iconColor={C.accent2} title="輪班設定" value={state.profile.shift} onSave={(v) => setProfileField("shift", v)} isLast />
      </Card>

      <SectionLabel C={C}>生活偏好</SectionLabel>
      <Card C={C}>
        <EditableRow C={C} icon={Moon} iconBg={C.accentSoft} iconColor={C.accent} title="睡眠偏好" value={state.profile.sleep} onSave={(v) => setProfileField("sleep", v)} />
        <EditableRow C={C} icon={UtensilsCrossed} iconBg={C.accentSoft} iconColor={C.accent} title="飲食偏好" value={state.profile.diet} onSave={(v) => setProfileField("diet", v)} />
        <EditableRow C={C} icon={Ban} iconBg={C.accentSoft} iconColor={C.accent} title="不喜歡的食物" value={state.profile.dislikedFoods} onSave={(v) => setProfileField("dislikedFoods", v)} />
        <EditableRow C={C} icon={Pill} iconBg={C.accentSoft} iconColor={C.accent} title="保健食品" value={state.profile.supplements} onSave={(v) => setProfileField("supplements", v)} />
        <EditableRow C={C} icon={Pill} iconBg={C.accentSoft} iconColor={C.accent} title="固定藥物" value={state.profile.medications} onSave={(v) => setProfileField("medications", v)} isLast />
      </Card>

      <SectionLabel C={C}>健康資料同步</SectionLabel>
      <Card C={C}>
        <Row C={C} icon={HeartPulse} iconBg={C.accent2Soft} iconColor={C.accent2} title="Apple Health" right={<Toggle checked={state.healthSync.appleHealth} onChange={(v) => setHealth("appleHealth", v)} C={C} />} />
        <Row C={C} icon={HeartPulse} iconBg={C.accent2Soft} iconColor={C.accent2} title="Google Health Connect" right={<Toggle checked={state.healthSync.googleHealth} onChange={(v) => setHealth("googleHealth", v)} C={C} />} />
        <Row C={C} icon={CalendarDays} iconBg={C.accent2Soft} iconColor={C.accent2} title="Apple 日曆" right={<Toggle checked={state.healthSync.appleCal} onChange={(v) => setHealth("appleCal", v)} C={C} />} />
        <Row C={C} icon={CalendarDays} iconBg={C.accent2Soft} iconColor={C.accent2} title="Google 日曆" right={<Toggle checked={state.healthSync.googleCal} onChange={(v) => setHealth("googleCal", v)} C={C} />} isLast />
      </Card>

      <SectionLabel C={C}>通知設定</SectionLabel>
      <Card C={C}>
        <Row C={C} icon={Bell} iconBg={C.accentSoft} iconColor={C.accent} title="每日訊息提醒" value="只在你想被想起時" right={<Toggle checked={state.notifications.dailyReminder} onChange={(v) => setNotif("dailyReminder", v)} C={C} />} />
        <Row C={C} icon={Moon} iconBg={C.accentSoft} iconColor={C.accent} title="安靜模式" value="不打擾，不催促" right={<Toggle checked={state.notifications.quietMode} onChange={(v) => setNotif("quietMode", v)} C={C} />} />
        <Row
          C={C} icon={Send} iconBg={C.accentSoft} iconColor={C.accent} title="傳送測試提醒"
          value={state.notifications.quietMode ? "安靜模式已開啟，暫不提醒" : "看看提醒會長什麼樣子"}
          onClick={state.notifications.dailyReminder && !state.notifications.quietMode ? onTestNotification : undefined}
          right={<ChevronRight size={16} color={state.notifications.dailyReminder && !state.notifications.quietMode ? C.textTertiary : C.border} />}
          isLast
        />
      </Card>

      <SectionLabel C={C}>AI 個性</SectionLabel>
      <Card C={C} style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {personalities.map((p) => (
            <button key={p.id} onClick={() => setPersonality(p.id)} style={{
              flex: 1, padding: "10px 4px", borderRadius: 12, cursor: "pointer",
              border: state.aiPersonality === p.id ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
              background: state.aiPersonality === p.id ? C.accentSoft : "transparent",
              color: state.aiPersonality === p.id ? C.accent : C.textSecondary,
              fontFamily: SANS, fontSize: 12.5, fontWeight: 600, transition: "all 0.2s ease",
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      <SectionLabel C={C}>外觀</SectionLabel>
      <Card C={C} style={{ padding: 6 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: "light", label: "☀️ 淺色" }, { id: "dark", label: "🌙 深色" }].map((opt) => (
            <button key={opt.id} onClick={() => setTheme(opt.id)} style={{
              flex: 1, padding: "10px 4px", borderRadius: 10, cursor: "pointer", border: "none",
              background: state.theme === opt.id ? C.surfaceAlt : "transparent",
              color: state.theme === opt.id ? C.textPrimary : C.textTertiary,
              fontFamily: SANS, fontSize: 13, fontWeight: 600, transition: "all 0.2s ease",
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <SectionLabel C={C}>資料</SectionLabel>
      <Card C={C}>
        <Row C={C} icon={Download} iconBg={C.accent2Soft} iconColor={C.accent2} title="匯出我的生活資料" onClick={() => {
          try {
            const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "alongside-data.json"; a.click();
            URL.revokeObjectURL(url);
          } catch (e) { /* export unavailable in this environment */ }
        }} />
        <Row C={C} icon={Upload} iconBg={C.accent2Soft} iconColor={C.accent2} title="匯入資料" onClick={() => {}} isLast />
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Shell: real full-screen app — no decorative phone frame.
   Bottom nav is pinned with safe-area support; the fake status bar is
   gone (the real device/browser already shows one), replaced by a small
   floating theme toggle.
---------------------------------------------------------------------- */

function ThemeQuickToggle({ theme, setTheme, C }) {
  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label="toggle theme"
      style={{
        position: "absolute", top: "calc(env(safe-area-inset-top) + 10px)", right: 16, zIndex: 40,
        width: 34, height: 34, borderRadius: "50%", border: "none",
        background: C.surfaceAlt, color: C.textSecondary, opacity: 0.9,
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}
    >
      {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}

function BottomNav({ active, setActive, C }) {
  const tabs = [
    { id: "today", label: "Today", icon: Home },
    { id: "discussion", label: "Discussion", icon: MessageCircle },
    { id: "mylife", label: "About You", icon: Leaf },
  ];
  const idx = tabs.findIndex((t) => t.id === active);
  return (
    <div style={{
      display: "flex", position: "relative", borderTop: `1px solid ${C.border}`, background: C.phoneBg,
      flexShrink: 0, paddingTop: 6, paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)",
    }}>
      <div style={{ position: "absolute", top: 6, left: `${idx * (100 / 3)}%`, width: `${100 / 3}%`, height: 3, transition: `left 0.45s ${SPRING_SOFT}` }}>
        <div style={{ width: 26, height: 3, borderRadius: 3, background: C.accent, margin: "0 auto" }} />
      </div>
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = t.id === active;
        return (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            flex: 1, background: "transparent", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            paddingTop: 8, color: isActive ? C.accent : C.textTertiary, transition: "color 0.3s ease",
          }}>
            <Icon size={20} strokeWidth={isActive ? 2.3 : 1.9} />
            <span style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: isActive ? 600 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------
   App
---------------------------------------------------------------------- */

export default function App() {
  const [state, setState] = useState(createInitialState);
  const [active, setActive] = useState("today");
  const [toast, setToast] = useState(null);
  const hydrated = useRef(false);

  // hydrate from localStorage on mount, then check for day rollover
  useEffect(() => {
    const loaded = loadState();
    const today = todayStr();
    let next;
    if (loaded.lastOpenedDate && loaded.lastOpenedDate !== today) {
      next = rollToNextDay(loaded, { newDate: today });
    } else if (!loaded.lastOpenedDate) {
      next = { ...loaded, lastOpenedDate: today };
    } else {
      next = loaded;
    }
    setState(runMemoryDecay(next));
    hydrated.current = true;
  }, []);

  // persist on every change (after initial hydration)
  useEffect(() => {
    if (!hydrated.current) return;
    saveState(state);
  }, [state]);

  const C = COLORS[state.theme];

  function setTheme(t) {
    setState((prev) => ({ ...prev, theme: t }));
  }

  function handleTestNotification() {
    const journey = state.todayJourney;
    const current = journey.find((s) => s.status === "current");
    const text = current ? `${current.emoji} 該${current.label}了` : "今天的旅程都完成了 🌙";
    setToast(text);
    setTimeout(() => setToast(null), 3400);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: C.phoneBg, display: "flex", flexDirection: "column",
      overflow: "hidden", transition: "background 0.4s ease",
    }}>
      <GlobalStyle bg={C.phoneBg} />
      <ThemeQuickToggle theme={state.theme} setTheme={setTheme} C={C} />

      {toast && (
        <div style={{
          position: "absolute", top: "calc(env(safe-area-inset-top) + 14px)", left: "50%", zIndex: 50,
          background: C.textPrimary, color: C.phoneBg, padding: "10px 16px", borderRadius: 999,
          fontFamily: SANS, fontSize: 12.5, fontWeight: 500, animation: `toastIn 0.5s ${SPRING}`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      <div style={{
        flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
        overflow: active === "discussion" ? "hidden" : "auto",
      }}>
        <div key={active} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {active === "today" && <TodayScreen C={C} theme={state.theme} state={state} setState={setState} />}
          {active === "discussion" && <DiscussionScreen C={C} theme={state.theme} state={state} setState={setState} />}
          {active === "mylife" && <MyLifeScreen C={C} theme={state.theme} state={state} setState={setState} onTestNotification={handleTestNotification} />}
        </div>
      </div>

      <BottomNav active={active} setActive={setActive} C={C} />
    </div>
  );
}
