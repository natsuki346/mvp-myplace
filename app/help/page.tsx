'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { UserAvatar } from '@/src/components/UserAvatar'
import RequestModal from '@/src/components/RequestModal'

const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

type Worker = {
  userId: string
  username: string
  avatar_url: string | null
  tag: string
  matchCount: number
}

export default function HelpPage() {
  const router = useRouter()
  const [workers, setWorkers] = useState<Worker[] | null>(null)
  const [selected, setSelected] = useState<Worker | null>(null)

  // オンライン＆通話対応（call/both）のワーカーをマッチ度順で取得
  useEffect(() => {
    const uid = localStorage.getItem('user_id')
    if (!uid) { setWorkers([]); return }
    ;(async () => {
      try {
        const res = await fetch(`${EDGE_FUNCTIONS_BASE}/match-users`, {
          method: 'POST',
          headers: EDGE_FUNCTION_HEADERS,
          body: JSON.stringify({ user_id: uid, mode: 'help' }),
        })
        const data = await res.json().catch(() => ({}))
        setWorkers((data?.users as Worker[]) ?? [])
      } catch {
        setWorkers([])
      }
    })()
  }, [])

  // 通話で話す → accepted な connection を用意してチャットへ（通話プリセット付き）
  const startCall = async (w: Worker) => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return
    setSelected(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('connections') as any)
      .select('id')
      .or(`and(requester_id.eq.${uid},receiver_id.eq.${w.userId}),and(requester_id.eq.${w.userId},receiver_id.eq.${uid})`)
    if (!existing || existing.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('connections') as any)
        .insert({ requester_id: uid, receiver_id: w.userId, status: 'accepted' })
    }

    const q = new URLSearchParams({
      friendId: w.userId,
      name: w.username,
      tag: w.tag,
      want: 'call',
      preset: 'こんにちは。通話で話しましょうか？',
    }).toString()
    router.push(`/room/friend/chat?${q}`)
  }

  return (
    <>
    <div className="md:max-w-4xl! md:h-[calc(100svh-56px)]!" style={{
      background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
      height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── ヘッダー（戻る・iOSセーフエリア） ── */}
      <div style={{
        padding: 'calc(12px + env(safe-area-inset-top)) 20px 12px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid rgba(139,115,85,0.15)',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#3B2F1E', padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← 戻る
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>Talk to me — 今話せる人</span>
      </div>

      {/* ── 一覧（オンライン＆通話対応のワーカーのみ・マッチ度順） ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px calc(24px + env(safe-area-inset-bottom))' }}>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.6)', margin: '0 0 14px', textAlign: 'center' }}>
          あなたの悩みを乗り越えた経験があり、いま通話できる人です
        </p>

        {workers === null ? (
          <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)' }}>
            探しています...
          </p>
        ) : workers.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <p style={{ fontSize: 40, margin: '0 0 10px' }}>📞</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', margin: '0 0 6px' }}>
              いま話せる人が見つかりません
            </p>
            <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.55)', margin: 0, lineHeight: 1.7 }}>
              オンラインで通話対応できるワーカーが現れると<br />ここに表示されます
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:items-start">
            {workers.map(w => (
              <button
                key={w.userId}
                onClick={() => setSelected(w)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  background: '#FFFFFF', borderRadius: 14,
                  border: '1px solid rgba(139,115,85,0.15)',
                  boxShadow: '0 1px 4px rgba(59,47,30,0.05)',
                  padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                }}
              >
                <UserAvatar username={w.username} avatarUrl={w.avatar_url} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#3B2F1E', marginBottom: 4 }}>
                    {w.username}
                  </span>
                  <span style={{
                    display: 'inline-block',
                    background: '#E4EFE0', color: '#3B6D11',
                    borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
                  }}>
                    #{w.tag}
                  </span>
                </div>
                <span style={{ fontSize: 13, color: '#4A7C59', fontWeight: 700, flexShrink: 0 }}>
                  📞 話す ›
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* ── 手段選択モーダル（Talk to me フローは通話のみ選択可） ── */}
    {selected && (
      <RequestModal
        name={selected.username}
        tag={selected.tag}
        availableMethods={['call']}
        onClose={() => setSelected(null)}
        onSent={() => {}}
        onTalkNow={() => startCall(selected)}
      />
    )}
    </>
  )
}
