# 同行｜Alongside — AI 生活夥伴 Prototype

v0.0.2 · Today 首頁重新設計

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
   git commit -m "v0.0.2 Today redesign"
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
│   └── AlongsideApp.jsx   # 完整 App（Today / Discussion / My Life）
├── pages/
│   ├── _app.js
│   ├── _document.js
│   └── index.js
├── package.json
└── next.config.js
```

## 版本紀錄

- **v0.0.2** — Today 首頁重新設計：單一「下一步」卡片、Journey 預設收合、
  加入自然語氣的「為什麼」說明、整體視覺更安靜。Discussion / My Life 未變動。
