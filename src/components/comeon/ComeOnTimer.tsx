'use client'

// Come on（対面）セッションのタイマーエリア。両者「到着」後、地図エリアと入れ替わって表示される。
// カウントダウン（希望時間から）＋右上に手動「終了」ボタン。時間経過は親（chat page）が管理する。

export default function ComeOnTimer({
  secondsLeft, totalSeconds, onEnd, ended,
}: {
  secondsLeft: number
  totalSeconds: number
  onEnd: () => void
  ended: boolean
}) {
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const ratio = totalSeconds > 0 ? Math.max(0, secondsLeft / totalSeconds) : 0

  return (
    <div style={{
      flexShrink: 0, position: 'relative', borderBottom: '1px solid #D4B896',
      background: '#2B2318', padding: '18px 16px 16px', textAlign: 'center',
    }}>
      {!ended && (
        <button
          onClick={onEnd}
          style={{
            position: 'absolute', right: 12, top: 12, cursor: 'pointer',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(245,240,232,0.35)',
            color: '#F5F0E8', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20,
          }}
        >
          終了
        </button>
      )}
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'rgba(245,240,232,0.65)' }}>
        {ended ? '対面セッション終了' : '対面セッション中'}
      </p>
      <p style={{
        margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: 3,
        color: ended ? 'rgba(245,240,232,0.5)' : '#F6D06B', fontVariantNumeric: 'tabular-nums',
      }}>
        {mm}:{ss}
      </p>
      {/* 残り時間バー */}
      <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: 'rgba(245,240,232,0.15)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${ratio * 100}%`, background: '#F6D06B', transition: 'width 1s linear' }} />
      </div>
    </div>
  )
}
