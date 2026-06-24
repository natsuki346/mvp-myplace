import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mvp-myplace",
  description: "Canvas view",
};

// Capacitor(iOS)でコンテンツがステータスバー/ノッチの裏まで描画されるようにし、
// env(safe-area-inset-*) を有効化する（これが無いとsafe-area-inset-*は常に0になる）。
// maximumScale/userScalableは、フォントサイズ16px未満の入力欄にフォーカスした時に
// iOS Safari/WebViewが自動でズームしてしまう挙動を抑止するため。
export const viewport: Viewport = {
  viewportFit: "cover",
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="m-0 p-0">{children}</body>
    </html>
  );
}
