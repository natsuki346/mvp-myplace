'use client'

// 予定リスト（bookings status='scheduled' の未来分）。
// もとは app/record/page.tsx の予定タブ。

import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/src/components/UserAvatar'
import { GOLD, CARD_BG, CARD_BORDER, methodLabel, type SchedItem } from './recordShared'

type Props = {
  schedules: SchedItem[]
  entering: string | null
  enterRoom: (msgId: string, partnerId: string) => void
}

export default function ScheduleSection({ schedules, entering, enterRoom }: Props) {
  const router = useRouter()

  if (schedules.length === 0) {
    return (
      <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)', lineHeight: 1.7 }}>
        予定はありません。<br />チャットの「📅 予定を登録する」から追加できます
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {schedules.map(({ id, partner, partnerTag, date, time, at, method }) => {
        const pid = partner?.id ?? ''
        const canEnter = Date.now() >= at - 30 * 60 * 1000
        const d = new Date(`${date}T00:00:00`)
        return (
          <div key={id} style={{
            background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
            borderRadius: 14, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <UserAvatar username={partner?.username} avatarUrl={partner?.avatar_url ?? null} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>{partner?.username ?? '不明'}</span>
                  {partnerTag && (
                    <span style={{
                      background: '#F5E1A8', color: '#7A5C00',
                      borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600,
                    }}>#{partnerTag.replace(/^#+/, '')}</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(59,47,30,0.6)', margin: '3px 0 0' }}>
                  📅 {d.getMonth() + 1}/{d.getDate()} {time}〜　{methodLabel(method)}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => canEnter && pid && enterRoom(id, pid)}
                disabled={!canEnter || entering === id}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 20, border: 'none',
                  background: canEnter ? `linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)` : 'rgba(139,115,85,0.15)',
                  color: canEnter ? '#FFFFFF' : 'rgba(59,47,30,0.4)',
                  fontSize: 12, fontWeight: 700,
                  cursor: canEnter ? 'pointer' : 'default',
                }}
              >
                {entering === id ? '接続中...' : canEnter ? '入室する' : 'まだ早い'}
              </button>
              <button
                onClick={() => pid && router.push(`/room/friend/chat?friendId=${pid}`)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 20,
                  border: `1px solid ${GOLD}`, background: 'transparent', color: '#8B6914',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                チャット
              </button>
            </div>
          </div>
        )
      })}
      <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(59,47,30,0.5)', margin: '6px 0 0' }}>
        🔔 予定時刻の30分前に通知が届きます
      </p>
    </div>
  )
}
