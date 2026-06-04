'use client'

import { useState } from 'react'

type Props = {
  questionNumber: number
  totalQuestions: number
  questionText: string
  onComplete: (tags: string[]) => void
}

export function QuestionCard({
  questionNumber,
  totalQuestions,
  questionText,
  onComplete,
}: Props) {
  const [text,           setText]           = useState('')
  const [candidateTags,  setCandidateTags]  = useState<string[]>([])
  const [registeredTags, setRegisteredTags] = useState<string[]>([])
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [showAll,        setShowAll]        = useState(false)

  const MAX_VISIBLE = 10

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました')
      setCandidateTags(data.tags ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const addTag = (tag: string) => {
    if (registeredTags.includes(tag)) return
    setRegisteredTags(prev => [...prev, tag])
  }

  const removeRegistered = (tag: string) => {
    setRegisteredTags(prev => prev.filter(t => t !== tag))
  }

  const handleNext = () => {
    if (registeredTags.length === 0) return
    onComplete(registeredTags)
  }

  // 登録済みタグの表示制御
  const visibleTags   = showAll ? registeredTags : registeredTags.slice(0, MAX_VISIBLE)
  const overflowCount = registeredTags.length - MAX_VISIBLE

  return (
    <div className="flex flex-col min-h-screen bg-black px-6 pt-12 pb-10">
      <div style={{ maxWidth: 390, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Progress */}
        <p className="text-white/30 text-xs mb-6 tracking-widest uppercase">
          {questionNumber} / {totalQuestions}
        </p>

        {/* Question */}
        <h2 className="text-white text-xl font-semibold leading-relaxed mb-8">
          {questionText}
        </h2>

        {/* ── Registered tags ────────────────────────────────────── */}
        {registeredTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {visibleTags.map(tag => (
              <button
                key={tag}
                onClick={() => removeRegistered(tag)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: 'white', color: 'black' }}
              >
                {tag}
                <span className="text-xs opacity-40 ml-0.5">×</span>
              </button>
            ))}

            {/* overflow badge */}
            {!showAll && overflowCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
              >
                +{overflowCount}
              </button>
            )}
          </div>
        )}

        {/* ── Textarea ───────────────────────────────────────────── */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="ここに書いてみてください..."
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm p-4 outline-none resize-none placeholder:text-white/20 focus:border-white/30 transition-colors mb-4"
        />

        {/* ── Generate button ────────────────────────────────────── */}
        <button
          onClick={handleGenerate}
          disabled={!text.trim() || isGenerating}
          className="w-full py-3.5 rounded-full text-sm font-semibold mb-4 transition-all"
          style={{
            background: text.trim() && !isGenerating ? 'white' : 'rgba(255,255,255,0.10)',
            color:      text.trim() && !isGenerating ? 'black' : 'rgba(255,255,255,0.28)',
            cursor:     text.trim() && !isGenerating ? 'pointer' : 'default',
          }}
        >
          {isGenerating ? '生成中...' : 'タグを生成する'}
        </button>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-xs mb-4 text-center">{error}</p>
        )}

        {/* ── Candidate tags ─────────────────────────────────────── */}
        {candidateTags.length > 0 && (
          <div className="mb-6">
            <p className="text-white/30 text-xs mb-3">生成されたタグ</p>
            <div className="flex flex-col gap-2">
              {candidateTags.map(tag => {
                const added = registeredTags.includes(tag)
                return (
                  <div
                    key={tag}
                    className="flex items-center justify-between px-4 py-3 rounded-2xl"
                    style={{
                      background: added ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: added ? 'rgba(255,255,255,0.25)' : 'white' }}
                    >
                      {tag}
                    </span>

                    <button
                      onClick={() => addTag(tag)}
                      disabled={added}
                      className="flex items-center justify-center w-7 h-7 rounded-full text-base font-light transition-all flex-shrink-0"
                      style={{
                        background: added ? 'rgba(255,255,255,0.08)' : 'white',
                        color:      added ? 'rgba(255,255,255,0.2)' : 'black',
                        cursor:     added ? 'default' : 'pointer',
                      }}
                    >
                      {added ? '✓' : '+'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Next button ────────────────────────────────────────── */}
        <button
          onClick={handleNext}
          disabled={registeredTags.length === 0}
          className="w-full py-4 rounded-full text-sm font-semibold transition-all"
          style={{
            background: registeredTags.length > 0 ? 'white' : 'rgba(255,255,255,0.10)',
            color:      registeredTags.length > 0 ? 'black' : 'rgba(255,255,255,0.28)',
            cursor:     registeredTags.length > 0 ? 'pointer' : 'default',
          }}
        >
          次へ
        </button>

      </div>
    </div>
  )
}
