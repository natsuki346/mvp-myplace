'use client'

import { useRef, useState } from 'react'

// Come on（対面）終了後の写真画面（モーダル）。
// 「お疲れさまでした🌿」＋カメラ起動（写真を1枚撮る）＋送信状況。
// 自分は撮影＝送信済み、相手（mock）は3秒後に完了。両者完了でホームへ戻れる。

export default function ComeOnFinish({
  open, friendName, onHome,
}: {
  open: boolean
  friendName: string
  onHome: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [meSent, setMeSent] = useState(false)
  const [friendDone, setFriendDone] = useState(false)

  if (!open) return null

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(URL.createObjectURL(file))
    setMeSent(true)
    // モック：相手は3秒後に送信完了
    setTimeout(() => setFriendDone(true), 3000)
  }

  const bothDone = meSent && friendDone

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(30,24,16,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 360, background: '#FBF7EE', borderRadius: 20,
        padding: '28px 22px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 22 }}>🌿</p>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#3B2F1E' }}>
          お疲れさまでした
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8B7355', lineHeight: 1.6 }}>
          最後に、今日の記録として<br />一緒に写真を撮りましょう
        </p>

        {/* 写真プレビュー or 撮影ボタン */}
        {photo ? (
          <img
            src={photo}
            alt="撮影した写真"
            style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 14, marginBottom: 18 }}
          />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%', height: 180, marginBottom: 18, cursor: 'pointer',
              border: '2px dashed #D4B896', borderRadius: 14, background: '#F3ECDD',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: '#8B6914', fontSize: 14, fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 34 }}>📷</span>
            カメラを起動
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          style={{ display: 'none' }}
        />

        {/* 送信状況 */}
        <div style={{
          background: '#FFFFFF', borderRadius: 12, padding: '12px 16px', marginBottom: 18,
          border: '1px solid #EBE2CF', textAlign: 'left',
        }}>
          <StatusRow label="あなた" done={meSent} />
          <div style={{ height: 8 }} />
          <StatusRow label={friendName} done={friendDone} />
        </div>

        <button
          onClick={onHome}
          disabled={!bothDone}
          style={{
            width: '100%', border: 'none', borderRadius: 24, padding: '13px 0',
            fontSize: 15, fontWeight: 700, cursor: bothDone ? 'pointer' : 'default',
            background: bothDone ? 'linear-gradient(135deg, #7CB342 0%, #558B2F 100%)' : '#D8CFBE',
            color: '#FFFFFF', boxShadow: bothDone ? '0 4px 14px rgba(85,139,47,0.4)' : 'none',
          }}
        >
          {bothDone ? 'ホームに戻る' : '送信を待っています…'}
        </button>
      </div>
    </div>
  )
}

function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ fontWeight: 700, color: '#3B2F1E' }}>{label}</span>
      <span style={{ fontWeight: 700, color: done ? '#558B2F' : '#A09070' }}>
        {done ? '✓ 送信済み' : '待機中…'}
      </span>
    </div>
  )
}
