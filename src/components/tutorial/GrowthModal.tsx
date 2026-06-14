'use client'

import { useEffect, useState } from 'react'
import GrowthTree from '@/src/components/tree/GrowthTree'
import Fireworks from '@/src/components/tree/Fireworks'
import { useGrowthStage } from '@/src/components/tree/useGrowthStage'

type GrowthModalProps = {
  onStart: () => void
}

export default function GrowthModal({ onStart }: GrowthModalProps) {
  const { setGrowthStage } = useGrowthStage()
  const [showFireworks, setShowFireworks] = useState(true)

  useEffect(() => {
    setGrowthStage('bloom')
    const timer = window.setTimeout(() => setShowFireworks(false), 4500)
    return () => window.clearTimeout(timer)
  }, [setGrowthStage])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ zIndex: 290, maxWidth: 390, margin: '0 auto', background: '#F5F0E8' }}
    >
      <style>{`
        @keyframes gm-copy-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .gm-copy { opacity: 0; animation: gm-copy-in 0.6s ease both; animation-delay: 2s; }
        .gm-quote { opacity: 0; animation: gm-copy-in 0.6s ease both; animation-delay: 0.3s; }
      `}</style>

      <div className="gm-quote" style={{ position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center', padding: '0 32px' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#3B2F1E', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
          {'あなた自身を愛しなさい。\n宇宙のどこを探しても、\nあなたほどあなたの愛に値する人はいない。'}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.55)', margin: '6px 0 0' }}>
          — ブッダ
        </p>
      </div>

      {showFireworks && <Fireworks />}

      <div className="gm-copy" style={{ position: 'absolute', top: 200, left: 0, right: 0, textAlign: 'center', padding: '0 32px' }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#3B2F1E', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {'花は咲き、種は育つ。\nありのままの自分でいい。\n'}
          <span style={{ color: '#E0708A' }}>SeedMeは己を愛でる場所です。</span>
        </p>
      </div>

      <GrowthTree stage="bloom" />

      <div className="gm-copy" style={{ width: '100%', maxWidth: 300, textAlign: 'center', marginTop: 24 }}>
        <button
          onClick={onStart}
          style={{
            width: '100%', padding: '14px',
            borderRadius: 24, border: 'none',
            background: '#4A7C59', color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          次へ
        </button>
      </div>
    </div>
  )
}
