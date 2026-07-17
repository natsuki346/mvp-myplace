'use client'

// ✦ AIレポート生成カード（生成 → 期間選択 → 生成）。
// もとは app/record/page.tsx の AIレポートブロック＋generateReport。
// report / period などの state と生成ロジックは内部に閉じ込め、
// 集計に必要な生データ（feelingLog / history / tags / partnerOf）を props で受ける。

import { useState } from 'react'
import { fetchReport, type ReportSection } from '@/src/lib/videoRoom'
import {
  GOLD, WEEKDAYS, PERIODS, mockDuration,
  type FeelingEntry, type MsgRow,
} from './recordShared'

type Props = {
  userId: string | null
  feelingLog: FeelingEntry[]
  history: MsgRow[]
  tags: Map<string, string>
  partnerOf: (m: MsgRow) => string
}

export default function AiReportCard({ userId, feelingLog, history, tags, partnerOf }: Props) {
  const [period, setPeriod] = useState<'week' | 'month' | '3month'>('month')
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)
  const [report, setReport] = useState<ReportSection[] | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(false)

  // AIレポート生成：選ばれた期間で記録を切り出して送信する
  const generateReport = async (pKey: 'week' | 'month' | '3month') => {
    if (!userId || reportLoading) return
    setPeriod(pKey)
    setShowPeriodPicker(false)
    setReport(null)
    setReportError(false)
    setReportLoading(true)

    const days = PERIODS.find(p => p.key === pKey)!.days
    const since = Date.now() - days * 24 * 60 * 60 * 1000
    const feelings = feelingLog.filter(f => new Date(`${f.date}T00:00:00`).getTime() >= since)
    const calls = history.filter(m => new Date(m.created_at).getTime() >= since)
    const minutes = calls.reduce((s, m) => s + mockDuration(m.id), 0)
    const people = new Set(calls.map(partnerOf)).size
    const tagCount = new Map<string, number>()
    for (const m of calls) {
      const t = tags.get(partnerOf(m))
      if (t) { const k = t.replace(/^#+/, ''); tagCount.set(k, (tagCount.get(k) ?? 0) + 1) }
    }
    const hashtags = [...tagCount.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)

    const records = {
      period: PERIODS.find(p => p.key === pKey)!.label,
      feelings: feelings.slice(0, 40).map(f => ({ date: f.date, feeling: f.feeling, note: f.note })),
      calls: calls.slice(0, 30).map(m => {
        const d = new Date(m.created_at)
        return { date: m.created_at.slice(0, 10), weekday: WEEKDAYS[d.getDay()], hour: d.getHours(), tag: tags.get(partnerOf(m))?.replace(/^#+/, '') ?? null }
      }),
      tags: hashtags,
      counts: { calls: calls.length, minutes, people, recordedDays: feelings.length },
    }
    const r = await fetchReport(userId, records)
    if (r && r.length > 0) setReport(r)
    else setReportError(true)
    setReportLoading(false)
  }

  return (
    <div style={{ background: '#FBEFC6', border: `1.5px solid ${GOLD}`, borderRadius: 16, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#8B6914' }}>✦ AIレポート</span>
        {report && (
          <span style={{ fontSize: 11, color: 'rgba(59,47,30,0.5)', marginLeft: 'auto' }}>
            {PERIODS.find(p => p.key === period)!.label}のふりかえり
          </span>
        )}
      </div>

      {report ? (
        /* 生成結果 */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {report.map((s, i) => (
            <div key={i}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#3B2F1E', margin: '0 0 4px' }}>{s.title}</p>
              <p style={{ fontSize: 13, color: '#3B2F1E', margin: 0, lineHeight: 1.8 }}>{s.body}</p>
            </div>
          ))}
          <button
            onClick={() => { setReport(null); setReportError(false); setShowPeriodPicker(true) }}
            style={{
              alignSelf: 'flex-start', marginTop: 2, padding: '7px 14px', borderRadius: 18,
              border: `1px solid ${GOLD}`, background: 'transparent', color: '#8B6914',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            期間を変えて再生成
          </button>
        </div>
      ) : reportLoading ? (
        /* 生成中 */
        <p style={{ fontSize: 13, color: '#3B2F1E', margin: 0, lineHeight: 1.7 }}>
          {PERIODS.find(p => p.key === period)!.label}の記録を読み解いています…
        </p>
      ) : showPeriodPicker ? (
        /* 期間選択 */
        <>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2F1E', margin: '0 0 12px', lineHeight: 1.7 }}>
            どのくらいの期間のレポートを出しますか？
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => generateReport(p.key)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 14, cursor: 'pointer',
                  border: `1.5px solid ${GOLD}`, background: '#FFFFFF', color: '#8B6914',
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPeriodPicker(false)}
            style={{
              border: 'none', background: 'none', color: 'rgba(59,47,30,0.5)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
            }}
          >
            やめる
          </button>
        </>
      ) : (
        /* 初期／エラー */
        <>
          <p style={{ fontSize: 13, color: '#3B2F1E', margin: '0 0 14px', lineHeight: 1.7 }}>
            {reportError
              ? 'レポートを生成できませんでした。少し時間をおいて、もう一度お試しください。'
              : 'あなたの気持ち・通話・向き合ったテーマの記録から、AIが振り返りレポートを作成します。'}
          </p>
          <button
            onClick={() => { setReportError(false); setShowPeriodPicker(true) }}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 22, border: 'none',
              background: `linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)`,
              color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {reportError ? 'もう一度生成する' : 'レポートを生成する'}
          </button>
        </>
      )}
    </div>
  )
}
