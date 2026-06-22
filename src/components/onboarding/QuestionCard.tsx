'use client'

import { useRef, useState } from 'react'

// AI生成タグの呼び出し先（Supabase Edge Functions）。
// Next.js API Routesは静的書き出し（output: 'export'）と相性が悪いため、
// ここはNext.jsの外（Supabase Edge Function）に出している。
const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
// Edge FunctionsはデフォルトでJWT検証が有効なため、匿名キーをBearerトークンとして送る
// （supabase-jsクライアントが内部で行っているのと同じ仕組み）
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

type Props = {
  questionNumber:   number
  totalQuestions:   number
  questionText:     string
  exampleTags?:     string[]  // 初回生成前に「例）」欄として表示しておく例タグ
  addButtonText?:   string   // タグ追加ボタンのラベル（デフォルト: '+ これ自分！'）
  onComplete:       (tags: string[]) => void
}

// ── 背景 SVG: 実の世界（Q1・Q2）────────────────────────────────────────────────
function FruitBg() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden="true"
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.14">
        {/* トマト大 – 左上 */}
        <circle cx="58" cy="118" r="35" stroke="#C4A35A" strokeWidth="1.8"/>
        <line x1="58" y1="83" x2="58" y2="72" stroke="#4A7C59" strokeWidth="1.8"/>
        <path d="M58 83 Q50 74 46 77" stroke="#4A7C59" strokeWidth="1.4"/>
        <path d="M58 83 Q66 74 70 77" stroke="#4A7C59" strokeWidth="1.4"/>
        {/* トマト小 – 右上 */}
        <circle cx="338" cy="74" r="21" stroke="#C0392B" strokeWidth="1.6"/>
        <line x1="338" y1="53" x2="338" y2="44" stroke="#4A7C59" strokeWidth="1.5"/>
        <path d="M338 53 Q332 46 329 48" stroke="#4A7C59" strokeWidth="1.2"/>
        {/* りんご – 右中 */}
        <path d="M373 288 Q365 257 356 255 Q345 251 342 267 Q338 285 345 302 Q352 319 362 319 Q372 319 380 302 Q387 285 384 267 Q381 251 370 255 Q361 255 373 288" stroke="#C4A35A" strokeWidth="1.6"/>
        <path d="M362 251 Q360 242 357 237" stroke="#4A7C59" strokeWidth="1.5"/>
        <path d="M362 249 Q370 240 374 240" stroke="#4A7C59" strokeWidth="1.2"/>
        {/* りんご小 – 左中 */}
        <path d="M27 450 Q22 430 15 428 Q7 426 5 438 Q2 452 8 464 Q14 476 22 476 Q30 476 35 464 Q40 452 38 438 Q36 426 27 428 Q20 428 27 450" stroke="#C4A35A" strokeWidth="1.4"/>
        <line x1="22" y1="425" x2="20" y2="418" stroke="#4A7C59" strokeWidth="1.3"/>
        {/* ぶどう – 右下 */}
        <line x1="340" y1="570" x2="340" y2="558" stroke="#4A7C59" strokeWidth="1.6"/>
        <path d="M340 570 Q332 562 330 556" stroke="#4A7C59" strokeWidth="1.2"/>
        <path d="M340 570 Q348 562 350 556" stroke="#4A7C59" strokeWidth="1.2"/>
        <circle cx="325" cy="586" r="13" stroke="#8B6914" strokeWidth="1.4"/>
        <circle cx="341" cy="583" r="13" stroke="#8B6914" strokeWidth="1.4"/>
        <circle cx="357" cy="586" r="13" stroke="#8B6914" strokeWidth="1.4"/>
        <circle cx="318" cy="604" r="12" stroke="#8B6914" strokeWidth="1.3"/>
        <circle cx="333" cy="603" r="13" stroke="#8B6914" strokeWidth="1.4"/>
        <circle cx="349" cy="603" r="13" stroke="#8B6914" strokeWidth="1.4"/>
        <circle cx="364" cy="604" r="12" stroke="#8B6914" strokeWidth="1.3"/>
        <circle cx="326" cy="622" r="11" stroke="#8B6914" strokeWidth="1.2"/>
        <circle cx="341" cy="624" r="12" stroke="#8B6914" strokeWidth="1.3"/>
        <circle cx="356" cy="622" r="11" stroke="#8B6914" strokeWidth="1.2"/>
        {/* トマト中 – 左下 */}
        <circle cx="52" cy="692" r="29" stroke="#C0392B" strokeWidth="1.7"/>
        <line x1="52" y1="663" x2="52" y2="654" stroke="#4A7C59" strokeWidth="1.6"/>
        <path d="M52 663 Q46 655 43 657" stroke="#4A7C59" strokeWidth="1.3"/>
        <path d="M52 663 Q58 655 61 657" stroke="#4A7C59" strokeWidth="1.3"/>
        {/* トマト極小 – 下中央 */}
        <circle cx="192" cy="788" r="16" stroke="#C4A35A" strokeWidth="1.4"/>
        <line x1="192" y1="772" x2="192" y2="765" stroke="#4A7C59" strokeWidth="1.3"/>
        {/* トマト極小 – 上中央 */}
        <circle cx="200" cy="36" r="14" stroke="#C4A35A" strokeWidth="1.3"/>
        <line x1="200" y1="22" x2="200" y2="16" stroke="#4A7C59" strokeWidth="1.2"/>
      </g>
    </svg>
  )
}

