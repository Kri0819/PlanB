import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh-Hant">
      <Head>
        <meta name="theme-color" content="#F6F5F2" />
        <meta
          name="description"
          content="同行｜Alongside — AI 生活夥伴 Prototype"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
