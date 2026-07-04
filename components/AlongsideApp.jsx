import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, MessageCircle, Leaf, Sun, Moon, Coffee, UtensilsCrossed,
  Footprints, Sparkles, Check, ChevronRight, ChevronDown, Bell, HeartPulse,
  CalendarDays, Cloud, Palette, Download, Upload, Pill, Ban,
  Smartphone, Send, Briefcase, Watch, User as UserIcon,
} from "lucide-react";

/* ----------------------------------------------------------------------
   同行｜Alongside — AI Life Companion
   Design tokens
---------------------------------------------------------------------- */

const COLORS = {
  light: {
    bg: "#F6F5F2",
    phoneBg: "#FBFAF8",
    surface: "#FFFFFF",
    surfaceAlt: "#F0EFEA",
    border: "#E7E5DF",
    textPrimary: "#211F1C",
    textSecondary: "#6E6B64",
    textTertiary: "#A6A29A",
    accent: "#6B8F71",
    accentSoft: "#E4EEE3",
    accent2: "#7480C4",
    accent2Soft: "#E7E9F7",
    userBubble: "#6B8F71",
    userBubbleText: "#FFFFFF",
    aiBubble: "#F0EFEA",
    danger: "#B97A6B",
    shadow: "0 20px 60px rgba(40,38,32,0.10)",
    statusBarText: "#211F1C",
  },
  dark: {
    bg: "#0B0C0C",
    phoneBg: "#141513",
    surface: "#1D1F1C",
    surfaceAlt: "#262824",
    border: "#33352F",
    textPrimary: "#F3F1EC",
    textSecondary: "#A6A29A",
    textTertiary: "#726F68",
    accent: "#84AC8A",
    accentSoft: "#26332A",
    accent2: "#98A2E0",
    accent2Soft: "#282A3C",
    userBubble: "#84AC8A",
    userBubbleText: "#12180F",
    aiBubble: "#262824",
    danger: "#C99184",
    shadow: "0 20px 60px rgba(0,0,0,0.45)",
    statusBarText: "#F3F1EC",
  },
};

