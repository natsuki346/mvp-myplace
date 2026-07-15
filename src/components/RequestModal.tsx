'use client'

import { useEffect, useState } from 'react'
import { UserAvatar } from '@/src/components/UserAvatar'

// 「何で話すか / どう応えるか」の選択肢（チャットは廃止）
const METHODS = [
  { key: 'call', icon: '📞', label: '通話' },
  { key: 'meet', icon: '🤝', label: '会って話す' },
]

// 接続方法を選んでリクエスト（通知）を送るモーダル。
// wantedMethod を渡すと Rescue（相手の希望に応える）用の文言になる。
export default function RequestModal({
  name, tag, wantedMethod, availableMethods, onClose, onSent, onRespond, onTalkNow,
}: {
  name: string
  tag: string
  wantedMethod?: string
  // 指定時、含まれない手段はグレーアウト・選択不可にする（未指定なら全て選択可）
  availableMethods?: string[]
  onClose: () => void
  onSent: () => void
  // Rescue：指定時、「応答する」でこのハンドラを呼ぶ（チャット遷移など）。完了ビューは出さない。
  onRespond?: () => void
  // HELP：指定時、主ボタンが「今すぐ話す」になり選択した手段を渡して即チャットへ
  onTalkNow?: (method: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const [method, setMethod] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const isRescue = !!wantedMethod

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const close = () => { setVisible(false); setTimeout(onClose, 200) }

  // リクエスト送信（モック：実際にはここで通知を送る）→ 親をグレーモードに
  // Rescue は相手の希望する手段で応答するため、手段選択なしで送信できる
  const send = () => {
    if (!isRescue && !method) return
    setSent(true)
    onSent()
  }

  const methodLabel = isRescue
    ? (wantedMethod ?? '')
    : (METHODS.find(m => m.key === method)?.label ?? '')

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(59,47,30,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 320,
          background: '#F5F0E8', borderRadius: 20, padding: '24px 20px', position: 'relative',
          transform: visible ? 'scale(1)' : 'scale(0.95)', transition: 'transform 0.2s ease',
        }}
      >
        <button
          onClick={close}
          aria-label="閉じる"
          style={{
            position: 'absolute', top: 12, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'rgba(59,47,30,0.4)', lineHeight: 1, padding: 2,
          }}
        >✕</button>

        {!sent ? (
          <>
            {/* 相手 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <UserAvatar username={name} avatarUrl={null} size={56} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E' }}>
                {isRescue ? `${name}さんに応える` : `${name}さんと話す`}
              </span>
              <span style={{
                background: isRescue ? '#F3D2CC' : '#F5E1A8',
                color: isRescue ? '#B23A2A' : '#7A5C00',
                borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
              }}>#{tag}</span>
            </div>

            {isRescue ? (
              /* Rescue：相手の希望する手段で応答（選択UIなし・1ボタン） */
              <>
                <p style={{
                  fontSize: 13, color: 'rgba(59,47,30,0.6)', textAlign: 'center',
                  margin: '0 0 20px', background: '#FFFFFF', borderRadius: 10, padding: '12px 10px',
                }}>
                  相手の希望：<span style={{ fontWeight: 700, color: '#3B2F1E' }}>{wantedMethod}</span>
                </p>
                <button
                  onClick={() => (onRespond ? onRespond() : send())}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 24, border: 'none',
                    background: 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)',
                    color: '#FFFFFF', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  応答する
                </button>
              </>
            ) : (
              /* HELP：対応方法を選ぶ */
              <>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#8B6914', margin: '0 0 10px', textAlign: 'center' }}>
                  どの方法で話しますか？
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {METHODS.map(m => {
                    const available = !availableMethods || availableMethods.includes(m.key)
                    const on = method === m.key
                    return (
                      <button
                        key={m.key}
                        onClick={() => available && setMethod(m.key)}
                        disabled={!available}
                        style={{
                          flex: 1, padding: '12px 4px', borderRadius: 14,
                          cursor: available ? 'pointer' : 'default',
                          background: !available ? 'rgba(139,115,85,0.08)' : on ? '#FBEFC6' : '#FFFFFF',
                          border: (on && available) ? '2px solid #C9A84C' : '1px solid rgba(139,115,85,0.2)',
                          opacity: available ? 1 : 0.45,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 22, lineHeight: 1, filter: available ? 'none' : 'grayscale(1)' }}>{m.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: available ? '#3B2F1E' : 'rgba(59,47,30,0.4)' }}>{m.label}</span>
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => (onTalkNow && method ? onTalkNow(method) : send())}
                  disabled={!method}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 24, border: 'none',
                    background: method ? 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)' : 'rgba(224,160,32,0.35)',
                    color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                    cursor: method ? 'pointer' : 'default',
                  }}
                >
                  {onTalkNow ? '今すぐ話す' : 'リクエストを送る'}
                </button>
              </>
            )}
          </>
        ) : (
          /* 送信完了 */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ fontSize: 34, margin: '0 0 8px' }}>🔔</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E', margin: '0 0 6px' }}>
              リクエストを送りました
            </p>
            <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.6)', margin: '0 0 10px', lineHeight: 1.6 }}>
              {isRescue
                ? <>{name}さんに「{methodLabel}」で<br />対応できると通知しました</>
                : <>{name}さんに「{methodLabel}」で<br />話したいと通知しました</>}
            </p>
            <p style={{ fontSize: 12, color: '#8B6914', margin: '0 0 20px', fontWeight: 600 }}>
              💌 相手が承認するとDMが届きます
            </p>
            <button
              onClick={close}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 24,
                border: '1px solid #8B6914', background: 'transparent', color: '#8B6914',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
