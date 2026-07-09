import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh-Hant">
      <Head>
        <title>PlanB — AI 生活夥伴</title>
        <meta name="theme-color" content="#F6F5F2" />
        <meta
          name="description"
          content="PlanB — 即使生活不嚴謹、不緊湊也沒關係。今天不想做，我們就不做。生活永遠有 Plan B，你也永遠有選擇的權利。"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
