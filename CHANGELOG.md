# v0.1.1-hotfix — 修復 client-side runtime error

不是 v0.1.2，Context Engine 完全沒有開始做。這次只修 v0.1.1 部署後出現的
「Application error: a client-side exception has occurred.」。v0.1.1 的
功能、UI、資料結構全部不變，舊版本檔案也都沒有被覆蓋。

## 找到的真正原因

`components/AlongsideApp.jsx` 第 1665 行（About You 頁的 Memory 列表）：

```js
value={`${MEMORY_CATEGORIES[m.category].label} · 信心 ${...}%`}
```

如果任何一筆 Memory 的 `category` 不是六個已知分類之一，
`MEMORY_CATEGORIES[m.category]` 會是 `undefined`，緊接著 `.label` 就丟出
`TypeError: Cannot read properties of undefined (reading 'label')`。因為
整個 App 沒有任何 Error Boundary，這個例外會直接讓 React 整棵樹連帶崩潰，
Next.js 只會顯示通用的「Application error」，看不到真正原因。

更深一層的問題：`migrateToV2()` 當時只補了 `memory`／`relationship`／
`encryption` 三個欄位，`profile`、`discussion`、`todayJourney`、
`tomorrowJourney` 等其他欄位完全沒有做任何檢查，只是直接把舊資料原封不動
攤開進來。只要其中任何一個欄位缺漏、型別不對、或內容壞掉（例如儲存空間滿了
導致寫入寫到一半、或曾經手動在 devtools 改過 localStorage），下一次讀取
時就有機會在某個畫面炸掉，而且每次炸掉的位置可能都不一樣。

## 修復內容（對照你列的六點）

**1. Console 錯誤與堆疊** — 已在上方指出實際崩潰的檔案、行號與例外類型。

**2. 檢查 localStorage 相容性** — 確認問題不只是「v1 缺欄位」，而是「v1
或 v2 資料裡任何一個欄位都可能不完整」，`migrateToV2` 原本的作法只覆蓋了
一部分風險。

**3. `loadState` 安全處理舊資料／缺欄位／壞資料** — 拿掉 `migrateToV2`，
改成統一的 `sanitizeState(raw)`：不管傳進來的是 `undefined`、`null`、
字串、陣列、還是任意殘缺的物件，一律逐欄位檢查型別並修復，而不是整包
相信或整包丟棄。`JSON.parse` 本身也包在自己的 try/catch，解析失敗（例如
資料被截斷）會直接視為沒有資料，重新建立一份全新的初始狀態。

**4. 所有欄位都有 fallback** — `sanitizeState` 逐一處理：

- `profile` / `notifications` / `healthSync` / `relationship`：與預設值
  做 shallow merge，缺的欄位自動補上
- `memory.entries`：每一筆都驗證 `id`、`category`（必須是六個已知分類
  之一，不是就直接捨棄這一筆，不會讓半張壞資料流進畫面）、`confidence`
  是數字、`status` 是合法值
- `todayJourney` / `tomorrowJourney`：不是陣列或內容不合法就用預設模板
  取代；每個項目的 `iconKey`／`phase`／`status` 都驗證合法性
- `discussion.messages`：過濾掉不是純文字也不是卡片的訊息
- `history`：不是物件就歸零

**5. 壞資料不會讓整個 App crash** — 兩層防護：`sanitizeState` 從源頭
盡量修好資料，讓崩潰的條件根本不成立；新增的 `ErrorBoundary`
（React class component）包住整個 App，作為最後一層防護——就算真的出現
沒預料到的例外，畫面也只會顯示「出了一點問題」＋「重新開始」按鈕，而不是
Next.js 的通用錯誤頁。按下按鈕會清掉這支 App 自己的 localStorage 並重新
整理，這是**明確告知的重置**，不是背地裡默默清空。

**6. 版本號** — `v0.1.1-hotfix`，v0.1.1、v0.1.0 及之前所有版本檔案都沒有
被覆蓋。

## 驗證方式
用 Node 直接測試 `sanitizeState()`（不需要瀏覽器）餵進 11 種情境：
`undefined`、`null`、空物件、字串、陣列、舊 v1 格式、缺 category 的
Memory、category 是亂資料的 Memory、`todayJourney` 是字串、`profile` 是
`null`、`discussion.messages` 混雜 `null`／字串／缺欄位物件——全部都能
正常回傳一份完整可用的 state，沒有拋出例外。另外也驗證了一份完整正常的
舊資料（含 Journey 進度、Memory、Relationship、對話紀錄）在 sanitize 後
完全保留，不會被誤判成壞資料而重置。

## 沒有做的事
- 沒有開始做 v0.1.2 Context Engine
- 沒有改任何 v0.1.1 的功能、文案、UI、資料結構
- 沒有加密（`encryption.enabled` 維持 `false`，不在這次範圍內）