// ── 背景 SVG: 根の世界（Q3・Q4）────────────────────────────────────────────────
function RootBg() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden="true"
    >
      <g fill="none" stroke="#8B6914" strokeLinecap="round" opacity="0.13">
        {/* 中央メイン根 */}
        <path d="M195 844 Q193 778 190 714 Q188 650 186 586" strokeWidth="4.5"/>
        {/* 左大根 */}
        <path d="M190 746 Q154 708 120 670 Q92 636 74 598" strokeWidth="3.5"/>
        {/* 右大根 */}
        <path d="M192 746 Q228 708 262 670 Q290 636 308 598" strokeWidth="3.5"/>
        {/* 中央左枝 */}
        <path d="M186 648 Q160 620 138 596 Q120 576 106 553" strokeWidth="2.5"/>
        {/* 中央右枝 */}
        <path d="M188 648 Q214 620 236 596 Q254 576 268 553" strokeWidth="2.5"/>
        {/* 左中根 */}
        <path d="M74 598 Q50 570 32 543 Q18 520 10 494" strokeWidth="2"/>
        <path d="M74 598 Q64 568 60 538" strokeWidth="1.8"/>
        {/* 右中根 */}
        <path d="M308 598 Q332 570 350 543 Q364 520 372 494" strokeWidth="2"/>
        <path d="M308 598 Q318 568 322 538" strokeWidth="1.8"/>
        {/* 細根 – 左 */}
        <path d="M106 553 Q86 528 68 506" strokeWidth="1.5"/>
        <path d="M106 553 Q98 524 94 496" strokeWidth="1.4"/>
        <path d="M32 543 Q16 516 6 486" strokeWidth="1.4"/>
        {/* 細根 – 右 */}
        <path d="M268 553 Q288 528 306 506" strokeWidth="1.5"/>
        <path d="M268 553 Q276 524 280 496" strokeWidth="1.4"/>
        <path d="M350 543 Q366 516 376 486" strokeWidth="1.4"/>
        {/* 左端根 */}
        <path d="M0 844 Q6 788 12 738 Q16 690 20 642" strokeWidth="3"/>
        <path d="M14 748 Q-2 716 -6 684" strokeWidth="1.8"/>
        <path d="M18 698 Q6 668 0 638" strokeWidth="1.5"/>
        {/* 右端根 */}
        <path d="M390 844 Q384 788 378 738 Q374 690 370 642" strokeWidth="3"/>
        <path d="M376 748 Q392 716 396 684" strokeWidth="1.8"/>
        <path d="M372 698 Q384 668 390 638" strokeWidth="1.5"/>
        {/* 極細根 – 上方へ */}
        <path d="M186 586 Q170 556 162 526 Q156 500 152 472" strokeWidth="1.4"/>
        <path d="M186 586 Q202 556 210 526 Q216 500 220 472" strokeWidth="1.4"/>
        <path d="M138 596 Q122 566 112 536" strokeWidth="1.3"/>
        <path d="M236 596 Q252 566 262 536" strokeWidth="1.3"/>
        <path d="M10 494 Q4 464 2 434" strokeWidth="1.2"/>
        <path d="M372 494 Q378 464 380 434" strokeWidth="1.2"/>
      </g>
    </svg>
  )
}

// ── メインコンポーネント ────────────────────────────────────────────────────────

