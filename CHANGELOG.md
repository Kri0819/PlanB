# v0.1.2 — Context Engine

Discussion 不再是一段腳本，而是每次都根據當下情境回應的對話。這次沒有動
Memory Engine 的資料結構（Classifier／Confidence／Pending Confirmation／
Update Card 全部沿用 v0.1.1），只重構「AI 怎麼決定下一句話」這件事。
舊版本檔案都保留，沒有覆蓋。

## 一、移除所有 step 流程
`discussion.step` / `showUpdate` / `applied` / `followedUp` 全部拿掉，
`switch(step)` 式的固定劇本（milktea → 電腦房 → 套用明天計畫）完全刪除。
取代它的是 `discussion.thread`：一個單一、通用的「現在正在了解什麼」欄位，
不是腳本位置編號，只有一種情況會用到它——需要先問過原因才能調整 Journey。

舊資料如果還留著 `step`/`showUpdate` 等欄位不會出錯，新程式碼完全不會讀
它們；`normalizeDiscussion()` 會確保載入時一定有 `messages`／`thread`
這兩個欄位。

## 二、Context Engine
新增 `buildContext(state)`，組出完整情境快照：

- My Life（`profile`）
- Memory（`activeMemories`，只取目前有效的）
- Journey（今天完成了什麼、還剩什麼、現在進行到哪一項）
- Relationship（`computeRelationshipSummary`）
- 最近幾則對話（`recentMessages`）
- 現在時間、最近幾天的型態（沿用既有的 `computeInsights`／`computeStreak`）

`computeOpener()`／`answerQuestion()`／`encouragementReply()` 都是從這份
情境算出來的，不是固定文案輪播。

## 三、意圖判斷更豐富，但不是每種都要「處理」
每則自由輸入的訊息依序判斷：

1. 有沒有正在進行中的 `thread`（先把上一輪的問題問完）
2. 是不是在陳述／修正自己的資訊（沿用 v0.1.1 的 Memory Classifier，優先權
   最高，行為完全沒變）
3. 是不是對某件 Journey 上的事表達不想做（`detectReluctance`，會去比對
   今天／明天 Journey 裡實際存在的項目名稱，不是寫死的「運動」兩個字）
4. 是不是在抱怨／需要安慰
5. 是不是在問問題（會盡量用真實資料回答，例如「今天完成了幾件事」會直接
   算給你看，而不是隨便回一句）
6. 是不是分享了好消息，需要鼓勵
7. 都不是的話，就是單純聊天——只回覆，不做任何更新

大部分分支最後都只是「回一句話」，沒有更新任何資料。

## 四、Journey 修改一定先理解原因，而且只調整不刪除
使用者說「今天真的不想運動」：

- 如果同一句話已經帶了理由（「今天感冒不想運動」），AI 一次就回應＋調整
- 如果沒有理由，AI 會先問「怎麼了嗎？」，記在 `thread` 裡，等下一句回覆
  才判斷：理由成立（加班／感冒／不舒服／月經／沒睡好／太累）就調整明天
  該項目的 `sub`／`reason` 文字（例如「先休息，不用勉強」），並用卡片告知
  調整了什麼；理由不成立或沒有具體理由，就只有情感上的接住，完全不碰
  Journey 資料

不會出現直接刪除 Journey 項目的情況。

## 五、單純聊天不會被硬套流程
「今天很累」這種話，AI 只會回「辛苦了，今天發生什麼事？」，不會因為聊天
就跑去修改 Journey 或跳出確認卡片——這是刻意的，不是還沒做完。

## 六、Memory Update Card 現在分兩種
沿用 v0.1.1 的卡片外觀，但依內容顯示不同標題：

- 資訊類更新 → 「✓ 已更新 About You」
- Journey 調整 → 「✓ 已調整明天的計畫」

## 七、對話不再每天重置
之前（v0.0.5／v0.1.x）每天開始會「換一組新訊息」，其實等於每天洗掉聊天
紀錄。這次改成：新的一天只是在既有對話後面「多說一句」（`computeOpener`
算出的新開場白），除非還有沒問完的 `thread`（那種情況不打斷），訊息歷史
會保留（上限 60 則，避免無限成長），比較符合「持續一段關係」的感覺。

## 八、語氣
拿掉「我了解了」「我已更新」這類制式客服語。更新事實時的回覆改成「好，
我記下來了。」／修正時是「好，幫你更新一下。」；問題／鼓勵／安慰各自有
對應語氣，卡片本身負責把「到底更新了什麼」講清楚，回覆的文字不需要再
機械式重複一次。

## 沒有動到的部分
`memory.entries`／`getEffectiveConfidence`／`runMemoryDecay`／
`memory.timeline`／`memory.pendingConfirmation`／`relationship` 資料結構
與行為，全部與 v0.1.1 相同，一個欄位都沒有改。
