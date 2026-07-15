'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { UserAvatar } from '@/src/components/UserAvatar'
import RequestModal from '@/src/components/RequestModal'

// methods: そのホストが対応可能な手段のみ（'call'=通話 / 'meet'=会って話す）
// isOnline: いまアプリを開いている人のみ true（false は一覧に表示しない）
// userId: チャット・予約（friend_messages / bookings）で使う実ユーザーID
export type Host = { name: string; userId: string; tag: string; distance: string; method: string; methods: string[]; isOnline: boolean }

// 話を聞ける人（ホスト）の仮データ（後で実装）
export const HOSTS: Host[] = [
  { name: 'さとみ', userId: '2194fa0c-fb9c-4bf7-a7dd-7f232e74fd27', tag: '子育て経験',   distance: '800m',       method: '通話・会ってOK', methods: ['call', 'meet'], isOnline: true },
  { name: 'けんじ', userId: '96327978-a39a-42b2-810a-6841179c62d6', tag: '転職を経験',   distance: '2.1km',      method: '通話のみ',       methods: ['call'],         isOnline: false },
  { name: 'ゆい',   userId: '35290bd1-acd1-4027-a1e2-4466c902f842', tag: 'うつ経験',     distance: 'オンライン', method: '通話OK',         methods: ['call'],         isOnline: true },
  { name: 'まさと', userId: '6871211c-ab6a-44fb-a8aa-99b70fb6d56d', tag: '不登校を経験', distance: '3.4km',      method: '会って話すのみ', methods: ['meet'],         isOnline: true },
]

// 手段に応じた初期メッセージ（チャット遷移時に入力欄へプリセット）
const PRESET_MESSAGES: Record<string, string> = {
  call: 'こんにちは。通話で話しましょうか？',
  meet: 'こんにちは。どこで会いますか？',
}

// 「話を聞ける人」一覧（/help・/sos で共用）。
// カードをタップ→「今すぐ話す」で即チャットへ遷移。
export default function HostList() {
  const router = useRouter()
  const [selected, setSelected] = useState<Host | null>(null)
  const [requested, setRequested] = useState<Set<string>>(new Set())

  // 「今すぐ話す」→ accepted な connection を用意してチャットへ遷移
  const talkNow = async (host: Host, method: string) => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('connections') as any)
      .select('id')
      .or(`and(requester_id.eq.${uid},receiver_id.eq.${host.userId}),and(requester_id.eq.${host.userId},receiver_id.eq.${uid})`)
    if (!existing || existing.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('connections') as any)
        .insert({ requester_id: uid, receiver_id: host.userId, status: 'accepted' })
    }

    const q = new URLSearchParams({
      friendId: host.userId,
      name: host.name,
      tag: host.tag,
      want: method,
      preset: PRESET_MESSAGES[method] ?? '',
    }).toString()
    router.push(`/room/friend/chat?${q}`)
  }

  return (
    <>
      {/* PC時はカードグリッド、スマホは縦リストのまま */}
      <div className="md:grid! md:grid-cols-2 lg:grid-cols-3 md:gap-4! md:items-start" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* オンライン（いまアプリを開いている人）のみ表示 */}
        {HOSTS.filter(h => h.isOnline).map(item => {
          const done = requested.has(item.name)
          return (
            <button
              key={item.name}
              className="md:flex-wrap md:p-4!"
              onClick={() => !done && setSelected(item)}
              disabled={done}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                background: done ? '#ECE7DE' : '#FFFFFF',
                borderRadius: 14,
                border: '1px solid rgba(139,115,85,0.15)',
                boxShadow: done ? 'none' : '0 1px 4px rgba(59,47,30,0.05)',
                padding: '12px 14px', textAlign: 'left',
                cursor: done ? 'default' : 'pointer',
                opacity: done ? 0.65 : 1,
                transition: 'opacity 0.2s ease, background 0.2s ease',
              }}
            >
              <div style={{ position: 'relative', filter: done ? 'grayscale(1)' : 'none' }}>
                <UserAvatar username={item.name} avatarUrl={null} size={44} />
                {/* オンライン状態のグリーンドット */}
                <span style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 12, height: 12, borderRadius: '50%',
                  background: '#34C759', border: '2px solid #FFFFFF',
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>{item.name}</span>
                  <span style={{
                    background: done ? 'rgba(139,115,85,0.2)' : '#F5E1A8',
                    color: done ? 'rgba(59,47,30,0.5)' : '#7A5C00',
                    borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
                  }}>
                    #{item.tag}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: done ? 'rgba(59,47,30,0.4)' : '#4A7C59', margin: 0 }}>
                  {done ? 'リクエスト済み' : `対応方法：${item.method}`}
                </p>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)', flexShrink: 0, alignSelf: 'flex-start' }}>
                {item.distance}
              </span>
              {/* PC専用：カード下部の「話しかける」ボタン（カード全体のクリックと同じ動作） */}
              {!done && (
                <span className="hidden md:flex w-full justify-center items-center py-2 rounded-full bg-[#4A7C59] text-[#F5F0E8] text-sm font-bold">
                  話しかける
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <RequestModal
          name={selected.name}
          tag={selected.tag}
          availableMethods={selected.methods}
          onClose={() => setSelected(null)}
          onSent={() => setRequested(prev => new Set(prev).add(selected.name))}
          onTalkNow={(method) => talkNow(selected, method)}
        />
      )}
    </>
  )
}
