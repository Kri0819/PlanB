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

---

## Hotfix (same v0.1.5)
剛剛推上去的版本部署後出現 `Failed to compile` / `Expected ';', '}' or <eof>`
（`components/PlanBApp.jsx:33:1`）。原因：更新版本說明註解時，
str_replace 只換掉了舊註解區塊的「第一行」，舊註解剩下的內容沒有被清掉，
變成一段沒有包在 `/* ... */` 裡的裸露文字，直接被當成程式碼解析，
導致語法錯誤。

修復方式：刪除那段孤立在註解區塊外面的殘留文字。修好後重新用 Node 驗證
過整支檔案：`/*` 與 `*/` 數量對稱（26/26）、大括號與小括號都平衡、
Memory Merge／Decision Engine 全流程重新跑過一次，結果與修復前完全一致。

這次的教訓：balance-check（大括號/小括號計數）不會抓到這種「文字掉出
註解區塊」的錯誤，因為註解本來就不影響括號平衡。以後修改大段註解時，
會直接用「取代整個舊註解區塊（含開頭與結尾）」的方式，而不是只換開頭
那一行。

---

# v0.1.5.1 — Wake-Time Detection & Fabricated-History Cleanup

實測發現的兩個真實問題。

## 問題一：起床時間偵測不到

「我最近都早上六點就起來了」完全沒被分類到任何規則，掉到通用閒聊回覆。
原因：`detectDirectStatement` 有睡覺時間的規則（「十一點睡」），但沒有
對應的「起床時間」規則——這是個明確的漏洞，不是語氣問題。

修法：新增起床時間偵測（阿拉伯數字跟中文數字都支援），存成 Memory
（`habit` 分類，內容「習慣 06:00 起床」）。刻意沒有寫回
`profile.sleep`——那個欄位是「23:30 – 07:30」這種一整串的區間字串，用
regex 去精準置換其中一半風險太高，寧可準確記在 Memory 裡，也不要冒著
用錯字串處理方式把整個睡眠區間弄壞的風險。

## 問題二：一開始就在講沒發生過的事

「在我們還沒有任何認識的情況下，他說我睡到很晚」——這個抓得更準。

畫面最前面那兩句「我發現你這星期有四天，都是下午兩點才吃第一餐。」
「昨天也是，今天也是。」是 v0.1.1 最早期腳本式 demo 寫死的開場白，
從來就不是根據任何真實資料——純粹是示範情境的台詞，但用的是「我發現」
這種語氣，讀起來就像 AI 真的觀察到的事實。v0.1.4 拿掉 step 流程時已經
不會再「新寫入」這兩句，但因為訊息歷史是累加、不會被清空的（這是刻意
的設計，為了不要每天洗掉對話紀錄），任何在 v0.1.4 之前就用過的人，
localStorage 裡永遠會留著這兩句話，每次打開都在講一件從來沒發生過的事。
這正好是 Memory 系統裡 Observation／確認機制想要避免的事——AI 不該把
沒有根據的話講得像事實一樣篤定。

修法：`sanitizeState` 現在會在每次讀取時，過濾掉這兩句已知的、寫死的
虛構開場白（用完全比對，不是模糊比對，不會誤刪其他真實對話），之後不會
再被寫入。真正的對話紀錄不受影響——測試過一個假造的舊資料，過濾後只留下
真實使用者說過的話。也測過邊界情況：如果某個人整段歷史剛好就只有這兩句
（從來沒真的聊過），過濾後會正確退回到一句誠實、根據現在情境算出來的
開場白，而不是留空白畫面。

## 這次也修正了自己的一個失誤
更新版本註解的時候，又犯了跟上一次一樣的錯——只換掉舊註解的第一行，
沒清掉舊註解剩下的內容。這次在存檔前立刻重新讀了一次檔案親眼確認，
抓到後馬上修掉，才繼續往下做。以後每次改版本註解都會先看過整個舊
註解區塊長什麼樣子，一次性整塊換掉，不會再只改第一行。
