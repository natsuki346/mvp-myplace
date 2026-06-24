'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/src/lib/supabase/client'
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
  // 初期値はWeb版（SSR/静的書き出し時と同じ見た目）にしておき、マウント後に
  // ネイティブ判定で切り替える（ハイドレーション不一致を避けるため）
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform())
  }, [])

  // 起動時：デイジーの花が咲くスプラッシュを少し見せてから、入力フォームへ
  useEffect(() => {
    const t1 = setTimeout(() => setSplashVisible(true), 20)
    const t2 = setTimeout(() => setStage('form'), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (stage !== 'form') return
    const t = setTimeout(() => setFormVisible(true), 20)
    return () => clearTimeout(t)
  }, [stage])

  const usernameError = getUsernameError(username.trim())
  // Web版はパスワード不要。ネイティブ版のみパスワード必須
  const isValid = username.trim().length > 0 && !usernameError && (!isNative || password.length >= MIN_PASSWORD_LENGTH)

  const handleSubmit = async () => {
    if (!isValid || loading) return
    setLoading(true)
    setError(null)
    try {
      const trimmed = username.trim()

      // 既存ユーザーかどうかを確認する（password_hashは列権限で保護されているため選択不可。
      // id/usernameのみ取得し、新規作成か既存ログインかをここで判定する）
      const { data: existing } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', trimmed)
        .maybeSingle() as { data: { id: string; username: string } | null; error: unknown }

      let user: { id: string; username: string }

      if (isNative) {
        // ネイティブアプリ（Capacitor）：パスワード認証（Edge Function経由）
        const endpoint = existing ? 'auth-verify' : 'auth-signup'
        const res = await fetch(`${EDGE_FUNCTIONS_BASE}/${endpoint}`, {
          method: 'POST',
          headers: EDGE_FUNCTION_HEADERS,
          body: JSON.stringify({ username: trimmed, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました')
        user = data.user
      } else if (existing) {
        // Web版・既存ユーザー：パスワードなしでそのまま使う
        user = existing
      } else {
        // Web版・新規ユーザー：password_hashを扱わずusernameのみでinsert
        const { data: created, error: dbErr } = await supabase
          .from('users')
          .insert([{ username: trimmed }])
          .select('id, username')
          .single() as { data: { id: string; username: string } | null; error: unknown }
        if (dbErr) throw dbErr
        if (!created) throw new Error('no data')
        user = created
      }

      sessionStorage.setItem('user_id',  user.id)
      sessionStorage.setItem('username', user.username)
      router.push('/welcome')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

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

        <div className={isNative ? 'mb-6' : 'mb-8'}>
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

        {isNative && (
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
        )}

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
