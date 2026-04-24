import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "思无崖 · 价值投资研究合作者",
  description:
    "基于连续追踪、承诺兑现度与社区共识的价值投资研究合作者。",
  metadataBase: new URL("https://siwuya.org"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
