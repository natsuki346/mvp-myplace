'use client'

import { useState } from 'react'
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api'
import { openUrl } from '@/src/lib/videoRoom'

// Come on（対面）チャット上部の地図エリア。折りたたみ可能。
// HELP側（会いたい相手）の位置にピンを立て、外部のGoogleマップでナビを起動できる。
//
// このプロジェクトの APIキー（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY）で有効化されているのは
// 「Maps JavaScript API」のみ（Embed API / Static Maps API は未有効）。そのため
// iframe埋め込み（Embed API）ではなく @react-google-maps/api（JS API）で描画する。

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

const containerStyle = { width: '100%', height: '100%' } as const
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  gestureHandling: 'greedy',
  clickableIcons: false,
  keyboardShortcuts: false,
}

export default function ComeOnMap({
  lat, lng, distanceLabel, minutes,
}: {
  lat: number
  lng: number
  distanceLabel: string
  minutes: number
}) {
  const [collapsed, setCollapsed] = useState(false)
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'daime-google-maps',
    googleMapsApiKey: MAPS_KEY,
  })

  const center = { lat, lng }
  // 外部のGoogleマップでナビ（経路）を起動
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  // 折りたたみ時：コンパクトなバー表示
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          flexShrink: 0, width: '100%', border: 'none', cursor: 'pointer',
          background: '#FBF7EE', borderBottom: '1px solid #D4B896',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 700, color: '#3B2F1E',
        }}
      >
        <span>📍 {distanceLabel}先 · {minutes}分希望</span>
        <span style={{ marginLeft: 'auto', color: '#8B6914' }}>▼ 地図を開く</span>
      </button>
    )
  }

  // 展開時：地図＋操作ボタン
  return (
    <div style={{ flexShrink: 0, position: 'relative', height: 190, borderBottom: '1px solid #D4B896', background: '#E9E4DA' }}>
      {!MAPS_KEY || loadError ? (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8B6914' }}>
          地図を読み込めません{!MAPS_KEY ? '（APIキー未設定）' : ''}
        </div>
      ) : !isLoaded ? (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#A09070' }}>
          地図を読み込み中...
        </div>
      ) : (
        <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={15} options={mapOptions}>
          <MarkerF position={center} />
        </GoogleMap>
      )}

      {/* 距離・希望時間バッジ（左上） */}
      <div style={{
        position: 'absolute', left: 10, top: 10,
        background: 'rgba(255,255,255,0.92)', borderRadius: 20,
        padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#3B2F1E',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)', pointerEvents: 'none',
      }}>
        📍 {distanceLabel}先 · {minutes}分希望
      </div>

      {/* ナビ開始（左下・外部Googleマップで経路起動） */}
      <button
        onClick={() => openUrl(navUrl)}
        style={{
          position: 'absolute', left: 10, bottom: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)',
          color: '#FFFFFF', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 20,
          boxShadow: '0 2px 8px rgba(224,160,32,0.4)',
        }}
      >
        🧭 ナビ開始
      </button>

      {/* 折りたたむ（右下） */}
      <button
        onClick={() => setCollapsed(true)}
        style={{
          position: 'absolute', right: 10, bottom: 10, cursor: 'pointer',
          background: 'rgba(255,255,255,0.92)', border: '1px solid #D4B896',
          color: '#3B2F1E', fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 20,
        }}
      >
        ▲ 折りたたむ
      </button>
    </div>
  )
}