const SERIF = "'Newsreader', 'Noto Serif TC', serif";
const SANS = "'Inter', 'Noto Sans TC', -apple-system, sans-serif";

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
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
  `}</style>
);

/* ----------------------------------------------------------------------
   Data
---------------------------------------------------------------------- */

const INITIAL_JOURNEY = [
  { id: "wake", label: "起床", icon: Sun },
  { id: "milktea", label: "奶茶", icon: Coffee },
  { id: "breakfast", label: "早餐", icon: UtensilsCrossed },
  { id: "work", label: "工作", icon: Briefcase },
  { id: "lunch", label: "午餐", icon: UtensilsCrossed },
  { id: "walk", label: "散步", icon: Footprints },
  { id: "skincare", label: "保養", icon: Sparkles },
  { id: "sleep", label: "睡覺", icon: Moon },
];

const TASK_DETAIL = {
  milktea: {
    emoji: "🥛", title: "泡一杯無糖鮮奶茶", sub: "慢慢喝，不用急。",
    reason: "昨天空腹的時間有點長，先讓身體暖一下，不用急著吃正餐。",
  },
  breakfast: {
    emoji: "🍳", title: "簡單吃點早餐", sub: "有吃就好，不用豐盛。",
    reason: "空腹一段時間了，簡單吃點東西，讓身體慢慢醒過來就好。",
  },
  scrollroom: {
    emoji: "📱", title: "去電腦房滑手機", sub: "換個地方，感覺會不太一樣。",
    reason: "還躺在床上很容易越滑越久，換個地方，起床會自然一點。",
  },
  work: {
    emoji: "💻", title: "開始今天的工作", sub: "先從最小的一件事開始。",
    reason: "早上的專注力通常比較好，先做一件小事，開始就不難了。",
  },
  lunch: {
    emoji: "🍽", title: "吃個舒服的午餐", sub: "找個地方，好好坐著吃。",
    reason: "工作了一個上午，讓自己好好吃頓飯，是很值得的休息。",
  },
  walk: {
    emoji: "🚶", title: "出門散步十分鐘", sub: "不用刻意，晃一晃就好。",
    reason: "坐了比較久，起來動一動，等等會更容易靜下心。",
  },
  skincare: {
    emoji: "🧴", title: "簡單保養一下", sub: "洗臉、擦乳液，就好。",
    reason: "一天差不多要結束了，花一點時間照顧自己，慢慢放鬆下來。",
  },
  sleep: {
    emoji: "🌙", title: "準備睡覺了", sub: "放下手機，關燈。",
    reason: "時間差不多了，讓身體知道，可以慢慢進入休息了。",
  },
};

const ENCOURAGEMENTS = [
  "昨天睡得比較少，今天我們放慢一點。",
  "很好，一步一步來就好。",
  "這個步調，感覺還舒服嗎？",
  "最近的節奏越來越穩定了。",
  "不用急，今天時間還很多。",
  "做得很好，剩下的慢慢來。",
];

function statusForStage(id) {
  if (["wake", "milktea", "breakfast", "scrollroom"].includes(id)) return { emoji: "🌞", text: "剛起床" };
  if (id === "work") return { emoji: "💻", text: "工作中" };
  if (id === "lunch") return { emoji: "🍽", text: "午餐時間" };
  if (id === "walk") return { emoji: "🚶", text: "外出中" };
  return { emoji: "🌙", text: "準備睡覺" };
}

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

function Row({ icon: Icon, iconBg, iconColor, title, value, onClick, C, right, isLast }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "13px 14px",
        borderBottom: isLast ? "none" : `1px solid ${C.border}`,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {Icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 9, background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={16} color={iconColor} strokeWidth={2.2} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 500, color: C.textPrimary }}>
          {title}
        </div>
        {value && (
          <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.textSecondary, marginTop: 2 }}>
            {value}
          </div>
        )}
      </div>
      {right !== undefined ? right : (onClick && <ChevronRight size={16} color={C.textTertiary} />)}
    </div>
  );
}

function Card({ children, C, style }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`,
      overflow: "hidden", ...style,
    }}>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------
   Today screen
---------------------------------------------------------------------- */

