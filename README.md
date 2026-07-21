# PlanB — AI 生活夥伴 Prototype

即使生活不嚴謹、不緊湊也沒關係。今天不想做，我們就不做。
生活永遠有 Plan B，你也永遠有選擇的權利。

v0.1.7 · Philosophy Refactor

## 本機開發

```bash
npm install
npm run dev
```

打開 http://localhost:3000

## 部署到 Vercel

1. `git init && git add . && git commit -m "v0.1.7 Philosophy Refactor"`
2. 建一個新的 GitHub repo，`git remote add origin <repo URL>`，`git push -u origin main`
3. 到 https://vercel.com/new 選這個 repo，Framework 選 Next.js，Deploy

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

## 版本紀錄（近期）

- **v0.1.7** — Philosophy Refactor：移除完成率/拖延排名等評分語言，
  AI 改成「重新安排」而非「評價」，新增醫療安全提醒
- **v0.1.5.1** — 起床時間偵測、清除舊版寫死的虛構開場白
- **v0.1.5** — Memory Graph：記憶合併、衝突解決、分級衰退
- **v0.1.4** — Decision Engine：移除 step 腳本流程
- **v0.1.3.x** — Context Foundation、分類器修復
- **v0.1.1-hotfix** — 修復 client-side crash
- **v0.1.0** — Memory Engine
