'use client'

// 通話履歴リスト（video_room・日付降順）。
// もとは app/record/page.tsx の履歴タブ。
// limit を渡すと件数を絞り「もっと見る ›」で /record?view=history へ誘導する
// （プロフィール埋め込み用）。

import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/src/components/UserAvatar'
import {
  GOLD, CARD_BG, CARD_BORDER, fmtDateTime, mockDuration,
  type MsgRow, type UserRow,
} from './recordShared'

type Props = {
  history: MsgRow[]
  users: Map<string, UserRow>
  partnerOf: (m: MsgRow) => string
  limit?: number
}

export default function HistorySection({ history, users, partnerOf, limit }: Props) {
  const router = useRouter()

  if (history.length === 0) {
    return (
      <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)' }}>
        まだ通話の履歴はありません
      </p>
    )
  }

  const shown = limit ? history.slice(0, limit) : history
  const hasMore = limit != null && history.length > limit

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {shown.map(m => {
        const pid = partnerOf(m)
        const u = users.get(pid)
        return (
          <div key={m.id} style={{
            background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
            borderRadius: 14, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <UserAvatar username={u?.username} avatarUrl={u?.avatar_url ?? null} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>{u?.username ?? '不明'}</span>
              <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.6)', margin: '3px 0 0' }}>
                🎥 {fmtDateTime(m.created_at)}・約{mockDuration(m.id)}分
              </p>
            </div>
            <button
              onClick={() => router.push(`/room/friend/chat?friendId=${pid}`)}
              style={{
                padding: '8px 12px', borderRadius: 20, flexShrink: 0,
                border: `1px solid ${GOLD}`, background: 'transparent', color: '#8B6914',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              またビデオ通話する
            </button>
          </div>
        )
      })}
      {hasMore && (
        <button
          onClick={() => router.push('/record?view=history')}
          style={{
            alignSelf: 'center', marginTop: 2, padding: '8px 18px', borderRadius: 20,
            border: `1px solid ${CARD_BORDER}`, background: CARD_BG, color: '#8B6914',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          もっと見る ›
        </button>
      )}
    </div>
  )
}
