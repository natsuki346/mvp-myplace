import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // next/imageは未使用だが、静的書き出しでは画像最適化サーバーが使えないため保険で設定
  images: {
    unoptimized: true,
  },
  // 開発モードの左下インジケーター（「N」ロゴ）を非表示にする（PCナビ右上のアバターに統合済み）
  devIndicators: false,
};

export default nextConfig;
