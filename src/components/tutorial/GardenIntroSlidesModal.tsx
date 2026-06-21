'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import DaisyBubble from '@/src/components/DaisyBubble'
import BubbleDetailModal from '@/src/components/BubbleDetailModal'
import { ACTION_POINTS, type ActionDepth } from '@/src/lib/growthPoint'

type GardenIntroSlidesModalProps = {
  onNext: () => void
}

// 本来の画面（フルスクリーン）をそのまま縮小して見せる（RoomIntroSlidesModalと同じ手法）
const BASE_WIDTH     = 390
const BASE_HEIGHT    = 760
const SCALE          = 0.5
const PREVIEW_WIDTH  = BASE_WIDTH * SCALE
const PREVIEW_HEIGHT = BASE_HEIGHT * SCALE

const FRAME_STYLE: React.CSSProperties = {
  width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, margin: '0 auto',
  borderRadius: 16, overflow: 'clip',
  border: '1px solid rgba(139,115,85,0.18)',
  boxShadow: '0 4px 16px rgba(59,47,30,0.10)',
  position: 'relative', background: '#F5F0E8',
}

// Seedバブルのイラスト：DaisyBubbleと対になる「土の中で育つタネ」のシンプルな図
// （RoomIntroSlidesModalのSeedBubbleIllustrationと同じ図案）
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

// 「ガーデンとは」スライド用：いくつかのバブルが土の上に散らばっているイメージ図
function MiniGardenScene() {
  const bubbles = [
    { kind: 'daisy', size: 72, left: '14%', top: 11 },
    { kind: 'seed',  size: 58, left: '58%', top: 45 },
    { kind: 'daisy', size: 50, left: '78%', top: 27 },
    { kind: 'seed',  size: 46, left: '66%', top: 143 },
    { kind: 'daisy', size: 64, left: '10%', top: 158 },
    { kind: 'seed',  size: 54, left: '40%', top: 225 },
    { kind: 'daisy', size: 46, left: '70%', top: 263 },
    { kind: 'seed',  size: 50, left: '16%', top: 293 },
  ] as const

  return (
    <div
      style={{
        position: 'relative', width: '100%', maxWidth: 320, height: 360,
        margin: '4px auto 4px',
        background: 'linear-gradient(180deg, #EFE6D6 0%, #E1D2B2 100%)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {bubbles.map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: b.left, top: b.top }}>
          {b.kind === 'daisy'
            ? <DaisyBubble size={b.size} />
            : <SeedBubbleIllustration size={b.size} />}
        </div>
      ))}
    </div>
  )
}

// ① 膨らむということ：バブルが大きさを増していく様子をループ実演する
function MiniBubbleGrowthPreview({ onFirstPlaybackDone }: { onFirstPlaybackDone?: () => void }) {
  const [big, setBig] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let firstCycleDone = false
    const cycle = (grow: boolean) => {
      timer = setTimeout(() => {
        if (cancelled) return
        setBig(grow)
        if (grow) {
          setPulseKey(k => k + 1)
        } else if (!firstCycleDone) {
          firstCycleDone = true
          onFirstPlaybackDone?.()
        }
        cycle(!grow)
      }, grow ? 2200 : 1300)
    }
    cycle(true)
    return () => { cancelled = true; clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const size = big ? 100 : 56

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '20px 0' }}>
      <div
        key={pulseKey}
        style={{
          width: 110, height: 110,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: big ? 'garden-slide-pulse 0.7s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
        }}
      >
        <div style={{ transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1), height 0.8s cubic-bezier(0.34,1.56,0.64,1)', width: size, height: size }}>
          <DaisyBubble size={size} />
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#4A7C59', fontWeight: 600, margin: 0, textAlign: 'center' }}>
        ルームを訪れるたびに、こんな風に膨らんでいくよ
      </p>
    </div>
  )
}

const GROWTH_STAGES = [
  { emoji: '🌱', label: 'タネ', bg: '#D4B896', ptRange: '0〜9pt' },
  { emoji: '🌿', label: '芽',   bg: '#9DC08B', ptRange: '10〜19pt' },
  { emoji: '🌼', label: '蕾',   bg: '#F5D78E', ptRange: '20〜29pt' },
  { emoji: '🌸', label: '花',   bg: '#F5A8C0', ptRange: '30pt以上' },
]

const POINT_ACTIONS: { icon: string; label: string; key: ActionDepth }[] = [
  { icon: '🚪', label: 'トークを開く',         key: 'room_open' },
  { icon: '💬', label: 'チャットルームに入る', key: 'chat_open' },
  { icon: '✍️', label: '言葉を送る',           key: 'message_sent' },
]

