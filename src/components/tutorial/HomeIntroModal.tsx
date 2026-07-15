'use client'

import { useEffect, useState } from 'react'

type Props = {
  // 3ページ目まで見終えて閉じたとき
  onDone: () => void
}

const SLIDE_COUNT = 3

// ホーム画面を初めて開いたときの案内（3ページ・説明のみ／選択はさせない）：
// ①「こういうモードがありますよ」を知ってもらう ②HELP と SOS の説明 ③Rescue の説明
export default function HomeIntroModal({ onDone }: Props) {
  const [visible, setVisible] = useState(false)
  const [slide, setSlide] = useState(0)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    setUsername(localStorage.getItem('username'))
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  const isLast = slide === SLIDE_COUNT - 1

  const close = () => {
    setVisible(false)
    setTimeout(onDone, 250)
  }

  const goNext = () => {
    if (isLast) { close(); return }
    setSlide(s => s + 1)
  }

  // モードの「紹介」カード（選択不可・説明だけ）
  const ModeCard = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#FFFFFF', border: '1px solid rgba(139,115,85,0.2)',
        borderRadius: 16, padding: '14px 16px',
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E', margin: '0 0 2px' }}>{title}</p>
        <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.6)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  )

  const FeatureRow = ({ icon, title, desc, tint }: { icon: string; title: string; desc: string; tint: string }) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{
        flexShrink: 0, width: 40, height: 40, borderRadius: 12,
        background: tint, color: '#FFFFFF', fontSize: 15, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 0.5,
      }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E', margin: '0 0 3px' }}>{title}</p>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.65)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
      </div>
    </div>
  )

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: visible ? 'rgba(59,47,30,0.55)' : 'rgba(59,47,30,0)',
        transition: 'background 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
      }}
    >
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0px)' : 'translateY(16px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          background: '#F5F0E8', borderRadius: 24,
          width: '100%', maxWidth: 358,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '30px 24px 8px', minHeight: 300 }}>
          {slide === 0 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#3B2F1E', textAlign: 'center', margin: '0 0 6px', lineHeight: 1.5 }}>
                ようこそ{username ? `、${username}さん` : ''} 🌼
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.65)', textAlign: 'center', margin: '0 0 22px', lineHeight: 1.6 }}>
                DaiMe には2つのモードがあります
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ModeCard icon="🤝" title="話を聞いてほしい" desc="悩みを話したい・聞いてほしい時" />
                <ModeCard icon="💬" title="話を聞いてあげたい" desc="誰かの力になりたい・支えたい時" />
              </div>
              <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.5)', textAlign: 'center', margin: '18px 0 0', lineHeight: 1.7 }}>
                その日の気分で、いつでも<br />自由に切り替えられます
              </p>
            </>
          )}

          {slide === 1 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#3B2F1E', textAlign: 'center', margin: '0 0 20px' }}>
                助けを求める
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <FeatureRow icon="HELP" tint="#E0A020" title="HELP" desc="話したい・聞いてほしい時に。今すぐ話せる相手を探して、通話や対面でつながれます。" />
                <FeatureRow icon="SOS" tint="#C0392B" title="SOS" desc="今すぐ助けが必要な緊急時に。近くの誰かへ素早く届き、すぐに支えを求められます。" />
              </div>
              <p style={{ fontSize: 12.5, color: 'rgba(59,47,30,0.55)', textAlign: 'center', margin: '22px 0 0', lineHeight: 1.7 }}>
                「話を聞いてほしい」モードで<br />使える機能です
              </p>
            </>
          )}

          {slide === 2 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#3B2F1E', textAlign: 'center', margin: '0 0 20px' }}>
                誰かを支える
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <FeatureRow icon="🤝" tint="#4A7C59" title="Rescue" desc="HELP・SOSを出している人が一覧で表示されます。あなたが応えてあげることで、誰かの支えになれます。" />
              </div>
              <p style={{ fontSize: 12.5, color: 'rgba(59,47,30,0.55)', textAlign: 'center', margin: '22px 0 0', lineHeight: 1.7 }}>
                「話を聞いてあげたい」モードで<br />Rescueタブから応えられます
              </p>
            </>
          )}
        </div>

        {/* ページインジケーター */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0 12px', flexShrink: 0 }}>
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <div key={i} style={{
              width: i === slide ? 18 : 6, height: 6, borderRadius: 3,
              background: i === slide ? '#4A7C59' : 'rgba(74,124,89,0.25)',
              transition: 'all 0.25s ease',
            }} />
          ))}
        </div>

        <div style={{ flexShrink: 0, padding: '0 24px 26px' }}>
          <button
            onClick={goNext}
            style={{
              width: '100%', padding: '14px', borderRadius: 30, border: 'none',
              background: '#4A7C59', color: '#FFFFFF', fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isLast ? '理解した' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  )
}
