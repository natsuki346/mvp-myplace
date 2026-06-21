'use client'

import { useEffect, useState } from 'react'
import RoomChat from '@/src/components/room/RoomChat'
import SeedQuoteModal from '@/src/components/room/SeedQuoteModal'
import DaisyBubble from '@/src/components/DaisyBubble'

type RoomIntroSlidesModalProps = {
  onNext: () => void
}

// Seedルームのイラスト：DaisyBubbleと対になる「土の中で育つタネ」のシンプルな図
function SeedBubbleIllustration({ size }: { size: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="50" cy="50" r="50" fill="#D4B896" />
      <ellipse cx="50" cy="64" rx="30" ry="9" fill="#8B6F47" opacity="0.3" />
      <path
        d="M50 26 C63 31 63 58 50 70 C37 58 37 31 50 26 Z"
        fill="#9DC08B"
      />
      <path d="M50 30 L50 64" stroke="#6FA05A" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
    </svg>
  )
}

const EMPTY_IDS: string[] = []
const EMPTY_INTRO: [] = []

// 本来の画面（フルスクリーン）をそのまま100%投影し、サイズだけ縮小して見せる
const BASE_WIDTH      = 390
const BASE_HEIGHT     = 760
const SCALE           = 0.5
const PREVIEW_WIDTH   = BASE_WIDTH * SCALE
const PREVIEW_HEIGHT  = BASE_HEIGHT * SCALE