// ② 育ち方：HelpModalの「成長ステージ」と同じ4段階表記を縮小スライドに合わせて再構成
function GrowthStageList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {GROWTH_STAGES.map(({ emoji, label, bg, ptRange }) => (
        <div key={label} style={{
          background: '#FFFFFF', borderRadius: 14, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          border: '1px solid rgba(139,105,20,0.1)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: bg, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          }}>
            {emoji}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3B2F1E' }}>{label}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#8B6914',
            background: bg, padding: '2px 8px', borderRadius: 99, marginLeft: 'auto',
          }}>
            {ptRange}
          </span>
        </div>
      ))}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#4A7C59', textAlign: 'center', margin: '6px 0 0' }}>
        合計30ptで満開🌸まで到達
      </p>

      <p style={{ fontSize: 12.5, fontWeight: 700, color: '#3B2F1E', textAlign: 'center', margin: '14px 0 0' }}>
        ポイントのつき方
      </p>
      {POINT_ACTIONS.map(({ icon, label, key }) => (
        <div key={key} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FFFFFF', borderRadius: 10, padding: '8px 14px',
          border: '1px solid rgba(139,105,20,0.1)',
        }}>
          <span style={{ fontSize: 12.5, color: '#3B2F1E' }}>{icon} {label}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#4A7C59' }}>+{ACTION_POINTS[key]}pt</span>
        </div>
      ))}
      <p style={{ fontSize: 11, color: 'rgba(59,47,30,0.55)', lineHeight: 1.6, textAlign: 'center', margin: '4px 0 0' }}>
        1回の訪問につき、最も深く進んだアクションのポイントだけが加算されます
      </p>
    </div>
  )
}

// ③ 中を開いた時の説明：実際のBubbleDetailModalをそのまま縮小・非操作で埋め込む
function MiniBubbleDetailPreview() {
  const [checked, setChecked] = useState(false)
  const [tag, setTag] = useState<{ id: string; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const tagId = sessionStorage.getItem('onboarding_seed_tag_id')
      if (!tagId) { if (!cancelled) setChecked(true); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('tags') as any)
        .select('id, text')
        .eq('id', tagId)
        .maybeSingle()
      if (!cancelled) {
        if (data) setTag({ id: data.id as string, text: data.text as string })
        setChecked(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!tag) {
    return (
      <div style={{ ...FRAME_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ fontSize: 12.5, color: 'rgba(59,47,30,0.45)', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          {checked
            ? '🔖 保存した言葉やメモが、ここに集まっていくよ'
            : '読み込み中...'}
        </p>
      </div>
    )
  }

  return (
    <div style={FRAME_STYLE}>
      <div style={{
        width: BASE_WIDTH, height: BASE_HEIGHT,
        transform: `scale(${SCALE})`, transformOrigin: 'top left',
        pointerEvents: 'none', position: 'relative',
      }}>
        <BubbleDetailModal
          tagId={tag.id}
          tagText={tag.text}
          tagType="shadow"
          onClose={() => {}}
          previewMode
        />
      </div>
    </div>
  )
}

const SLIDE_COUNT = 4

// プレビューの再生（ループ実演）があるスライドのインデックス。
// このスライドでは、1回目の再生が終わるまで「次へ」を押せないようにする。
const PLAYBACK_SLIDES = new Set([1])

export default function GardenIntroSlidesModal({ onNext }: GardenIntroSlidesModalProps) {
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
      <style>{`
        @keyframes garden-slide-pulse {
          0%   { transform: scale(1); }
          45%  { transform: scale(1.2); }
          75%  { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>

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
                🌿 ガーデンとは
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(59,47,30,0.7)', lineHeight: 1.8, margin: '0 0 16px' }}>
                ここがガーデン。<br />ルームで交わした言葉が、ひとつひとつの<br />バブルとなって育っていく場所です
              </p>
              <MiniGardenScene />
            </>
          )}

          {slideIndex === 1 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 16px' }}>
                🫧 膨らむということ
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.7)', lineHeight: 1.8, margin: '0 0 8px' }}>
                ルームを訪れて、仲間と言葉を交わすたびに、<br />バブルは少しずつ膨らんでいきます
              </p>
              <MiniBubbleGrowthPreview onFirstPlaybackDone={() => setPreviewReady(true)} />
            </>
          )}

          {slideIndex === 2 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 12px' }}>
                🌿 育ち方
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.7)', lineHeight: 1.7, margin: '0 0 16px' }}>
                ポイントが貯まるごとに、バブルは<br />4つの段階を経て育っていきます
              </p>
              <GrowthStageList />
            </>
          )}

          {slideIndex === 3 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#3B2F1E', lineHeight: 1.6, margin: '0 0 12px' }}>
                🔍 中を開いたら
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.7)', lineHeight: 1.7, margin: '0 0 16px' }}>
                バブルをタップすると、訪問履歴や<br />保存した言葉・メモを見ることができます
              </p>
              <MiniBubbleDetailPreview />
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
          >{isLast ? 'わかった！' : '次へ'}</button>
        </div>
      </div>
    </div>
  )
}
