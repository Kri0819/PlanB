# PlanB — AI 生活夥伴 Prototype

即使生活不嚴謹、不緊湊也沒關係。今天不想做，我們就不做。
生活永遠有 Plan B，你也永遠有選擇的權利。

v0.1.3.2 · Renamed from 同行｜Alongside

## 本機開發

```bash
npm install
npm run dev
```

打開 http://localhost:3000

## 部署到 Vercel

1. 建立一個新的 GitHub repository，把這個資料夾內容 push 上去：

   ```bash
   git init
   git add .
   git commit -m "v0.1.3.2 Rename to PlanB"
   git branch -M main
   git remote add origin <你的 repo URL>
   git push -u origin main
   ```

2. 到 https://vercel.com/new，選擇這個 repository。
3. Framework Preset 選 **Next.js**（Vercel 通常會自動偵測）。
4. 其餘設定保持預設，按 Deploy 即可。

## 專案結構

```
.
├── components/
│   └── PlanBApp.jsx       # 完整 App（Today / Discussion / About You）
├── pages/
│   ├── _app.js
│   ├── _document.js
│   └── index.js
├── package.json
└── next.config.js
```

## 關於改名

產品從「同行｜Alongside」改名為「PlanB」。既有使用者裝置上舊的
localStorage 資料（key: `alongside_state_v1`）會在第一次載入時自動、
安全地搬到新的 key（`planb_state_v1`），Journey、Memory、History、
Discussion 對話紀錄都不會遺失，搬移完成後舊的 key 會被清除，不會留下
重複資料。這個邏輯在 `components/PlanBApp.jsx` 的 `loadState()` 裡。

## 版本紀錄

- **v0.1.3.2** — 產品改名為 PlanB，含 localStorage key 安全遷移
- **v0.1.3.1** — 修復 Memory Classifier 誤判問句為陳述句的 bug
  （例如「我叫什麼名字」被誤存成姓名），並修好 applyDirectStatement
  沒有檢查「這件事是不是已經知道」就直接判定為新資訊的根本問題
- **v0.1.3** — Context Foundation：新增 `buildContext(state)`，
  Memory Classifier 相關函式改讀整理過的情境快照
- **v0.1.1-hotfix** — 修復因不完整 localStorage 資料造成的
  client-side crash，新增 `sanitizeState`／Error Boundary
- **v0.1.1** — Chat Intelligence & Memory Classification
- **v0.1.0** — Memory Engine（信心值、衰退、Observation、Timeline、
  Relationship）
- **v0.0.4.1 / v0.0.4** — 真實 App Shell、UI/UX 重構
- **v0.0.3** — Living Data：Local Storage 持久化、可編輯 Journey
- **v0.0.2** — Today 首頁重新設計