export function QuestionCard({
  questionNumber,
  totalQuestions,
  questionText,
  exampleTags = [],
  addButtonText = '+ これ自分！',
  onComplete,
}: Props) {
  const [text,           setText]           = useState('')
  // AIが生成したタグ。空の間は固定の例タグ（exampleTags）を表示し、
  // 生成が完了したらこちらだけを表示する（例タグは隠す）
  const [generatedTags,  setGeneratedTags]  = useState<string[]>([])
  const [registeredTags, setRegisteredTags] = useState<string[]>([])
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [showAll,        setShowAll]        = useState(false)
  const [suggestedTags,  setSuggestedTags]  = useState<Set<string>>(new Set())

  const displayTags = generatedTags.length > 0 ? generatedTags : exampleTags

  const suggestChainCount = useRef(0)

  const MAX_VISIBLE      = 10
  const MAX_SUGGEST_CHAIN = 3
  const isLight     = questionNumber <= 2   // Q1・Q2 = 地上、Q3・Q4 = 地下

  // 質問グループ別カラーテーマ
  const c = {
    pageBg:             isLight ? '#F5F0E8'             : '#EDE5D8',
    progress:           isLight ? 'rgba(93,72,40,0.45)' : 'rgba(60,40,15,0.42)',
    questionText:       isLight ? '#3B2F1E'             : '#2A1F0E',
    tagBg:              isLight ? '#3B2F1E'             : '#2A1F0E',
    tagColor:           isLight ? '#FFFFFF'             : '#F5EDD8',
    overflowBg:         isLight ? 'rgba(59,47,30,0.12)' : 'rgba(42,31,14,0.12)',
    overflowColor:      isLight ? '#3B2F1E'             : '#2A1F0E',
    candidateLabel:     isLight ? 'rgba(59,47,30,0.42)' : 'rgba(42,31,14,0.40)',
    candidateRowAdded:  isLight ? 'rgba(0,0,0,0.03)'    : 'rgba(0,0,0,0.04)',
    candidateRowNormal: isLight ? 'rgba(0,0,0,0.06)'    : 'rgba(0,0,0,0.07)',
    tagTextAdded:       isLight ? 'rgba(59,47,30,0.25)' : 'rgba(42,31,14,0.25)',
    tagTextNormal:      isLight ? '#3B2F1E'             : '#2A1F0E',
    addBtnAdded:        'rgba(0,0,0,0.07)',
    addBtnAddedText:    'rgba(0,0,0,0.2)',
    addBtnNormal:       isLight ? '#4A7C59'             : '#6B4F12',
    addBtnNormalText:   '#FFFFFF',
    genActive:          isLight ? '#4A7C59'             : '#6B4F12',
    genActiveText:      '#FFFFFF',
    genInactive:        'rgba(0,0,0,0.08)',
    genInactiveText:    'rgba(0,0,0,0.28)',
    nextActive:         isLight ? '#4A7C59'             : '#6B4F12',
    nextActiveText:     '#FFFFFF',
    nextInactive:       'rgba(0,0,0,0.08)',
    nextInactiveText:   'rgba(0,0,0,0.28)',
    textareaBg:         isLight ? 'rgba(0,0,0,0.04)'    : 'rgba(0,0,0,0.05)',
    textareaBorder:     isLight ? 'rgba(0,0,0,0.10)'    : 'rgba(0,0,0,0.12)',
  }

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/generate-tags`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました')
      const generated: string[] = data.tags ?? []
      setGeneratedTags(prev => [...prev, ...generated.filter(t => !prev.includes(t))])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const addTag = (tag: string) => {
    if (registeredTags.includes(tag)) return
    const updated = [...registeredTags, tag]
    setRegisteredTags(updated)
    fetchSuggestions(updated)
  }

  // 選択タグから連想される新しいタグをバックグラウンドで取得し、
  // 生成されたタグリストの末尾にそっと追加する（最大3連鎖）
  const fetchSuggestions = async (selected: string[]) => {
    if (suggestChainCount.current >= MAX_SUGGEST_CHAIN) return
    suggestChainCount.current += 1

    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/suggest-tags`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({ selectedTags: selected, type: isLight ? 'light' : 'shadow' }),
      })
      const data = await res.json()
      const suggestions: string[] = Array.isArray(data.tags) ? data.tags : []

      setGeneratedTags(prev => {
        const additions = suggestions.filter(t => !prev.includes(t) && !selected.includes(t))
        if (additions.length === 0) return prev
        setSuggestedTags(prevSet => new Set([...prevSet, ...additions]))
        return [...prev, ...additions]
      })
    } catch {
      // サジェスト失敗は握りつぶす（UIには何も表示しない）
    }
  }

  const removeRegistered = (tag: string) => {
    setRegisteredTags(prev => prev.filter(t => t !== tag))
  }

  const handleNext = () => {
    if (registeredTags.length === 0) return
    onComplete(registeredTags)
  }

  const handleSkip = () => {
    setRegisteredTags([])
    onComplete([])
  }

  const visibleTags   = showAll ? registeredTags : registeredTags.slice(0, MAX_VISIBLE)
  const overflowCount = registeredTags.length - MAX_VISIBLE

  return (
    <div
      className="px-6 pt-12 pb-10"
      style={{ minHeight: '100svh', overflowY: 'auto', position: 'relative', background: c.pageBg, maxWidth: 390, width: '100%', margin: '0 auto' }}
    >
      {/* ── 背景イラスト ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {isLight ? <FruitBg /> : <RootBg />}
      </div>

      {/* ── スキップ ── */}
      <button
        onClick={handleSkip}
        className="absolute"
        style={{
          top: 8, right: 8, zIndex: 2,
          padding: '8px 12px',
          fontSize: 13, color: '#8B7355',
          background: 'none', border: 'none', textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        スキップ
      </button>

      <div style={{ maxWidth: 390, width: '100%', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Progress */}
        <p className="text-xs mb-6 tracking-widest uppercase" style={{ color: c.progress }}>
          {questionNumber} / {totalQuestions}
        </p>

        {/* Question */}
        <div className="mb-8 text-center" style={{ maxWidth: 320 }}>
          <div className="text-center">
            {questionText.split('\n').map((line, i) => (
              <p key={i} className="text-base font-bold leading-relaxed" style={{ color: c.questionText }}>
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* ── Textarea ── */}
        <textarea
          value={text}
          onChange={e => {
            const next = e.target.value
            setText(next)
            // 入力が空になったら、生成済みタグをクリアして固定の例タグ表示に戻す
            if (!next.trim() && generatedTags.length > 0) setGeneratedTags([])
          }}
          placeholder="ここに書いてみてください..."
          rows={4}
          className="w-full rounded-2xl text-sm p-4 outline-none resize-none mb-4 placeholder:text-black/25"
          style={{
            background: c.textareaBg,
            border: `1px solid ${c.textareaBorder}`,
            color: c.questionText,
            transition: 'border-color 0.2s ease',
          }}
        />

        {/* ── Generate button ── */}
        <button
          onClick={handleGenerate}
          disabled={!text.trim() || isGenerating}
          className="w-full py-3.5 rounded-full text-sm font-semibold mb-2.5 transition-all"
          style={{
            background: text.trim() && !isGenerating ? c.genActive    : c.genInactive,
            color:      text.trim() && !isGenerating ? c.genActiveText : c.genInactiveText,
            cursor:     text.trim() && !isGenerating ? 'pointer'      : 'default',
          }}
        >
          {isGenerating ? '生成中...' : 'タグを生成する'}
        </button>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-xs mb-2.5 text-center">{error}</p>
        )}

        {/* ── Next button ── */}
        <button
          onClick={handleNext}
          disabled={registeredTags.length === 0}
          className="w-full py-4 rounded-full text-sm font-semibold mb-6 transition-all"
          style={{
            background: registeredTags.length > 0 ? c.nextActive    : c.nextInactive,
            color:      registeredTags.length > 0 ? c.nextActiveText : c.nextInactiveText,
            cursor:     registeredTags.length > 0 ? 'pointer'       : 'default',
          }}
        >
          次へ
        </button>

        {/* ── Registered tags ── */}
        {registeredTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {visibleTags.map(tag => (
              <button
                key={tag}
                onClick={() => removeRegistered(tag)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: c.tagBg, color: c.tagColor }}
              >
                {tag}
                <span className="text-xs opacity-40 ml-0.5">×</span>
              </button>
            ))}
            {!showAll && overflowCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: c.overflowBg, color: c.overflowColor }}
              >
                +{overflowCount}
              </button>
            )}
          </div>
        )}

        {/* ── Candidate tags ── */}
        {displayTags.length > 0 && (
          <div className="mb-6">
            <p className="text-xs mb-3" style={{ color: c.candidateLabel }}>{generatedTags.length > 0 ? '生成されたタグ' : '例）'}</p>
            <div className="flex flex-col gap-2">
              {displayTags.map(tag => {
                const added = registeredTags.includes(tag)
                return (
                  <div
                    key={tag}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl ${suggestedTags.has(tag) ? 'animate-fadeIn' : ''}`}
                    style={{ background: added ? c.candidateRowAdded : c.candidateRowNormal }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: added ? c.tagTextAdded : c.tagTextNormal }}
                    >
                      {tag}
                    </span>
                    <button
                      onClick={() => addTag(tag)}
                      disabled={added}
                      className="flex items-center justify-center h-7 rounded-full text-xs font-semibold transition-all flex-shrink-0"
                      style={{
                        background: added ? c.addBtnAdded     : c.addBtnNormal,
                        color:      added ? c.addBtnAddedText : c.addBtnNormalText,
                        cursor:     added ? 'default'         : 'pointer',
                        padding: '0 10px',
                        minWidth: 28,
                      }}
                    >
                      {added ? '✓' : addButtonText}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