// 既存の本物のチャット画面（RoomChat）をそのまま縮小・非操作で埋め込むデモ
function MiniRoomPreview({ type, onFirstPlaybackDone }: { type: 'light' | 'shadow'; onFirstPlaybackDone?: () => void }) {
  const info = type === 'light'
    ? { title: 'Daisyの部屋', subtitle: '🌼 Daisy' }
    : { title: 'Seedの部屋',  subtitle: '🌱 Seed' }

  // Seedルームでは「訪問時に名言が表示される」演出をループ実演する
  const [showQuoteDemo, setShowQuoteDemo] = useState(false)

  useEffect(() => {
    if (type !== 'shadow') return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let firstCycleDone = false
    const cycle = (show: boolean) => {
      timer = setTimeout(() => {
        if (cancelled) return
        setShowQuoteDemo(show)
        if (!show && !firstCycleDone) {
          firstCycleDone = true
          onFirstPlaybackDone?.()
        }
        cycle(!show)
      }, show ? 1200 : 4000)
    }
    cycle(true)
    return () => { cancelled = true; clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  return (
    <div
      style={{
        width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, margin: '0 auto',
        // overflow:'hidden' だと RoomChat内部の bottomRef.scrollIntoView() が
        // この枠まで巻き上げてスクロールしてしまい中身が見えなくなるため、
        // スクロールコンテナにならない 'clip' を使う
        borderRadius: 16, overflow: 'clip',
        border: '1px solid rgba(139,115,85,0.18)',
        boxShadow: '0 4px 16px rgba(59,47,30,0.10)',
        position: 'relative', background: '#F5F0E8',
      }}
    >
      {/* position:relative にすることで、内部の SeedQuoteModal（position:absolute）の
          基準ボックスとなり、transform でまとめてこのプレビュー枠内に縮小される */}
      <div
        style={{
          width: BASE_WIDTH, height: BASE_HEIGHT,
          transform: `scale(${SCALE})`, transformOrigin: 'top left',
          pointerEvents: 'none',
          position: 'relative',
        }}
      >
        <RoomChat
          header={info}
          introMessages={EMPTY_INTRO}
          matchTagIds={EMPTY_IDS}
          ownTagId={null}
          tagType={type}
          readOnly
          channelKey={`demo-${type}-intro`}
        />
        {type === 'shadow' && showQuoteDemo && (
          <SeedQuoteModal onClose={() => {}} position="absolute" />
        )}
      </div>
    </div>
  )
}

const SLIDE_COUNT = 3

// プレビューの再生（ループ実演）があるスライドのインデックス。
// このスライドでは、1回目の再生が終わるまで「次へ」を押せないようにする。
const PLAYBACK_SLIDES = new Set([2])

export default function RoomIntroSlidesModal({ onNext }: RoomIntroSlidesModalProps) {
  const [visible, setVisible] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [previewReady, setPreviewReady] = useState(!PLAYBACK_SLIDES.has(0))

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onNext, 250)
  }

  const isLast = slideIndex === SLIDE_COUNT - 1

  const goNext = () => {
    if (isLast) { close(); return }
    const next = slideIndex + 1
    setSlideIndex(next)
    setPreviewReady(!PLAYBACK_SLIDES.has(next))
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 260,
        background: visible ? 'rgba(59,47,30,0.55)' : 'rgba(59,47,30,0)',
        transition: 'background 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0px)' : 'translateY(16px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          background: '#F5F0E8',
          borderRadius: 24,
          width: '100%', maxWidth: 358,
          height: '80svh', maxHeight: 680,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* スライド本文 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '32px 24px 16px', textAlign: 'center' }}>
          {slideIndex === 0 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 16px' }}>
                🏠 ルームとは
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '0 0 20px' }}>
                <DaisyBubble size={58} />
                <SeedBubbleIllustration size={58} />
              </div>
              <p style={{ fontSize: 15, color: 'rgba(59,47,30,0.7)', lineHeight: 1.8, margin: '0 0 28px' }}>
                自分と同じタグを持つ仲間が<br />集まり、言葉を交わせる場所です
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', margin: '0 0 4px' }}>🌼 Daisy</p>
                  <p style={{ fontSize: 15, color: 'rgba(59,47,30,0.65)', lineHeight: 1.6, margin: 0 }}>
                    あなたの好きやワクワクで繋がれる😊
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', margin: '0 0 4px' }}>🌱 Seed</p>
                  <p style={{ fontSize: 15, color: 'rgba(59,47,30,0.65)', lineHeight: 1.6, margin: 0 }}>
                    あなたが持つ悩みで共に成長する💪🔥
                  </p>
                </div>
              </div>
            </>
          )}

          {slideIndex === 1 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 12px' }}>
                🌼 Daisyルーム
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.7)', lineHeight: 1.7, margin: '0 0 20px' }}>
                Daisy（光）は、あなたの好きなことや<br />ワクワクすること。同じ光を持つ仲間と<br />気軽に言葉を交わせます
              </p>
              <MiniRoomPreview type="light" />
            </>
          )}

          {slideIndex === 2 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 12px' }}>
                🌱 Seedルーム
              </h2>
              <p style={{ fontSize: 12.5, color: 'rgba(59,47,30,0.7)', lineHeight: 1.7, margin: '0 0 12px' }}>
                Seed（影）は、あなたが抱える悩みや弱さ。<br />そこに向き合うことは、それ自体がすごいことです。
              </p>
              <p style={{ fontSize: 13, color: '#4A7C59', fontWeight: 600, lineHeight: 1.7, margin: '0 0 20px' }}>
                訪れるたびに、励ましの言葉が届きます🌱
              </p>
              <MiniRoomPreview type="shadow" onFirstPlaybackDone={() => setPreviewReady(true)} />
            </>
          )}
        </div>

        {/* ページインジケーター */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '4px 0 12px', flexShrink: 0 }}>
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <div key={i} style={{
              width: i === slideIndex ? 18 : 6, height: 6, borderRadius: 3,
              background: i === slideIndex ? '#4A7C59' : 'rgba(74,124,89,0.25)',
              transition: 'all 0.25s ease',
            }} />
          ))}
        </div>

        {/* ボタン行 */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: '0 24px 28px' }}>
          <button
            onClick={close}
            style={{
              flex: 1, padding: '14px', borderRadius: 30, border: '1px solid rgba(59,47,30,0.2)',
              background: 'transparent', color: 'rgba(59,47,30,0.6)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >スキップ</button>
          <button
            onClick={goNext}
            disabled={!previewReady}
            style={{
              flex: 2, padding: '14px', borderRadius: 30, border: 'none',
              background: previewReady ? '#4A7C59' : 'rgba(74,124,89,0.4)',
              color: '#FFFFFF',
              fontSize: 14, fontWeight: 700,
              cursor: previewReady ? 'pointer' : 'not-allowed',
            }}
          >{isLast ? 'はじめる' : '次へ'}</button>
        </div>
      </div>
    </div>
  )
}
