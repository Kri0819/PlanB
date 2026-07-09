# v0.1.3.2 — Renamed to PlanB

程式名稱從「同行｜Alongside」全面更新為「PlanB」。

## 名字的意思
即使生活不嚴謹、不緊湊也沒關係。今天不想做，我們就不做。
生活永遠有 Plan B，你也永遠有選擇的權利。

## 全面更新了哪些地方

**程式碼**
- `components/AlongsideApp.jsx` → `components/PlanBApp.jsx`（檔名與內部
  註解一併更新）
- `pages/index.js` 的 import 對應更新
- localStorage key：`alongside_state_v1` → `planb_state_v1`
- `loadState()` 新增一次性遷移：新 key 沒有資料時，會自動檢查舊 key，
  把資料讀出來、用既有的 `sanitizeState` 清洗過後存進新 key，再刪除舊
  key——既有使用者的 Journey／Memory／History／Discussion 對話紀錄不會
  遺失，也不會留下新舊兩份重複資料
- 匯出檔名 `alongside-data.json` → `planb-data.json`
- Error Boundary 的 console 訊息 `"Alongside crashed"` → `"PlanB crashed"`
- About You 頁面「已經同行 N 天」改為「已經一起 N 天」（拿掉舊品牌用字，
  意思不變）

**專案設定檔**
- `package.json` 的 `name` 改為 `planb-ai-life-companion`
- `pages/_document.js`：新增 `<title>PlanB — AI 生活夥伴</title>`，
  `<meta name="description">` 改寫為包含品牌理念的文案
- `README.md` 全面改寫，新增「關於改名」段落說明資料遷移邏輯

**資料夾**
- 專案資料夾從 `alongside-app` 改名為 `planb-app`

## 驗證方式
用 Node 模擬一個「舊使用者」情境：在假的 `localStorage` 裡塞一份完整的
`alongside_state_v1` 資料（含姓名、Journey、History、Relationship），
呼叫新版 `loadState()` 後確認：

1. 資料正確讀出（姓名、工作型態、History 都在）
2. 存檔後新 key `planb_state_v1` 出現、舊 key `alongside_state_v1` 被移除
3. 再次載入時直接從新 key 讀取，資料仍然一致

三項都通過，確認改名不會讓任何人原本的資料消失。

## 沒有動到的部分
Today／Discussion／About You 的版面、互動、動畫、Memory Engine、
Context Foundation（buildContext）、Dev Debug Panel、v0.1.3.1 的
Classifier 修復，全部維持不變——這次純粹是名稱與對應的技術遷移。
