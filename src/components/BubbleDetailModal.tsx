'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import BubbleGrowthIndicator from '@/src/components/BubbleGrowthIndicator'
import { isBubbleDetailTooltipSeen, markBubbleDetailTooltipSeen } from '@/src/lib/onboarding'

export interface BubbleDetailModalProps {
  tagId: string
  tagText: string
  tagType: 'light' | 'shadow'
  onClose: () => void
  // プレビュー埋め込み用。trueの場合、本物の初回ツアー（保存した言葉/メモ/戻るボタンの案内）の
  // 既読状態を更新・消費しない（オンボーディングのスライド内に縮小表示する用途）
  previewMode?: boolean
}

type TagData = {
  growth_point: number
}

type SavedMessage = {
  id: string
  content: string
  created_at: string
}

type Journal = {
  id: string
  content: string
  created_at: string
}

type TourStep = 'saved' | 'journal' | 'back' | 'done'

function getStageInfo(growthPoint: number): { emoji: string; label: string; bg: string } {
  if (growthPoint >= 30) return { emoji: '🌸', label: '花',  bg: '#F5A8C0' }
  if (growthPoint >= 20) return { emoji: '🌼', label: '蕾',  bg: '#F5D78E' }
  if (growthPoint >= 10) return { emoji: '🌿', label: '芽',  bg: '#9DC08B' }
  return                        { emoji: '🌱', label: 'タネ', bg: '#D4B896' }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// 初めて訪れたユーザー向けの案内ツールチップ（吹き出し＋上向き矢印）。
// HelpModalと同じ配色（#8B6914／#3B2F1E／#F5F0E8系）に合わせている。
function GuideTooltip({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', top: 30, left: 0, zIndex: 10, width: 260 }}>
      <div style={{
        position: 'relative',
        background: '#FFFFFF',
        border: '1.5px solid #8B6914',
        borderRadius: 12,
        padding: '10px 14px 26px 14px',
        boxShadow: '0 4px 14px rgba(139,105,20,0.22)',
      }}>
        {/* 上向きの矢印：すぐ上のセクション見出しを指し示す */}
        <div style={{
          position: 'absolute', top: -7, left: 14, width: 0, height: 0,
          borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
          borderBottom: '7px solid #8B6914',
        }} />
        <div style={{
          position: 'absolute', top: -5.3, left: 15.5, width: 0, height: 0,
          borderLeft: '5.5px solid transparent', borderRight: '5.5px solid transparent',
          borderBottom: '5.5px solid #FFFFFF',
        }} />

        <p style={{ fontSize: 12.5, color: '#3B2F1E', lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
          {text}
        </p>

        <button
          onClick={onClose}
          aria-label="閉じる"
          style={{
            position: 'absolute', bottom: 6, right: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: 'rgba(59,47,30,0.4)', lineHeight: 1, padding: 2,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default function BubbleDetailModal({ tagId, tagText, tagType, onClose, previewMode = false }: BubbleDetailModalProps) {
  const [tagData, setTagData]           = useState<TagData | null>(null)
  const [visitCount, setVisitCount]     = useState(0)
  const [lastVisit, setLastVisit]       = useState<string | null>(null)
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([])
  const [journals, setJournals]         = useState<Journal[]>([])
  const [loading, setLoading]           = useState(true)
  const [journalText, setJournalText]   = useState('')
  const [savingJournal, setSavingJournal] = useState(false)
  // 初めて開いたユーザーにのみ、「保存した言葉」→「メモ・ジャーナル」→「戻るボタン」の
  // 順で1つずつ案内ツールチップを出すオンボーディングツアー。表示が始まった時点で
  // 「既読」を記録し、次回以降はモーダルを開いてもツアーが出ないようにする。
  const [tourStep, setTourStep] = useState<TourStep>(() => {
    if (previewMode || isBubbleDetailTooltipSeen()) return 'done'
    markBubbleDetailTooltipSeen()
    return 'saved'
  })

  const fetchJournals = useCallback(async () => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('journals') as any)
      .select('id, content, created_at')
      .eq('tag_id', tagId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setJournals(data as Journal[])
  }, [tagId])

  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    ;(async () => {
      const [tagRes, eventsRes, savedRes, journalsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tags') as any)
          .select('growth_point')
          .eq('id', tagId)
          .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tag_events') as any)
          .select('created_at')
          .eq('tag_id', tagId)
          .eq('event_type', 'visit')
          .order('created_at', { ascending: false }),
        userId
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (supabase.from('saved_messages') as any)
              .select('id, content, created_at')
              .eq('tag_id', tagId)
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(5)
          : Promise.resolve({ data: [] }),
        userId
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (supabase.from('journals') as any)
              .select('id, content, created_at')
              .eq('tag_id', tagId)
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ])

      if (tagRes.data) setTagData(tagRes.data as TagData)
      if (eventsRes.data) {
        const rows = eventsRes.data as { created_at: string }[]
        setVisitCount(rows.length)
        if (rows.length > 0) setLastVisit(rows[0].created_at)
      }
      if (savedRes.data) setSavedMessages(savedRes.data as SavedMessage[])
      if (journalsRes.data) setJournals(journalsRes.data as Journal[])
      setLoading(false)
    })()
  }, [tagId])

  const handleSaveJournal = async () => {
    const text = journalText.trim()
    if (!text) return
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return

    setSavingJournal(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('journals') as any)
      .insert([{ user_id: userId, tag_id: tagId, content: text }])
    setJournalText('')
    await fetchJournals()
    setSavingJournal(false)
  }

  const handleDeleteJournal = async (id: string) => {
    // 楽観的更新
    setJournals(prev => prev.filter(j => j.id !== id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('journals') as any).delete().eq('id', id)
  }

  const clean = tagText.replace(/^#+/, '')
  const stageInfo = tagData ? getStageInfo(tagData.growth_point) : null
  const savedCount = savedMessages.length + journals.length

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 400,
      background: '#F5F0E8', overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 390, margin: '0 auto', paddingBottom: 32 }}>

        {/* ヘッダー */}
        <div style={{ padding: '52px 20px 12px' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, color: '#3B2F1E', padding: 0,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >← 戻る</button>
            {tourStep === 'back' && (
              <GuideTooltip
                text="前の画面に戻ろう"
                onClose={() => setTourStep('done')}
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              background: tagType === 'light' ? '#F5D78E' : '#D4B896',
              color: tagType === 'light' ? '#8B6914' : '#6b4c1e',
              padding: '4px 12px', borderRadius: 20, fontSize: 14, fontWeight: 700,
            }}>#{clean}</span>

            {stageInfo && (
              <span style={{
                background: stageInfo.bg, color: '#3B2F1E',
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              }}>{stageInfo.emoji} {stageInfo.label}</span>
            )}
          </div>

          <p style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)', margin: '6px 0 0' }}>
            {lastVisit ? `最終訪問：${formatDate(lastVisit)}` : 'まだ訪問していません'}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(59,47,30,0.4)', fontSize: 13 }}>
            読み込み中...
          </div>
        ) : (
          <>
            {/* ステータスカード */}
            <div style={{
              display: 'flex', margin: '0 20px 20px',
              background: '#FFFFFF', borderRadius: 16,
              overflow: 'hidden', border: '1px solid rgba(139,105,20,0.12)',
            }}>
              {[
                { label: '訪問回数',     value: `${visitCount}回` },
                { label: '保存した言葉', value: `${savedCount}件` },
                { label: '成長ポイント', value: `${tagData?.growth_point ?? 0}pt` },
              ].map(({ label, value }, i) => (
                <div key={label} style={{
                  flex: 1, padding: '14px 4px', textAlign: 'center',
                  borderLeft: i > 0 ? '1px solid rgba(139,105,20,0.1)' : 'none',
                }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#3B2F1E', margin: 0 }}>{value}</p>
                  <p style={{ fontSize: 10, color: 'rgba(59,47,30,0.5)', margin: '2px 0 0' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* 成長プログレスバー（shadowタグのみ） */}
            {tagType === 'shadow' && (
              <BubbleGrowthIndicator growthPoint={tagData?.growth_point ?? 0} />
            )}

            {/* 保存した言葉 */}
            <div style={{ padding: '0 20px 20px', position: 'relative' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#8B6914', margin: '0 0 10px' }}>🔖 保存した言葉</h3>
              {tourStep === 'saved' && (
                <GuideTooltip
                  text="チャットで保存（ブックマーク）した言葉がここに集まります"
                  onClose={() => setTourStep('journal')}
                />
              )}
              {savedMessages.length === 0 ? (
                <div style={{
                  background: '#FFFFFF', borderRadius: 12, padding: '16px',
                  border: '1px dashed rgba(139,105,20,0.2)', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.35)', margin: 0 }}>
                    まだ保存した言葉がありません
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedMessages.map(sm => (
                    <div key={sm.id} style={{
                      background: '#FFFFFF', borderRadius: 12, padding: '12px 14px',
                      border: '1px solid rgba(139,105,20,0.12)',
                    }}>
                      <p style={{ fontSize: 14, color: '#3B2F1E', margin: '0 0 4px', lineHeight: 1.5 }}>
                        {sm.content}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(59,47,30,0.4)', margin: 0 }}>
                        {formatDate(sm.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* メモ・ジャーナル */}
            <div style={{ padding: '0 20px 24px', position: 'relative' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#8B6914', margin: '0 0 10px' }}>📝 メモ・ジャーナル</h3>
              {tourStep === 'journal' && (
                <GuideTooltip
                  text="気づいたことや感じたことを自由に書き残せます"
                  onClose={() => setTourStep('back')}
                />
              )}

              {/* メモ一覧 */}
              {journals.length === 0 ? (
                <div style={{
                  background: '#FFFFFF', borderRadius: 12, padding: '16px',
                  border: '1px dashed rgba(139,105,20,0.2)', textAlign: 'center',
                  marginBottom: 12,
                }}>
                  <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.35)', margin: 0 }}>
                    まだメモがありません
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {journals.map(j => (
                    <div
                      key={j.id}
                      style={{
                        background: '#FFFFFF', borderRadius: 12,
                        padding: '12px 16px',
                        border: '1px solid rgba(139,105,20,0.12)',
                        position: 'relative',
                      }}
                    >
                      {/* 削除ボタン */}
                      <button
                        onClick={() => handleDeleteJournal(j.id)}
                        aria-label="削除"
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 12, color: 'rgba(59,47,30,0.35)',
                          lineHeight: 1, padding: 2,
                        }}
                      >
                        ✕
                      </button>

                      <p style={{
                        fontSize: 13, color: '#3B2F1E',
                        lineHeight: 1.6, margin: '0 0 6px',
                        paddingRight: 20,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {j.content}
                      </p>
                      <p style={{ fontSize: 11, color: '#8B6914', margin: 0, textAlign: 'right' }}>
                        {formatDate(j.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 新規メモ入力 */}
              <div style={{
                background: '#FFFFFF', borderRadius: 12,
                padding: '12px',
                border: '1px solid rgba(139,105,20,0.12)',
              }}>
                <textarea
                  value={journalText}
                  onChange={e => setJournalText(e.target.value)}
                  placeholder="ここに自分の言葉を残そう..."
                  style={{
                    width: '100%', minHeight: 80,
                    border: 'none', outline: 'none', resize: 'none',
                    background: 'transparent',
                    fontSize: 13, color: '#3B2F1E', lineHeight: 1.6,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    onClick={handleSaveJournal}
                    disabled={savingJournal || !journalText.trim()}
                    style={{
                      padding: '8px 18px', borderRadius: 10, border: 'none',
                      background: journalText.trim() ? '#4A7C59' : 'rgba(74,124,89,0.3)',
                      color: '#FFFFFF',
                      fontSize: 13, fontWeight: 700,
                      cursor: journalText.trim() ? 'pointer' : 'default',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {savingJournal ? '保存中...' : '保存する'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
