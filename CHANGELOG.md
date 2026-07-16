# v0.1.5 — Memory Graph

Memory 不再只是一直增加的一筆一筆資料。這次只重構 Memory 系統本身，
`upsertMemory(state, {category, content, confidence, source})` 的簽章
完全沒變——Decision Engine 的 `applyDecision`、Discussion 的
`handleAcceptMemory` 這些呼叫端一行都沒有改。改的全部在 Memory Engine
內部。Discussion Flow、Decision Engine、Journey、UI、聊天體驗都沒有動。
舊版本檔案都保留。

## 一、Memory Merge
新增 `compareMemoryStatements(existing, new)`，判斷兩句話是不是在講同一
件事：先用 `stripFillers`（去掉「每天／都／固定／通常」這類詞）跟
`stripNegation`（去掉「不／沒／別／無」）取出核心語意，再比對是否相同或
互相包含。判定為「同一件事」時不會新增記錄，而是合併進既有的那一筆：

- 用 `canonicalizeMerged()` 產生統一講法（在核心語意前插入「通常」）
- 每次被提到的原始講法都存進 `sources` 陣列（最多留 12 筆）
- confidence 取兩者的較大值

實測結果完全符合你給的例子：「早餐喝奶茶」／「每天早餐都喝奶茶」／
「早餐固定喝奶茶」三句話合併成一筆，內容變成「早餐通常喝奶茶」，
sources 保留三筆原始講法跟日期。

## 二、Memory Timeline（entry 層級）
每一筆 Memory 現在都有自己的 `history` 陣列，記錄這筆記憶之前的樣子
（日期、內容、當時的 confidence）。這跟原本 About You 頁面顯示的全域
「最近更新」時間軸是分開的兩件事——這個新的 `history` 是掛在每一筆
Memory 自己身上的版本紀錄，AI 讀取時永遠只看 `content`（最新版本），
`history` 只用來查詢，不影響推理。

## 三、Memory Conflict
偵測到新陳述跟既有 Active Memory 語意相同但「否定狀態」相反（例如一個有
「不」一個沒有）時，判定為衝突：

- 舊值被收進同一筆記錄的 `history`（保留，不刪除，可查）
- 這筆記錄本身更新成新的內容，繼續維持 `active`
- 因為是同一筆記錄前後更新，資料庫裡任何時刻都只會有一筆 active 記錄，
  不會出現「喜歡咖啡」跟「不喜歡咖啡」同時存在的情況

實測驗證：「不吃辣」→「最近開始吃辣」、「喜歡咖啡」→「不喜歡咖啡」，
兩組都正確做到只有一筆 active，且都能在 history 裡查到被取代的舊值。

## 四、Memory Weight（分級衰退）
新增 `TIER_META`，六個層級各自的衰退速率：

| 層級 | 衰退速度 | 備註 |
|---|---|---|
| Identity | 不衰退 | 姓名、生日 |
| Health | 不自動封存 | 疾病、過敏、固定用藥——安全考量，不因為沒提起就悄悄失效 |
| Relationship | 極慢 | 家人、伴侶、重要人物 |
| Preference | 慢 | 喜歡／不喜歡 |
| Habit | 中 | 日常習慣、工作型態 |
| Current State | 快 | 最近很累、最近很忙 |

「喜歡奶茶」信心 95 的衰退曲線實測：0 天 95、180 天 79、365 天 63、
730 天剛好是 30（跟你給的例子 95/82/65/30 對得上，730 天那個點完全
精確）。低於門檻（15）會自動封存（`Archived`），不會被刪除。

**重新恢復**：如果封存後的 Memory 又被提到，`upsertMemory` 會找到它、
把它救回來（狀態改回 `active`，confidence 提高到新陳述的信心值），並在
`history` 裡註記「這筆之前被封存過」。實測：「喜歡游泳」封存
（confidence 12）後再被提起（新信心 75），確認正確恢復成 active、
confidence 變成 75。

## 五、Memory Category 改善
`MEMORY_CATEGORIES` 的顯示標籤（`.label`，About You 頁面在用）完全沒變，
只有它背後的衰退資料改成從 `TIER_META` 衍生，單一資料來源，不會兩邊
不同步。既有的六個分類對應到新的層級：

- `habit` / `work` / `long_term_change` → Habit 層級
- `preference` / `dislike` → Preference 層級
- `recent_state` → Current State 層級

另外把 `identity`／`relationship`／`health` 三個新層級也建進
`MEMORY_CATEGORIES`，資料結構先準備好，未來如果要讓分類器開始使用這幾個
新分類，不需要再改一次資料模型。

## 六、Memory Source
新增 `SOURCE_META`，把來源正式分成 Discussion／Journey／My Life／
Profile／AI Observation 五種概念（目前實際上還是只有 `discussion` 跟
`journey_pattern` 兩種來源真的會被寫入，因為指派來源字串的地方在
Decision Engine 裡，這次沒有動）。新增 `isSelfReportedSource()`，可以
判斷一筆記憶是使用者自己說的還是 AI 觀察推論的，資料結構先備好。

## 七、Memory Summary（內部）
新增 `computeMemorySummary(state, limit)`：依目前有效信心值排序，只取
前 15 筆。`buildContext()` 的 `context.activeMemories`（Decision Engine
實際讀取的東西）現在就是呼叫這個函式的結果，不再是把所有 active
Memory 無上限地整包塞進去。因為合併（第一點）已經在寫入時就做掉重複，
這裡等於是「排序 + 設上限」，確保就算 Memory 累積到幾千筆，
context payload 還是穩定大小。

## 沒有動到的部分
Discussion Flow（`decisionEngine`／`classifyMessage`／
`detectDirectStatement` 等）、Journey、UI、聊天體驗完全沒有改一行。
`upsertMemory` 的呼叫端（`applyDecision`、`handleAcceptMemory`）也是
一行都沒動——這次全部的改動都封裝在 Memory Engine 內部。
