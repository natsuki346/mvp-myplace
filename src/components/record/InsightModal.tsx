'use client'

// 📊 インサイトの全画面モーダル（fixed）。
// もとは app/record/page.tsx の showInsight モーダル。
// 呼び出し側は showInsight のとき本コンポーネントを描画し、onClose で閉じる。

import { CARD_BG, CARD_BORDER } from './recordShared'

type Props = {
  monthlySummary: { count: number; minutes: number; people: number }
  allHashtags: { tag: string; count: number; latest: number }[]
  maxTag: number
  onClose: () => void
}

export default function InsightModal({ monthlySummary, allHashtags, maxTag, onClose }: Props) {
  return (
    <div
      className="md:max-w-2xl!"
      style={{
        position: 'fixed', inset: 0, zIndex: 200, maxWidth: 390, margin: '0 auto',
        background: '#F5F0E8', display: 'flex', flexDirection: 'column',
      }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(14px + env(safe-area-inset-top)) 20px 14px',
        borderBottom: '1px solid rgba(139,115,85,0.15)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E' }}>📊 インサイト</span>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', fontSize: 22, color: 'rgba(59,47,30,0.5)', cursor: 'pointer', padding: '0 4px' }}
        >✕</button>
      </div>

      {/* スクロールコンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px calc(40px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* サマリー */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: '今月話した回数', value: `${monthlySummary.count}`, unit: '回' },
            { label: '合計時間', value: `${monthlySummary.minutes}`, unit: '分' },
            { label: '話した人数', value: `${monthlySummary.people}`, unit: '人' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
              borderRadius: 16, padding: '16px 6px', textAlign: 'center',
            }}>
              <p style={{ margin: 0, color: '#3B2F1E' }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</span>
                <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 2 }}>{s.unit}</span>
              </p>
              <p style={{ fontSize: 10, color: 'rgba(59,47,30,0.5)', margin: '5px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* 向き合ったテーマ ランキング */}
        <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>向き合ったテーマ</p>
            <span style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)' }}>直近30日</span>
          </div>
          {allHashtags.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.45)', margin: 0, lineHeight: 1.7 }}>
              直近30日に話した記録がまだありません。
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allHashtags.slice(0, 8).map((h, i) => {
                const rankMeta = [
                  { medal: '🥇', bg: 'linear-gradient(135deg, #FFF3C4 0%, #FFE57A 100%)', border: '#E0C040' },
                  { medal: '🥈', bg: 'linear-gradient(135deg, #F0F0F0 0%, #D8D8D8 100%)', border: '#B0B0B0' },
                  { medal: '🥉', bg: 'linear-gradient(135deg, #FFE8D6 0%, #E8B090 100%)', border: '#C07850' },
                ]
                const rank = rankMeta[i]
                const barW = `${(h.count / maxTag) * 100}%`
                return (
                  <div
                    key={h.tag}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: rank ? '10px 12px' : '8px 12px',
                      borderRadius: 12,
                      background: rank ? rank.bg : 'transparent',
                      border: rank ? `1px solid ${rank.border}40` : '1px solid transparent',
                    }}
                  >
                    {/* 順位 */}
                    <span style={{ fontSize: rank ? 20 : 13, width: 28, textAlign: 'center', flexShrink: 0, fontWeight: 700, color: 'rgba(59,47,30,0.4)' }}>
                      {rank ? rank.medal : `${i + 1}`}
                    </span>
                    {/* タグ名 + バー */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#3B2F1E', margin: '0 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        #{h.tag}
                      </p>
                      <div style={{ height: 5, background: 'rgba(139,115,85,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: barW, height: '100%', background: `linear-gradient(90deg, #F6D06B, #E0A020)`, borderRadius: 3 }} />
                      </div>
                    </div>
                    {/* 回数 */}
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#8B6914', flexShrink: 0 }}>{h.count}回</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