function TodayScreen({ C, theme, journey, setJourney, goals, msgIndex, setMsgIndex }) {
  const [checking, setChecking] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const currentIdx = journey.findIndex((s) => s.status === "current");
  const current = currentIdx >= 0 ? journey[currentIdx] : null;
  const allDone = currentIdx === -1;
  const status = statusForStage(current ? current.id : journey[journey.length - 1].id);
  const detail = current ? TASK_DETAIL[current.id] : null;

  const dateLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "long" });
  }, []);

  function handleComplete() {
    if (!current || checking || exiting) return;
    setChecking(true);
    setTimeout(() => setExiting(true), 260);
    setTimeout(() => {
      setJourney((prev) => {
        const next = prev.map((s) => ({ ...s }));
        const i = next.findIndex((s) => s.id === current.id);
        next[i].status = "done";
        const followingIdx = next.findIndex((s, idx) => idx > i && s.status === "upcoming");
        if (followingIdx !== -1) next[followingIdx].status = "current";
        return next;
      });
      setMsgIndex((i) => (i + 1) % ENCOURAGEMENTS.length);
      setChecking(false);
      setExiting(false);
    }, 700);
  }

  const breathe = theme === "dark" ? "breatheDark 3.4s ease-in-out infinite" : "breatheLight 3.4s ease-in-out infinite";

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", padding: "14px 24px 26px",
      animation: "screenIn 0.4s ease",
    }}>
      {/* Quiet date, no wordmark, no chrome */}
      <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.textTertiary, marginBottom: 28, textAlign: "center" }}>
        {dateLabel}
      </div>

      {/* AI message — the opening line, like a journal entry */}
      <div style={{ marginBottom: 22, animation: "fadeIn 0.6s ease" }} key={`msg-${msgIndex}`}>
        <p style={{
          fontFamily: SERIF, fontSize: 21, lineHeight: 1.6, color: C.textPrimary,
          margin: 0, fontStyle: "italic", textAlign: "center",
        }}>
          {ENCOURAGEMENTS[msgIndex]}
        </p>
      </div>

      {/* Goals from Discussion, if applied — quiet, no fill */}
      {goals.length > 0 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          {goals.map((g) => (
            <span key={g} style={{
              fontFamily: SANS, fontSize: 11.5, color: C.textTertiary,
              padding: "4px 2px", fontWeight: 500,
            }}>
              🎯 {g}
            </span>
          ))}
        </div>
      )}

      {/* Status — quiet, no color fill */}
      <div style={{
        display: "flex", justifyContent: "center", marginBottom: 34,
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7, background: C.surfaceAlt,
          color: C.textSecondary, padding: "8px 16px", borderRadius: 999,
          fontFamily: SANS, fontSize: 13, fontWeight: 500,
        }}>
          <span>{status.emoji}</span>
          <span>{status.text}</span>
        </div>
      </div>

      {/* The single next-step card — the largest, quietest, most important element */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {!allDone ? (
          <div
            key={current.id}
            style={{
              background: C.surface, borderRadius: 30, padding: "40px 30px 30px",
              boxShadow: theme === "light" ? "0 2px 24px rgba(40,38,32,0.06)" : "0 2px 24px rgba(0,0,0,0.3)",
              textAlign: "center",
              animation: exiting ? "cardExit 0.42s cubic-bezier(.4,0,.2,1) forwards" : "cardEnter 0.5s cubic-bezier(.4,0,.2,1)",
            }}
          >
            <div style={{
              width: 74, height: 74, borderRadius: "50%", background: C.accentSoft,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
              margin: "0 auto 22px", animation: breathe,
            }}>
              {checking ? (
                <Check size={30} color={C.accent} strokeWidth={3} style={{ animation: "popCheck 0.4s ease" }} />
              ) : (
                <span>{detail.emoji}</span>
              )}
            </div>

            <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 600, color: C.textPrimary, marginBottom: 8 }}>
              {detail.title}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 13.5, color: C.textSecondary, marginBottom: 22 }}>
              {detail.sub}
            </div>

            <p style={{
              fontFamily: SERIF, fontStyle: "italic", fontSize: 14.5, lineHeight: 1.75,
              color: C.textTertiary, margin: "0 0 28px", padding: "0 6px",
            }}>
              {detail.reason}
            </p>

            <button
              onClick={handleComplete}
              onPointerDown={() => setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerLeave={() => setPressed(false)}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 999, border: "none",
                background: C.accent, color: "#fff", fontFamily: SANS, fontSize: 15,
                fontWeight: 600, cursor: "pointer",
                transform: pressed ? "scale(0.97)" : "scale(1)",
                transition: "transform 0.15s ease", letterSpacing: 0.5,
              }}
            >
              完成
            </button>
          </div>
        ) : (
          <div style={{
            background: C.surface, borderRadius: 30, padding: "44px 30px", textAlign: "center",
            boxShadow: theme === "light" ? "0 2px 24px rgba(40,38,32,0.06)" : "0 2px 24px rgba(0,0,0,0.3)",
            animation: "cardEnter 0.5s cubic-bezier(.4,0,.2,1)",
          }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>🌙</div>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 19, color: C.textPrimary, marginBottom: 6 }}>
              今天的旅程都完成了。
            </div>
            <div style={{ fontFamily: SANS, fontSize: 13, color: C.textSecondary }}>晚安，好好休息。</div>
          </div>
        )}
      </div>

      {/* Collapsible journey — quiet text toggle, collapsed by default */}
      <div style={{ marginTop: 30 }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", background: "transparent", border: "none", cursor: "pointer",
            padding: "8px 0", fontFamily: SANS, fontSize: 12.5, fontWeight: 500,
            color: C.textTertiary,
          }}
        >
          <span>今天的旅程</span>
          <ChevronDown
            size={13}
            style={{ transition: "transform 0.3s cubic-bezier(.4,0,.2,1)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        <div style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 0.42s cubic-bezier(.4,0,.2,1)",
        }}>
          <div style={{ overflow: "hidden", minHeight: 0 }}>
            <div style={{ position: "relative", padding: "18px 6px 4px" }}>
              <div style={{
                position: "absolute", left: 21, top: 10, bottom: 24, width: 2,
                background: C.border, borderRadius: 2,
              }} />
              {journey.map((stage, i) => {
                const Icon = stage.icon;
                const isDone = stage.status === "done";
                const isCurrent = stage.status === "current";
                return (
                  <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: i === journey.length - 1 ? 0 : 16, position: "relative" }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0, zIndex: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isDone ? C.accent : isCurrent ? C.surface : C.phoneBg,
                      border: isCurrent ? `2px solid ${C.accent}` : isDone ? "none" : `2px solid ${C.border}`,
                      transition: "all 0.3s ease",
                    }}>
                      {isDone ? (
                        <Check size={14} color="#fff" strokeWidth={3} />
                      ) : (
                        <Icon size={13} color={isCurrent ? C.accent : C.textTertiary} strokeWidth={2.2} />
                      )}
                    </div>
                    <span style={{
                      fontFamily: SANS, fontSize: 14,
                      fontWeight: isCurrent ? 600 : 400,
                      color: isDone ? C.textSecondary : isCurrent ? C.textPrimary : C.textTertiary,
                      textDecoration: isDone ? "line-through" : "none",
                      textDecorationColor: C.border,
                    }}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Discussion screen
---------------------------------------------------------------------- */

const SCRIPT = [
  { role: "ai", text: "最近第一餐都很晚。原因是什麼？" },
];

function DiscussionScreen({ C, theme, onApply, applied }) {
  const [messages, setMessages] = useState(SCRIPT);
  const [step, setStep] = useState(0);
  const [showUpdate, setShowUpdate] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, showUpdate]);

  const quickReplies = useMemo(() => {
    if (step === 0) return ["一直躺著滑手機", "工作太忙"];
    if (step === 1) return ["可以", "再想想"];
    return [];
  }, [step]);

  function pushMessage(role, text) {
    setMessages((m) => [...m, { role, text }]);
  }

  function advance(userText) {
    pushMessage("user", userText);
    if (step === 0) {
      setTimeout(() => {
        pushMessage("ai", "如果不要禁止滑手機，改成去電腦房滑，可以嗎？");
        setStep(1);
      }, 550);
    } else if (step === 1) {
      if (userText === "可以") {
        setTimeout(() => {
          pushMessage("ai", "那我們更新你的晨間流程。");
          setStep(2);
          setTimeout(() => setShowUpdate(true), 500);
        }, 550);
      } else {
        setTimeout(() => {
          pushMessage("ai", "沒關係，我們可以再想別的方式。要不要先從「起床先開燈」開始？");
          setStep(3);
        }, 550);
      }
    } else {
      setTimeout(() => {
        pushMessage("ai", "好的，我先記下來，我們晚點再深入聊這個。");
      }, 550);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    advance(text);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, animation: "screenIn 0.35s ease" }}>
      <div style={{ padding: "18px 20px 4px" }}>
        <Eyebrow C={C}>Discussion</Eyebrow>
        <div style={{ fontFamily: SERIF, fontSize: 22, fontStyle: "italic", color: C.textPrimary }}>
          一起設計你的生活
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex", justifyContent: m.role === "ai" ? "flex-start" : "flex-end",
              marginBottom: 10, animation: "fadeSlideUp 0.3s ease",
            }}
          >
            <div style={{
              maxWidth: "78%", padding: "10px 14px", borderRadius: 16,
              borderBottomLeftRadius: m.role === "ai" ? 4 : 16,
              borderBottomRightRadius: m.role === "user" ? 4 : 16,
              background: m.role === "ai" ? C.aiBubble : C.userBubble,
              color: m.role === "ai" ? C.textPrimary : C.userBubbleText,
              fontFamily: SANS, fontSize: 14.5, lineHeight: 1.5,
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {quickReplies.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, marginBottom: 6 }}>
            {quickReplies.map((q) => (
              <button
                key={q}
                onClick={() => advance(q)}
                style={{
                  padding: "8px 14px", borderRadius: 999, border: `1.3px solid ${C.accent2}`,
                  background: "transparent", color: C.accent2, fontFamily: SANS,
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {showUpdate && (
          <div style={{
            marginTop: 14, background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 18, animation: "bobIn 0.4s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <Sparkles size={15} color={C.accent} />
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>
                本次更新
              </span>
            </div>

            <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 8, letterSpacing: 0.4 }}>
              新增
            </div>
            {["起床後泡奶茶", "去電腦房滑手機"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", background: C.accentSoft,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Check size={11} color={C.accent} strokeWidth={3} />
                </div>
                <span style={{ fontFamily: SANS, fontSize: 13.5, color: C.textPrimary }}>{t}</span>
              </div>
            ))}

            <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.textTertiary, margin: "14px 0 8px", letterSpacing: 0.4 }}>
              目標
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {["減少空腹時間", "縮短賴床時間"].map((g) => (
                <span key={g} style={{
                  fontFamily: SANS, fontSize: 12, color: C.accent2, background: C.accent2Soft,
                  padding: "5px 11px", borderRadius: 999, fontWeight: 500,
                }}>
                  {g}
                </span>
              ))}
            </div>

            <button
              onClick={onApply}
              disabled={applied}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 999, border: "none",
                background: applied ? C.accentSoft : C.accent,
                color: applied ? C.accent : "#fff",
                fontFamily: SANS, fontSize: 14, fontWeight: 600,
                cursor: applied ? "default" : "pointer", transition: "all 0.2s ease",
              }}
            >
              {applied ? "已套用到 Today ✓" : "套用到 Today"}
            </button>
          </div>
        )}
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderTop: `1px solid ${C.border}`, background: C.phoneBg,
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="想聊聊什麼？"
          style={{
            flex: 1, border: "none", outline: "none", background: C.surfaceAlt,
            borderRadius: 999, padding: "10px 16px", fontFamily: SANS, fontSize: 14,
            color: C.textPrimary,
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: 38, height: 38, borderRadius: "50%", border: "none",
            background: C.accent, color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   My Life screen
---------------------------------------------------------------------- */

function MyLifeScreen({ C, theme, setTheme }) {
  const [appleHealth, setAppleHealth] = useState(true);
  const [googleHealth, setGoogleHealth] = useState(false);
  const [appleCal, setAppleCal] = useState(true);
  const [googleCal, setGoogleCal] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [quietMode, setQuietMode] = useState(false);
  const [personality, setPersonality] = useState("gentle");

  const personalities = [
    { id: "gentle", label: "溫柔陪伴" },
    { id: "coach", label: "理性教練" },
    { id: "humor", label: "幽默朋友" },
  ];

  return (
    <div style={{ padding: "18px 20px 40px", animation: "screenIn 0.35s ease" }}>
      <Eyebrow C={C}>My Life</Eyebrow>
      <div style={{ fontFamily: SERIF, fontSize: 22, fontStyle: "italic", color: C.textPrimary, marginBottom: 2 }}>
        我的生活
      </div>
      <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.textTertiary }}>
        AI 認識你的地方
      </div>

      <SectionLabel C={C}>個人資訊</SectionLabel>
      <Card C={C}>
        <Row C={C} icon={UserIcon} iconBg={C.accentSoft} iconColor={C.accent} title="姓名與生日" value="尚未設定" onClick={() => {}} isLast />
      </Card>

      <SectionLabel C={C}>工作型態</SectionLabel>
      <Card C={C}>
        <Row C={C} icon={Briefcase} iconBg={C.accent2Soft} iconColor={C.accent2} title="工作型態" value="遠端 · 彈性時間" onClick={() => {}} />
        <Row C={C} icon={CalendarDays} iconBg={C.accent2Soft} iconColor={C.accent2} title="輪班設定" value="無固定班表" onClick={() => {}} isLast />
      </Card>

      <SectionLabel C={C}>生活偏好</SectionLabel>
      <Card C={C}>
        <Row C={C} icon={Moon} iconBg={C.accentSoft} iconColor={C.accent} title="睡眠偏好" value="23:30 – 07:30" onClick={() => {}} />
        <Row C={C} icon={UtensilsCrossed} iconBg={C.accentSoft} iconColor={C.accent} title="飲食偏好" value="少油少糖" onClick={() => {}} />
        <Row C={C} icon={Ban} iconBg={C.accentSoft} iconColor={C.accent} title="不喜歡的食物" value="香菜、內臟" onClick={() => {}} />
        <Row C={C} icon={Pill} iconBg={C.accentSoft} iconColor={C.accent} title="保健食品" value="維他命 D、魚油" onClick={() => {}} />
        <Row C={C} icon={Pill} iconBg={C.accentSoft} iconColor={C.accent} title="固定藥物" value="無" onClick={() => {}} isLast />
      </Card>

      <SectionLabel C={C}>健康資料同步</SectionLabel>
      <Card C={C}>
        <Row C={C} icon={HeartPulse} iconBg={C.accent2Soft} iconColor={C.accent2} title="Apple Health"
          right={<Toggle checked={appleHealth} onChange={setAppleHealth} C={C} />} />
        <Row C={C} icon={HeartPulse} iconBg={C.accent2Soft} iconColor={C.accent2} title="Google Health Connect"
          right={<Toggle checked={googleHealth} onChange={setGoogleHealth} C={C} />} />
        <Row C={C} icon={CalendarDays} iconBg={C.accent2Soft} iconColor={C.accent2} title="Apple 日曆"
          right={<Toggle checked={appleCal} onChange={setAppleCal} C={C} />} />
        <Row C={C} icon={CalendarDays} iconBg={C.accent2Soft} iconColor={C.accent2} title="Google 日曆"
          right={<Toggle checked={googleCal} onChange={setGoogleCal} C={C} />} isLast />
      </Card>

      <SectionLabel C={C}>通知設定</SectionLabel>
      <Card C={C}>
        <Row C={C} icon={Bell} iconBg={C.accentSoft} iconColor={C.accent} title="每日訊息提醒" value="只在你想被想起時"
          right={<Toggle checked={dailyReminder} onChange={setDailyReminder} C={C} />} />
        <Row C={C} icon={Moon} iconBg={C.accentSoft} iconColor={C.accent} title="安靜模式" value="不打擾，不催促"
          right={<Toggle checked={quietMode} onChange={setQuietMode} C={C} />} isLast />
      </Card>

      <SectionLabel C={C}>AI 個性</SectionLabel>
      <Card C={C} style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {personalities.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersonality(p.id)}
              style={{
                flex: 1, padding: "10px 4px", borderRadius: 12, cursor: "pointer",
                border: personality === p.id ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                background: personality === p.id ? C.accentSoft : "transparent",
                color: personality === p.id ? C.accent : C.textSecondary,
                fontFamily: SANS, fontSize: 12.5, fontWeight: 600, transition: "all 0.2s ease",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      <SectionLabel C={C}>外觀</SectionLabel>
      <Card C={C} style={{ padding: 6 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: "light", label: "☀️ 淺色" }, { id: "dark", label: "🌙 深色" }].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              style={{
                flex: 1, padding: "10px 4px", borderRadius: 10, cursor: "pointer", border: "none",
                background: theme === opt.id ? C.surfaceAlt : "transparent",
                color: theme === opt.id ? C.textPrimary : C.textTertiary,
                fontFamily: SANS, fontSize: 13, fontWeight: 600, transition: "all 0.2s ease",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <SectionLabel C={C}>資料</SectionLabel>
      <Card C={C}>
        <Row C={C} icon={Download} iconBg={C.accent2Soft} iconColor={C.accent2} title="匯出我的生活資料" onClick={() => {}} />
        <Row C={C} icon={Upload} iconBg={C.accent2Soft} iconColor={C.accent2} title="匯入資料" onClick={() => {}} isLast />
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Shell: status bar + bottom nav + phone frame
---------------------------------------------------------------------- */

function StatusBar({ C, theme, setTheme }) {
  return (
    <div style={{
      height: 46, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", flexShrink: 0, color: C.statusBarText,
    }}>
      <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600 }}>9:41</span>
      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        style={{
          border: "none", background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", color: C.statusBarText, opacity: 0.7,
        }}
        aria-label="toggle theme"
      >
        {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
      </button>
    </div>
  );
}

function BottomNav({ active, setActive, C }) {
  const tabs = [
    { id: "today", label: "Today", icon: Home },
    { id: "discussion", label: "Discussion", icon: MessageCircle },
    { id: "mylife", label: "My Life", icon: Leaf },
  ];
  const idx = tabs.findIndex((t) => t.id === active);
  return (
    <div style={{
      display: "flex", position: "relative", borderTop: `1px solid ${C.border}`,
      background: C.phoneBg, flexShrink: 0, paddingBottom: 10, paddingTop: 6,
    }}>
      <div style={{
        position: "absolute", top: 6, left: `${idx * (100 / 3)}%`, width: `${100 / 3}%`,
        height: 3, transition: "left 0.32s cubic-bezier(.4,0,.2,1)",
      }}>
        <div style={{ width: 26, height: 3, borderRadius: 3, background: C.accent, margin: "0 auto" }} />
      </div>
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              flex: 1, background: "transparent", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              paddingTop: 8, color: isActive ? C.accent : C.textTertiary,
              transition: "color 0.25s ease",
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.3 : 1.9} />
            <span style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: isActive ? 600 : 500 }}>
              {t.label}
            </span>
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
  const [theme, setTheme] = useState("light");
  const [active, setActive] = useState("today");
  const [journey, setJourney] = useState(INITIAL_JOURNEY);
  const [goals, setGoals] = useState([]);
  const [applied, setApplied] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  const C = COLORS[theme];

  function handleApply() {
    if (applied) return;
    setJourney((prev) => {
      if (prev.some((s) => s.id === "scrollroom")) return prev;
      const next = [...prev];
      const i = next.findIndex((s) => s.id === "milktea");
      next.splice(i + 1, 0, { id: "scrollroom", label: "電腦房滑手機", icon: Smartphone, status: "upcoming" });
      return next;
    });
    setGoals(["減少空腹時間", "縮短賴床時間"]);
    setApplied(true);
  }

  return (
    <div style={{
      minHeight: "100vh", background: theme === "light" ? "#EDECE7" : "#000",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 32,
      transition: "background 0.4s ease",
    }}>
      <GlobalStyle />
      <div style={{
        width: 390, height: 844, borderRadius: 46, overflow: "hidden",
        background: C.phoneBg, boxShadow: C.shadow, border: `8px solid ${theme === "light" ? "#1c1c1e" : "#000"}`,
        display: "flex", flexDirection: "column", position: "relative",
        transition: "background 0.4s ease",
      }}>
        <StatusBar C={C} theme={theme} setTheme={setTheme} />
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: active === "discussion" ? "hidden" : "auto" }}>
          <div key={active} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {active === "today" && (
              <TodayScreen C={C} theme={theme} journey={journey} setJourney={setJourney} goals={goals} msgIndex={msgIndex} setMsgIndex={setMsgIndex} />
            )}
            {active === "discussion" && (
              <DiscussionScreen C={C} theme={theme} onApply={handleApply} applied={applied} />
            )}
            {active === "mylife" && (
              <MyLifeScreen C={C} theme={theme} setTheme={setTheme} />
            )}
          </div>
        </div>
        <BottomNav active={active} setActive={setActive} C={C} />
      </div>
    </div>
  );
}
