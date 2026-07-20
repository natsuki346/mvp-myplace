'use client'

// アプリ内ビデオ通話画面（Daily.co を iframe で埋め込む）。
// output:'export' の静的書き出しでは API Route が使えないため、ルームURLの発行は
// Supabase Edge Function（video-room）で行い、ここではそのURLを iframe 表示するだけ。
// 「通話を終了」で onClose を呼び、呼び出し元（チャット画面）に戻る。
//
// iframe 内でカメラ/マイクを使うため allow="camera; microphone" を付与する。
// うまく表示できない環境（WebRTCがiframe内で動かない等）向けに、
// 「別画面で開く」フォールバックリンクも用意する。

import { openUrl } from '@/src/lib/videoRoom'

export default function VideoCallOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#000', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* ヘッダー：終了ボタン */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'calc(10px + env(safe-area-inset-top)) 14px 10px',
          background: 'rgba(0,0,0,0.85)', flexShrink: 0,
        }}
      >
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, opacity: 0.9 }}>
          🎥 ビデオ通話
        </span>
        <button
          onClick={onClose}
          style={{
            padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: '#C0392B', color: '#fff', fontSize: 14, fontWeight: 700,
          }}
        >
          通話を終了
        </button>
      </div>

      {/* 通話UI（Daily.co 埋め込み） */}
      <iframe
        src={url}
        title="ビデオ通話"
        allow="camera; microphone; fullscreen; autoplay; display-capture"
        allowFullScreen
        style={{ flex: 1, width: '100%', border: 'none', background: '#000' }}
      />

      {/* フォールバック：iframe内で通話が始まらない場合は別画面で開く */}
      <div
        style={{
          padding: '8px 14px calc(8px + env(safe-area-inset-bottom))',
          background: 'rgba(0,0,0,0.85)', textAlign: 'center', flexShrink: 0,
        }}
      >
        <button
          onClick={() => { void openUrl(url) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', fontSize: 12, textDecoration: 'underline',
          }}
        >
          うまく表示されない場合は別画面で開く
        </button>
      </div>
    </div>
  )
}
