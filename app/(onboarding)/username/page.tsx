'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import DaisyFlower from '@/src/components/DaisyFlower'

type Stage = 'splash' | 'form'

export default function UsernamePage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('splash')
  const [splashVisible, setSplashVisible] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [username, setUsername] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

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
            className="w-full bg-transparent border-b border-[#4A7C59]/35 text-lg py-3 outline-none placeholder-[#A89880] focus:border-[#4A7C59] transition-colors"
            style={{ color: '#3B2F1E' }}
          />
          <p className="text-xs mt-2 text-right" style={{ color: '#A89880' }}>
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
            background: isValid && !loading ? '#4A7C59' : '#C4B49A',
            color:      isValid && !loading ? '#FFFFFF' : '#F5F0E8',
            cursor:     isValid && !loading ? 'pointer' : 'default',
          }}
        >
          {loading ? '登録中...' : '次へ'}
        </button>


      </div>
    </div>
  )
}
