'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { saveSession } from '@/src/lib/session'
import DaisyFlower from '@/src/components/DaisyFlower'

type Stage = 'splash' | 'form'

const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

const MIN_PASSWORD_LENGTH = 6

// Instagram/X風のユーザー名ルール：半角英数字・_・.のみ、3〜20文字、
// 先頭/末尾のピリオド禁止、ピリオドの連続禁止
function getUsernameError(value: string): string | null {
  if (value.length === 0) return null
  if (/[^a-zA-Z0-9_.]/.test(value)) return '半角英数字と _ . のみ使用できます'
  if (value.startsWith('.') || value.endsWith('.')) return 'ピリオドは先頭・末尾に使用できません'
  if (value.includes('..')) return 'ピリオドを連続して使用することはできません'
  if (value.length < 3 || value.length > 20) return '3〜20文字で入力してください'
  return null
}

export default function UsernamePage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('splash')
  const [splashVisible, setSplashVisible] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  // 既にログイン済み（localStorage に user_id）なら、この画面は出さずホームへ戻す
  const [redirecting, setRedirecting] = useState(false)

  // 自動ログイン：localStorage に user_id が残っていれば入力フォームを出さずトップへ。
  // （トップ = app/page.tsx がオンボーディング済みか判定して /home か /welcome へ振り分ける）
  useEffect(() => {
    if (localStorage.getItem('user_id')) {
      setRedirecting(true)
      router.replace('/')
    }
  }, [router])

  // 起動時：デイジーの花が咲くスプラッシュを少し見せてから、入力フォームへ
  useEffect(() => {
    if (redirecting) return
    const t1 = setTimeout(() => setSplashVisible(true), 20)
    const t2 = setTimeout(() => setStage('form'), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [redirecting])

  useEffect(() => {
    if (stage !== 'form') return
    const t = setTimeout(() => setFormVisible(true), 20)
    return () => clearTimeout(t)
  }, [stage])

  const usernameError = getUsernameError(username.trim())
  // ユーザー名＋パスワード（6文字以上）を全プラットフォーム共通で必須にする。
  const isValid = username.trim().length > 0 && !usernameError && password.length >= MIN_PASSWORD_LENGTH

  // 認証はすべて Edge Function 経由（service_role でハッシュ照合）。
  // 静的書き出し（output:'export'）のため API Route は使えず、また anon ロールは
  // users テーブルへ INSERT できない（RLSにINSERTポリシー無し・password_hashは列権限で保護）ため、
  // 新規作成・ログインとも Edge Function に集約する。
  const callAuth = async (
    endpoint: 'auth-signup' | 'auth-verify',
    trimmed: string,
  ): Promise<{ ok: boolean; status: number; data: { user?: { id: string; username: string }; error?: string } }> => {
    // 15秒タイムアウト: ネットワーク不通や無応答で loading=true のまま固まるのを防ぐ
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 15000)
    let res: Response
    try {
      res = await fetch(`${EDGE_FUNCTIONS_BASE}/${endpoint}`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({ username: trimmed, password }),
        signal: ctrl.signal,
      })
    } catch (e) {
      throw new Error(
        (e instanceof Error && e.name === 'AbortError')
          ? 'タイムアウトしました。通信環境を確認してもう一度お試しください。'
          : 'ネットワークエラーが発生しました。'
      )
    } finally {
      clearTimeout(tid)
    }
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }

  const handleSubmit = async () => {
    if (!isValid || loading) return
    setLoading(true)
    setError(null)
    try {
      const trimmed = username.trim()

      // 既存ユーザーかどうかを確認する（password_hashは列権限で保護されているため選択不可。
      // id/usernameのみ取得し、新規作成（auth-signup）か既存ログイン（auth-verify）かを判定する）
      const { data: existing } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', trimmed)
        .maybeSingle() as { data: { id: string; username: string } | null; error: unknown }

      let user: { id: string; username: string }

      if (existing) {
        // 既存ユーザー：パスワード照合（未設定の旧アカウントは入力値で自動登録される）
        const r = await callAuth('auth-verify', trimmed)
        if (!r.ok || !r.data.user) throw new Error(r.data.error ?? 'ログインに失敗しました')
        user = r.data.user
      } else {
        // 新規ユーザー：作成。ただし existing 判定と実DBの間に競合（既に作成済み）が
        // あり得るため、409（重複）なら verify にフォールバックしてログインを成立させる。
        const r = await callAuth('auth-signup', trimmed)
        if (r.status === 409) {
          const v = await callAuth('auth-verify', trimmed)
          if (!v.ok || !v.data.user) throw new Error(v.data.error ?? 'ログインに失敗しました')
          user = v.data.user
        } else if (!r.ok || !r.data.user) {
          throw new Error(r.data.error ?? '登録に失敗しました')
        } else {
          user = r.data.user
        }
      }

      saveSession(user.id, user.username)

      // オンボーディング済みか確認（済みなら初期登録をスキップしてトップへ）。
      // onboarded_at 列が無い環境では未完了扱い＝/welcome へ。
      let onboarded = false
      try {
        const { data: prof } = await supabase
          .from('users')
          .select('onboarded_at')
          .eq('id', user.id)
          .maybeSingle() as { data: { onboarded_at: string | null } | null }
        onboarded = !!prof?.onboarded_at
      } catch { /* 列なし等は未完了扱い */ }

      if (onboarded) {
        localStorage.setItem('onboarded_v2', 'true')
        router.replace('/')
      } else {
        router.push('/welcome')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  // 自動ログインでリダイレクト中は何も描画しない（フォームのちらつきを防ぐ）
  if (redirecting) return null

  if (stage === 'splash') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8', maxWidth: 390, margin: '0 auto' }}>
        <DaisyFlower size={140} animate={splashVisible} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{
      background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
      opacity: formVisible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div className="w-full">

        <div className="mb-10">
          <h1 className="text-2xl font-semibold leading-snug" style={{ color: '#3B2F1E' }}>
            あなたの名前を<br />教えてください
          </h1>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="@username"
            maxLength={20}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full bg-transparent border-b border-[#4A7C59]/35 text-lg py-3 outline-none placeholder-[#A89880] focus:border-[#4A7C59] transition-colors"
            style={{ color: '#3B2F1E' }}
          />
          <p className="text-xs mt-2 text-right" style={{ color: '#A89880' }}>
            {username.length} / 20
          </p>
          {usernameError && (
            <p className="text-red-400 text-xs mt-1">{usernameError}</p>
          )}
        </div>

        <div className="mb-8">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="パスワード（6文字以上）"
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full bg-transparent border-b border-[#4A7C59]/35 text-lg py-3 outline-none placeholder-[#A89880] focus:border-[#4A7C59] transition-colors"
            style={{ color: '#3B2F1E' }}
          />
          {password.length > 0 && password.length < MIN_PASSWORD_LENGTH && (
            <p className="text-red-400 text-xs mt-1">パスワードは{MIN_PASSWORD_LENGTH}文字以上で入力してください</p>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-xs mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full py-4 rounded-full text-sm font-semibold transition-all"
          style={{
            background: isValid && !loading ? '#4A7C59' : '#C4B49A',
            color:      isValid && !loading ? '#FFFFFF' : '#F5F0E8',
            cursor:     isValid && !loading ? 'pointer' : 'default',
          }}
        >
          {loading ? '確認中...' : '次へ'}
        </button>


      </div>
    </div>
  )
}
