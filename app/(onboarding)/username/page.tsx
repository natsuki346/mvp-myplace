'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'

export default function UsernamePage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const isValid = username.trim().length > 0

  const handleSubmit = async () => {
    if (!isValid || loading) return
    setLoading(true)
    setError(null)
    try {
      const trimmed = username.trim()

      // 既存ユーザーを検索
      const { data: existing } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', trimmed)
        .single() as { data: { id: string; username: string } | null; error: unknown }

      if (existing) {
        // 既存ユーザー → そのまま使う
        sessionStorage.setItem('user_id',  existing.id)
        sessionStorage.setItem('username', existing.username)
      } else {
        // 新規作成
        const { data: created, error: dbErr } = await supabase
          .from('users')
          .insert([{ username: trimmed }])
          .select()
          .single() as { data: { id: string; username: string } | null; error: unknown }
        if (dbErr) throw dbErr
        if (!created) throw new Error('no data')
        sessionStorage.setItem('user_id',  created.id)
        sessionStorage.setItem('username', created.username)
      }
      router.push('/welcome')
    } catch {
      setError('ユーザー名の登録に失敗しました。別の名前を試してください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full" style={{ maxWidth: 390 }}>

        <div className="mb-10">
          <h1 className="text-white text-2xl font-semibold leading-snug">
            あなたの名前を<br />教えてください
          </h1>
        </div>

        <div className="mb-8">
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
            className="w-full bg-transparent border-b border-white/30 text-white text-lg py-3 outline-none placeholder:text-white/30 focus:border-white transition-colors"
          />
          <p className="text-white/30 text-xs mt-2 text-right">
            {username.length} / 20
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-xs mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full py-4 rounded-full text-sm font-semibold transition-all"
          style={{
            background: isValid && !loading ? 'white' : 'rgba(255,255,255,0.12)',
            color:      isValid && !loading ? 'black' : 'rgba(255,255,255,0.3)',
            cursor:     isValid && !loading ? 'pointer' : 'default',
          }}
        >
          {loading ? '登録中...' : '次へ'}
        </button>

      </div>
    </div>
  )
}
