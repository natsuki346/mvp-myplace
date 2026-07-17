'use client'

// 「今日の気分は？」チェックインカード。
// もとは app/record/page.tsx の記録タブ（today ビュー）の①カード。
// 下書き（draftFeeling/draftNote/editingToday）は内部で保持し、保存は saveToday に委譲。

import { useState } from 'react'
import {
  GOLD, GREEN, FEELING_META, FEELING_ORDER,
  type Feeling, type FeelingEntry,
} from './recordShared'

type Props = {
  todayEntry?: FeelingEntry
  saveToday: (feeling: Feeling, note?: string) => void
}

export default function DailyCheckinCard({ todayEntry, saveToday }: Props) {
  const [draftFeeling, setDraftFeeling] = useState<Feeling | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const [editingToday, setEditingToday] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const onSave = (feeling: Feeling) => {
    saveToday(feeling, draftNote)
    setDraftFeeling(null)
    setDraftNote('')
    setEditingToday(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1800)
  }

  return (
    <div style={{
      background: 'linear-gradient(160deg, #FFFDF7 0%, #F6EFDD 100%)',
      border: `1.5px solid ${GOLD}`, borderRadius: 18, padding: '16px 16px 18px',
      boxShadow: '0 4px 14px rgba(201,168,76,0.14)',
    }}>
      {(!todayEntry || editingToday) ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>
              {editingToday ? '今日の記録を編集' : '今日の気分は？'}
            </p>
            <span style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)' }}>
              {new Date().getMonth() + 1}/{new Date().getDate()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.55)', margin: '0 0 14px', lineHeight: 1.6 }}>
            毎日ひとつ、いまの気持ちを残しておきましょう🌱
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {FEELING_ORDER.map(f => {
              const on = draftFeeling === f
              const meta = FEELING_META[f]
              return (
                <button
                  key={f}
                  onClick={() => setDraftFeeling(f)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 14, cursor: 'pointer',
                    border: on ? `2px solid ${meta.color}` : '1px solid rgba(139,115,85,0.2)',
                    background: on ? `${meta.color}22` : '#FFFFFF',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transform: on ? 'translateY(-2px)' : 'none',
                    transition: 'transform 0.15s ease, background 0.15s ease, border 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{meta.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: on ? 700 : 500, color: on ? meta.color : 'rgba(59,47,30,0.6)' }}>
                    {meta.label}
                  </span>
                </button>
              )
            })}
          </div>
          <textarea
            value={draftNote}
            onChange={e => setDraftNote(e.target.value)}
            maxLength={140}
            placeholder="今日はどんな一日でしたか？（任意）"
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'none',
              border: '1px solid rgba(139,115,85,0.22)', borderRadius: 12,
              padding: '10px 12px', fontSize: 13, color: '#3B2F1E',
              background: '#FFFFFF', fontFamily: 'inherit', lineHeight: 1.6,
              marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {editingToday && (
              <button
                onClick={() => { setEditingToday(false); setDraftFeeling(null); setDraftNote('') }}
                style={{
                  padding: '11px 16px', borderRadius: 22, border: '1px solid rgba(139,115,85,0.25)',
                  background: 'transparent', color: 'rgba(59,47,30,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                やめる
              </button>
            )}
            <button
              onClick={() => draftFeeling && onSave(draftFeeling)}
              disabled={!draftFeeling}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 22, border: 'none',
                background: draftFeeling ? `linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)` : 'rgba(139,115,85,0.15)',
                color: draftFeeling ? '#FFFFFF' : 'rgba(59,47,30,0.4)',
                fontSize: 14, fontWeight: 700, cursor: draftFeeling ? 'pointer' : 'default',
              }}
            >
              記録する
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>
              {justSaved ? '✓ 記録しました' : '✓ 今日の記録'}
            </span>
            <button
              onClick={() => { setEditingToday(true); setDraftFeeling(todayEntry.feeling); setDraftNote(todayEntry.note ?? '') }}
              style={{ border: 'none', background: 'none', color: '#8B6914', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              編集
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 40, lineHeight: 1 }}>{FEELING_META[todayEntry.feeling].emoji}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>
                「{FEELING_META[todayEntry.feeling].label}」な一日
              </p>
              {todayEntry.note
                ? <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.7)', margin: '4px 0 0', lineHeight: 1.6 }}>{todayEntry.note}</p>
                : <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.4)', margin: '4px 0 0' }}>また明日も記録しましょう</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
