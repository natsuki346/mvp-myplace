'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ── 2問だけの登録フロー（自由入力 → AIタグ生成 → 確認・選択） ─────────────────
// Step1（light / 経験）：Rescue時のマッチングタグ
// Step2（shadow / 悩み）：HELP時のマッチングタグ
// 各ステップ：自由入力 → generate-tags でAI生成 → 生成タグを選択 → 保存
// 完了 → complete-onboarding Edge Function でタグ保存＋onboarded_at記録 → /mode
const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

type StepKey = 'exp' | 'worry'

// タグを1つ選ぶたびに、関連タグを suggest-tags で生成して候補に追加する。
// 無限に増え続けないよう、1ステップあたりの連鎖回数に上限を設ける（元オンボーディング踏襲）。
const MAX_SUGGEST_CHAIN = 3

const STEPS: {
  key: StepKey
  title: string
  hint: string
  placeholder: string
}[] = [
  {
    key: 'exp',
    title: 'これは乗り越えたな、\nという経験は？',
    hint: '思い出をそのまま、自由に書いてください。あなたの言葉からタグを作ります。',
    placeholder: '例：高校のときにいじめられて学校に行けなくなったけど、\n1年かけて自分の居場所を見つけられた…',
  },
  {
    key: 'worry',
    title: '今、誰にも言えずに\n抱えていることは？',
    hint: '心のなかにあることを、そのまま書いてください。あなたの言葉からタグを作ります。',
    placeholder: '例：仕事は順調に見えるけど、本当はこのままでいいのか\n毎晩不安で眠れない…',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [inputs, setInputs] = useState<Record<StepKey, string>>({ exp: '', worry: '' })
  const [generated, setGenerated] = useState<Record<StepKey, string[]>>({ exp: [], worry: [] })
  const [selected, setSelected] = useState<Record<StepKey, string[]>>({ exp: [], worry: [] })
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)

  const current = STEPS[step]
  const text = inputs[current.key]
  const tags = generated[current.key]
  const chosen = selected[current.key]

  const setText = (v: string) =>
    setInputs(prev => ({ ...prev, [current.key]: v }))

  // ── 音声入力（マイク）：話した内容を入力欄に書き起こす ─────────────────────────
  // ネイティブ(iOS)は @capacitor-community/speech-recognition、ブラウザは Web Speech API。
  // 認識結果は入力開始時点のテキスト（baseTextRef）の後ろに追記する。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webRecognitionRef = useRef<any>(null)
  const baseTextRef = useRef('')

  const stopVoice = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
        await SpeechRecognition.stop().catch(() => {})
        await SpeechRecognition.removeAllListeners().catch(() => {})
      } else if (webRecognitionRef.current) {
        webRecognitionRef.current.stop()
        webRecognitionRef.current = null
      }
    } catch { /* 停止できない環境は無視 */ }
    setListening(false)
  }

  const startVoice = async () => {
    setError(null)
    baseTextRef.current = text.trim() ? text.trimEnd() + '\n' : ''
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
        const perm = await SpeechRecognition.requestPermissions()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((perm as any)?.speechRecognition === 'denied') {
          setError('マイクの使用が許可されていません。設定から許可してください。')
          return
        }
        await SpeechRecognition.removeAllListeners().catch(() => {})
        await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          const m = data?.matches?.[0]
          if (m) setText(baseTextRef.current + m)
        })
        await SpeechRecognition.start({ language: 'ja-JP', partialResults: true, popup: false })
        setListening(true)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) { setError('この環境では音声入力を利用できません'); return }
        const rec = new SR()
        rec.lang = 'ja-JP'
        rec.interimResults = true
        rec.continuous = true
        let finalText = ''
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
          let interim = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const tr = e.results[i][0].transcript
            if (e.results[i].isFinal) finalText += tr
            else interim += tr
          }
          setText(baseTextRef.current + finalText + interim)
        }
        rec.onerror = () => setListening(false)
        rec.onend = () => setListening(false)
        webRecognitionRef.current = rec
        rec.start()
        setListening(true)
      }
    } catch {
      setError('音声入力を開始できませんでした')
      setListening(false)
    }
  }

  const toggleVoice = () => { if (listening) void stopVoice(); else void startVoice() }

  // ステップ切替・離脱時は必ず認識を止める
  useEffect(() => {
    if (listening) void stopVoice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
  useEffect(() => () => { void stopVoice() }, [])

  // ステップごとの関連タグ連鎖回数カウンタ（生成し直すたびにリセット）
  const suggestChain = useRef<Record<StepKey, number>>({ exp: 0, worry: 0 })

  // 選んだタグから連想される関連タグを suggest-tags で取得し、候補（generated）の
  // 末尾にそっと追加する。既存の候補・選択済みと重複するものは除外。最大3連鎖。
  const fetchSuggestions = async (key: StepKey, selectedList: string[]) => {
    if (suggestChain.current[key] >= MAX_SUGGEST_CHAIN) return
    suggestChain.current[key] += 1
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/suggest-tags`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({
          selectedTags: selectedList.map(t => t.replace(/^#+/, '')),
          type: key === 'exp' ? 'light' : 'shadow',
        }),
      })
      const data = await res.json().catch(() => ({}))
      const raw: string[] = Array.isArray(data?.tags) ? data.tags : []
      // suggest-tags は # なしで返すので、候補の見た目に合わせて # を付与して正規化
      const norm = raw.map(t => (t.startsWith('#') ? t : `#${t}`))
      setGenerated(prev => {
        const exist = prev[key]
        const additions = norm.filter(t => !exist.includes(t) && !selectedList.includes(t))
        if (additions.length === 0) return prev
        return { ...prev, [key]: [...exist, ...additions] }
      })
    } catch {
      // サジェスト失敗はUIに出さず握りつぶす（元オンボーディング踏襲）
    }
  }

  // タグ選択のトグル。新たに選んだ（追加した）ときだけ関連タグ生成を走らせる。
  const toggle = (t: string) => {
    const list = selected[current.key]
    const isAdding = !list.includes(t)
    const next = isAdding ? [...list, t] : list.filter(x => x !== t)
    setSelected(prev => ({ ...prev, [current.key]: next }))
    if (isAdding) void fetchSuggestions(current.key, next)
  }

  // AIタグ生成：入力文から generate-tags でタグを作り、追加・全選択する
  const generate = async () => {
    if (!text.trim() || generating) return
    setError(null)
    setGenerating(true)
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/generate-tags`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({ text: text.trim(), type: current.key }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'タグの生成に失敗しました')
      const newTags: string[] = data?.tags ?? []
      // 生成し直したら関連タグの連鎖回数をリセット（またサジェスト可能にする）
      suggestChain.current[current.key] = 0
      setGenerated(prev => ({
        ...prev,
        [current.key]: [...prev[current.key], ...newTags.filter(t => !prev[current.key].includes(t))],
      }))
      // 生成タグは「候補」。ユーザーがタップして選ぶと、そのタグから連想される
      // 関連タグが下に追加される（元オンボーディングのロジックを踏襲）。自動選択はしない。
    } catch (e) {
      setError(e instanceof Error ? e.message : 'タグの生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  // 最終ステップ：選択中のタグを保存してモード選択へ
  const submitOnboarding = async () => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
    if (!userId) { router.replace('/username'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/complete-onboarding`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({
          user_id: userId,
          experienceTags: selected.exp,
          worryTags: selected.worry,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? '保存に失敗しました')

      // ゲートの主役はクライアント側のフラグ（onboarded_at 列が無くても動く）
      localStorage.setItem('onboarded_v2', 'true')
      router.replace('/mode')
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました。もう一度お試しください。')
      setSubmitting(false)
    }
  }

  const handleNext = async () => {
    if (chosen.length === 0 || submitting) return
    setError(null)
    if (step < STEPS.length - 1) { setStep(step + 1); return }
    await submitOnboarding()
  }

  // スキップ：このステップのタグを付けずに次へ（最終ステップなら現状のまま保存）
  const handleSkip = async () => {
    if (submitting) return
    setError(null)
    if (step < STEPS.length - 1) { setStep(step + 1); return }
    await submitOnboarding()
  }

  return (
    // 外側：画面全体をスクロール可能に（タグが増えても全部見える）
    <div style={{ background: '#F5F0E8', height: '100svh', overflowY: 'auto' }}>
    {/* 内側：内容が短いときは縦中央、長いときはスクロールで全部見える（次へも到達可能） */}
    <div style={{
      maxWidth: 390, margin: '0 auto', boxSizing: 'border-box',
      minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: 'calc(28px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))',
    }}>
      {/* 進捗（左）＋スキップ（右） */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#A89880', fontWeight: 600 }}>
          {step + 1} / {STEPS.length}
        </span>
        <button
          onClick={handleSkip}
          disabled={submitting}
          style={{
            fontSize: 13, background: 'none', border: 'none',
            cursor: submitting ? 'default' : 'pointer', color: 'rgba(59,47,30,0.42)', padding: 4,
          }}
        >
          スキップ
        </button>
      </div>

      {/* 質問文 */}
      <h1 style={{
        fontSize: 24, fontWeight: 700, color: '#3B2F1E',
        lineHeight: 1.6, margin: '12px 0 6px', whiteSpace: 'pre-line',
      }}>
        {current.title}
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', margin: '0 0 20px' }}>
        {current.hint}
      </p>

      {/* 自由入力 */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={current.placeholder}
        rows={5}
        style={{
          width: '100%', fontSize: 16, lineHeight: 1.7, padding: '14px 16px',
          borderRadius: 14, border: '1px solid #D4B896', background: '#FFFFFF',
          color: '#3B2F1E', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
        }}
      />

      {/* AIタグ生成ボタン */}
      <button
        onClick={generate}
        disabled={!text.trim() || generating}
        style={{
          marginTop: 12, padding: '12px 0', borderRadius: 22, border: 'none',
          background: text.trim() && !generating ? '#C9A84C' : 'rgba(201,168,76,0.4)',
          color: '#FFFFFF', fontSize: 14, fontWeight: 700,
          cursor: text.trim() && !generating ? 'pointer' : 'default',
        }}
      >
        {generating ? '生成中...' : tags.length > 0 ? '✨ もう一度生成する' : '✨ AIにタグを作ってもらう'}
      </button>

      {/* 音声入力（マイク）：生成ボタンの下に小さく丸く配置 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12 }}>
        <button
          onClick={toggleVoice}
          aria-label="音声で入力"
          style={{
            width: 46, height: 46, borderRadius: '50%',
            cursor: 'pointer',
            border: listening ? 'none' : '1px solid #D4B896',
            background: listening ? '#C0392B' : '#FFFFFF',
            color: listening ? '#FFFFFF' : '#8B6914',
            fontSize: 20, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: listening
              ? '0 0 0 6px rgba(192,57,43,0.15)'
              : '0 1px 4px rgba(59,47,30,0.08)',
            transition: 'all .15s ease',
          }}
        >
          🎤
        </button>
        <span style={{ fontSize: 11, color: listening ? '#C0392B' : 'rgba(59,47,30,0.5)', marginTop: 6 }}>
          {listening ? '聞き取り中… タップで停止' : '声で入力する'}
        </span>
      </div>

      {/* 生成されたタグ（確認・選択） */}
      {tags.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.55)', margin: '20px 0 10px' }}>
            あなたに合うタグを選んでください（複数OK）
          </p>
          {/* タグは縦一列・フル幅・最低48pxのタップ領域 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tags.map(t => {
              const on = chosen.includes(t)
              return (
                <button
                  key={t}
                  onClick={() => toggle(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', minHeight: 48, boxSizing: 'border-box',
                    padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 15, fontWeight: on ? 700 : 500,
                    border: on ? '2px solid #4A7C59' : '1px solid #D4B896',
                    background: on ? '#E4EFE0' : '#FFFFFF',
                    color: on ? '#3B6D11' : '#5C3A1E',
                  }}
                >
                  <span style={{ width: 18, flexShrink: 0, textAlign: 'center', color: '#4A7C59', fontWeight: 700 }}>
                    {on ? '✓' : ''}
                  </span>
                  <span>{t}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {error && <p style={{ color: '#C0392B', fontSize: 13, marginTop: 16 }}>{error}</p>}

      {/* フッター（戻る・次へ） */}
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        {step > 0 && (
          <button
            onClick={() => { setError(null); setStep(step - 1) }}
            disabled={submitting}
            style={{
              padding: '15px 22px', borderRadius: 26, cursor: 'pointer',
              border: '1px solid #8B6914', background: 'transparent', color: '#8B6914',
              fontSize: 15, fontWeight: 700,
            }}
          >
            戻る
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={chosen.length === 0 || submitting}
          style={{
            flex: 1, padding: '15px 0', borderRadius: 26, border: 'none',
            background: chosen.length > 0 && !submitting ? '#4A7C59' : 'rgba(74,124,89,0.4)',
            color: '#F5F0E8', fontSize: 15, fontWeight: 700,
            cursor: chosen.length > 0 && !submitting ? 'pointer' : 'default',
          }}
        >
          {submitting ? '保存中...' : step < STEPS.length - 1 ? '次へ' : 'はじめる'}
        </button>
      </div>
    </div>
    </div>
  )
}
