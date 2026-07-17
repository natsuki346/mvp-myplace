'use client'

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { BottomNav } from '@/src/components/BottomNav'
import { UserAvatar } from '@/src/components/UserAvatar'
import { useRecordData } from '@/src/components/record/useRecordData'
import { CARD_BG, CARD_BORDER } from '@/src/components/record/recordShared'
import DailyCheckinCard from '@/src/components/record/DailyCheckinCard'
import InsightModal from '@/src/components/record/InsightModal'

type UserRow = {
  id: string
  username: string
  avatar_url: string | null
}

type Tag = {
  id: string
  text: string
}

type ConnectionUser = {
  id: string
  username: string
  avatar_url: string | null
}

type Connection = {
  id: string
  status: string
  requester_id: string
  receiver_id: string
  requester: ConnectionUser | null
  receiver: ConnectionUser | null
}

// どのボトムアップシートを開いているか
type SheetKey = 'connection' | 'light' | 'shadow' | null

const SLIDE_MS = 280

// Linktree 風プロフィール。左上アバターのタップ／クリックでここへ遷移する。
// ・つながり / Daisy / Seed … タップで下からせり上がるシートに一覧表示（+編集）
// ・マイガーデン … ボタンで全画面 /garden（ドラッグ操作できるキャンバス）へ遷移
export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<UserRow | null>(null)
  const [lightTags, setLightTags] = useState<Tag[]>([])
  const [shadowTags, setShadowTags] = useState<Tag[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // 編集モード（アイコン変更・言葉の追加/削除）
  const [editing, setEditing] = useState(false)
  const [newDaisy, setNewDaisy] = useState('')
  const [newSeed, setNewSeed] = useState('')

  // 開いているボトムアップシート
  const [sheet, setSheet] = useState<SheetKey>(null)

  // ── マイガーデン下の「記録エリア」（予定/カレンダー/履歴/デイリー を埋め込み） ──
  const rec = useRecordData(userId)
  const [showInsight, setShowInsight] = useState(false)

  const loadProfile = async (uid: string) => {
    const [userRes, lightRes, shadowRes, connRes, pendingRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('users') as any)
        .select('id, username, avatar_url')
        .eq('id', uid)
        .single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('tags') as any)
        .select('id, text')
        .eq('user_id', uid)
        .eq('type', 'light')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('tags') as any)
        .select('id, text')
        .eq('user_id', uid)
        .eq('type', 'shadow')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('connections') as any)
        .select('*, requester:users!requester_id(id, username, avatar_url), receiver:users!receiver_id(id, username, avatar_url)')
        .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
        .eq('status', 'accepted'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('connections') as any)
        .select('*, requester:users!requester_id(id, username, avatar_url)')
        .eq('receiver_id', uid)
        .eq('status', 'pending'),
    ])

    setUser((userRes.data as UserRow) ?? null)
    setLightTags((lightRes.data as Tag[]) ?? [])
    setShadowTags((shadowRes.data as Tag[]) ?? [])
    setConnections((connRes.data as Connection[]) ?? [])
    setPending((pendingRes.data as Connection[]) ?? [])
  }

  useEffect(() => {
    ;(async () => {
      const uid = localStorage.getItem('user_id')
      setUserId(uid)
      if (!uid) {
        setLoading(false)
        return
      }
      await loadProfile(uid)
      setLoading(false)
    })()
  }, [])

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) {
      console.error('avatar upload error:', uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('users') as any).update({ avatar_url: publicUrl }).eq('id', userId)

    setUser(prev => (prev ? { ...prev, avatar_url: publicUrl } : prev))
    setUploading(false)
  }

  // 言葉の追加（Daisy=light / Seed=shadow）
  const addTag = async (type: 'light' | 'shadow', raw: string) => {
    const text = raw.trim().replace(/^#+/, '')
    if (!text || !userId) return
    const color = type === 'light' ? '#F5D78E' : '#D4B896'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('tags') as any)
      .insert({ user_id: userId, text, type, color, is_active: true })
      .select('id, text')
      .single()
    if (error) { console.error('tag add error:', error.message); return }
    const row = data as Tag
    if (type === 'light') { setLightTags(prev => [...prev, row]); setNewDaisy('') }
    else { setShadowTags(prev => [...prev, row]); setNewSeed('') }
  }

  // 言葉の削除（is_active=false のソフト削除。ガーデン等の履歴を壊さない）
  const removeTag = async (type: 'light' | 'shadow', id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tags') as any).update({ is_active: false }).eq('id', id)
    if (type === 'light') setLightTags(prev => prev.filter(t => t.id !== id))
    else setShadowTags(prev => prev.filter(t => t.id !== id))
  }

  const handleAccept = async (connId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('connections') as any).update({ status: 'accepted' }).eq('id', connId)
    if (userId) loadProfile(userId)
  }

  const handleReject = async (connId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('connections') as any).delete().eq('id', connId)
    if (userId) loadProfile(userId)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('user_id')
    localStorage.removeItem('username')
    router.push('/welcome')
  }

  if (loading) {
    return (
      <div style={{ background: '#F5F0E8', maxWidth: 480, margin: '0 auto', minHeight: '100svh' }}>
        <p style={{ textAlign: 'center', paddingTop: 80, fontSize: 13, color: '#A09070' }}>読み込み中...</p>
      </div>
    )
  }

  return (
    // 外側はビューポート高に固定（height:100svh + overflow:hidden）。実際のスクロールは
    // 内側の overflow-y:auto に任せる。iOS(Capacitor/WKWebView)では body/document 自体の
    // スクロールが効かないため、他ページと同じこのパターンでないと下までスクロールできない。
    <div
      style={{
        background: '#F5F0E8', maxWidth: 480, margin: '0 auto',
        height: '100svh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1, minHeight: 0,
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '24px 16px 100px',
        }}
      >
      {/* ── ① プロフィールヘッダー（中央寄せ = Linktree 風） ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ position: 'relative', width: 96, height: 96 }}>
          <UserAvatar username={user?.username} avatarUrl={user?.avatar_url} size={96} />
          {editing && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="アイコンを変更"
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 30, height: 30, borderRadius: '50%',
                  border: '1px solid #D4B896', background: '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, cursor: uploading ? 'default' : 'pointer',
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>

        <p style={{ fontSize: 20, fontWeight: 'bold', color: '#3B2F1E', margin: '6px 0 0' }}>
          {user?.username ?? ''}
        </p>
        <p style={{ fontSize: 13, color: '#8B6914', margin: 0 }}>
          @{user?.username ?? ''}
        </p>

        <button
          onClick={() => setEditing(v => !v)}
          style={{
            marginTop: 6,
            background: editing ? '#4A7C59' : 'transparent',
            border: editing ? 'none' : '1px solid #C9A84C',
            color: editing ? '#F5F0E8' : '#8B6914',
            borderRadius: 20, padding: '7px 20px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {editing ? '完了' : '✎ プロフィールを編集'}
        </button>
      </div>

      {/* ── ② スタット（タップで各シートが下からせり上がる） ── */}
      <div
        style={{
          display: 'flex', marginTop: 20,
          background: '#FFFFFF', border: '1px solid #D4B896',
          borderRadius: 16, overflow: 'hidden',
        }}
      >
        <StatButton
          value={connections.length}
          label="つながり"
          color="#4A7C59"
          onClick={() => setSheet('connection')}
        />
        <StatButton
          value={lightTags.length}
          label="🌼 Daisy"
          color="#C9A84C"
          divider
          onClick={() => setSheet('light')}
        />
        <StatButton
          value={shadowTags.length}
          label="🌱 Seed"
          color="#8B6914"
          divider
          onClick={() => setSheet('shadow')}
        />
      </div>
      {pending.length > 0 && (
        <p
          onClick={() => setSheet('connection')}
          style={{
            marginTop: 8, textAlign: 'center', fontSize: 12, color: '#4A7C59',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          🔔 つながり申請が {pending.length} 件届いています
        </p>
      )}

      {/* ── ③ マイガーデン（埋め込みはやめ、ボタンで全画面 /garden へ。埋め込みガーデンが
             スクロールを奪う問題を根本回避しつつ、全画面のドラッグ操作に一本化する） ── */}
      <button
        onClick={() => router.push('/garden')}
        style={{
          width: '100%', marginTop: 22, padding: '16px 18px', borderRadius: 16,
          border: '1px solid #D4B896', background: '#FFFFFF', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🌿</span>
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>マイガーデン</span>
            <span style={{ display: 'block', fontSize: 11, color: '#A09070', marginTop: 2 }}>言葉が育つ庭を全画面で見る</span>
          </span>
        </span>
        <span style={{ fontSize: 20, color: '#8B6914', lineHeight: 1 }}>›</span>
      </button>

      {/* ── ③.5 記録エリア（マイガーデンの下に予定/カレンダー/履歴/デイリーを埋め込み） ──
             データは useRecordData を1回だけ呼んで各セクションに配る。各見出しの「›」から
             /record?view= の単体表示にも飛べる。 */}
      {userId && !rec.loading && !rec.error && (
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 26 }}>
          {/* デイリー（今日の気分：常設・最上部） */}
          <RecordBlock title="📝 今日の記録" onOpen={() => router.push('/record?view=daily')}>
            <DailyCheckinCard todayEntry={rec.todayEntry} saveToday={rec.saveToday} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={() => setShowInsight(true)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '11px 0', borderRadius: 14, cursor: 'pointer',
                  background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                  fontSize: 13, fontWeight: 700, color: '#3B2F1E',
                }}
              >
                📊 インサイト
              </button>
              <button
                onClick={() => router.push('/record?view=daily')}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '11px 0', borderRadius: 14, cursor: 'pointer',
                  background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
                  fontSize: 13, fontWeight: 700, color: '#3B2F1E',
                }}
              >
                ✦ AIレポート
              </button>
            </div>
          </RecordBlock>

          {/* 予定・カレンダー・履歴（埋め込みをやめ、単体表示へのボタンに統一） */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {([
              { icon: '📅', label: '予定',       desc: 'これから話す約束',       view: 'schedule' },
              { icon: '🗓', label: 'カレンダー', desc: '記録・通話・予定の一覧', view: 'calendar' },
              { icon: '🎥', label: '履歴',       desc: '過去に話した相手・通話', view: 'history' },
            ] as const).map(item => (
              <button
                key={item.view}
                onClick={() => router.push(`/record?view=${item.view}`)}
                style={{
                  width: '100%', padding: '16px 18px', borderRadius: 16,
                  border: '1px solid #D4B896', background: '#FFFFFF', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#3B2F1E' }}>{item.label}</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#A09070', marginTop: 2 }}>{item.desc}</span>
                  </span>
                </span>
                <span style={{ fontSize: 20, color: '#8B6914', lineHeight: 1 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ④ フッター（ログアウトのみ・控えめなテキストリンク。モード切替はホームから、
             プライバシーもここに小さく） ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 40 }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#A09070', fontSize: 12, textDecoration: 'underline', padding: 4,
          }}
        >
          ログアウト
        </button>
        <button
          onClick={() => router.push('/privacy')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#A09070', fontSize: 12, textDecoration: 'underline', padding: 4,
          }}
        >
          プライバシーポリシー
        </button>
      </div>
      </div>

      {/* ── ⑤ ボトムアップシート（position:fixed なのでスクロール領域の外に置く） ── */}
      {sheet === 'connection' && (
        <BottomSheet title="つながり" accent="#4A7C59" onClose={() => setSheet(null)}>
          {pending.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#4A7C59', margin: '0 0 8px' }}>
                つながり申請（{pending.length}）
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map(req => (
                  <div key={req.id} style={{ background: '#FFFFFF', borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <UserAvatar username={req.requester?.username} avatarUrl={req.requester?.avatar_url} size={36} />
                      <p style={{ margin: 0, fontSize: 13, color: '#3B2F1E' }}>
                        {req.requester?.username}さんから申請
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleAccept(req.id)}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 20, border: 'none',
                          background: '#4A7C59', color: '#F5F0E8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        承認する
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 20,
                          border: '1px solid #8B6914', background: 'transparent', color: '#8B6914',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        断る
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {connections.length === 0 ? (
            <p style={{ fontSize: 13, color: '#A09070', textAlign: 'center', margin: '24px 0' }}>
              まだつながりがありません。ルームで話しかけてみよう🌼
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {connections.map(conn => {
                const other = conn.requester_id === userId ? conn.receiver : conn.requester
                return (
                  <div
                    key={conn.id}
                    onClick={() => other && router.push(`/profile/view?userId=${other.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: other ? 'pointer' : 'default' }}
                  >
                    <UserAvatar username={other?.username} avatarUrl={other?.avatar_url} size={44} />
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#3B2F1E' }}>
                      {other?.username}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </BottomSheet>
      )}

      {sheet === 'light' && (
        <BottomSheet title="🌼 Daisy の言葉" accent="#C9A84C" onClose={() => setSheet(null)}>
          <WordSheetBody
            tags={lightTags}
            chipBg="#F5D78E"
            chipColor="#8B6914"
            editing={editing}
            onRemove={id => removeTag('light', id)}
            newValue={newDaisy}
            onNewChange={setNewDaisy}
            onAdd={() => addTag('light', newDaisy)}
          />
        </BottomSheet>
      )}

      {sheet === 'shadow' && (
        <BottomSheet title="🌱 Seed の言葉" accent="#8B6914" onClose={() => setSheet(null)}>
          <WordSheetBody
            tags={shadowTags}
            chipBg="#D4B896"
            chipColor="#5C3A1E"
            editing={editing}
            onRemove={id => removeTag('shadow', id)}
            newValue={newSeed}
            onNewChange={setNewSeed}
            onAdd={() => addTag('shadow', newSeed)}
          />
        </BottomSheet>
      )}

      {/* ── 記録エリアのインサイト全画面モーダル（fixed。スクロール領域の外に置く） ── */}
      {showInsight && (
        <InsightModal
          monthlySummary={rec.monthlySummary}
          allHashtags={rec.allHashtags}
          maxTag={rec.maxTag}
          onClose={() => setShowInsight(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}

// ── 記録エリアの1ブロック（見出し＋「›」で単体表示へ／中身は各セクション部品） ──
function RecordBlock({
  title, onOpen, children,
}: {
  title: string
  onOpen: () => void
  children: ReactNode
}) {
  return (
    <div>
      <button
        onClick={onOpen}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '0 2px 10px', marginBottom: 2,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>{title}</span>
        <span style={{ fontSize: 18, color: '#8B6914', lineHeight: 1 }}>›</span>
      </button>
      {children}
    </div>
  )
}

// ── スタットボタン（つながり / Daisy / Seed） ──
function StatButton({
  value, label, color, divider, onClick,
}: {
  value: number
  label: string
  color: string
  divider?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
        padding: '14px 0', textAlign: 'center',
        borderLeft: divider ? '1px solid rgba(212,184,150,0.6)' : 'none',
      }}
    >
      <p style={{ fontSize: 24, fontWeight: 800, color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'rgba(59,47,30,0.55)', margin: '2px 0 0' }}>{label}</p>
    </button>
  )
}

// ── ボトムアップシート（TagWordsModal と同じ、下からせり上がる） ──
function BottomSheet({
  title, accent, onClose, children,
}: {
  title: string
  accent: string
  onClose: () => void
  children: ReactNode
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])
  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, SLIDE_MS)
  }
  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(59,47,30,0.45)',
          opacity: visible ? 1 : 0,
          transition: `opacity ${SLIDE_MS}ms ease`,
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', zIndex: 401,
        width: '100%', maxWidth: 480,
        height: '92svh', maxHeight: '92svh',
        background: '#F5F0E8',
        borderRadius: '20px 20px 0 0',
        borderTop: `3px solid ${accent}`,
        transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, 100%)',
        transition: `transform ${SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ width: 36, height: 4, background: 'rgba(139,105,20,.25)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>{title}</span>
          <button
            onClick={handleClose}
            aria-label="閉じる"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: 'rgba(59,47,30,0.4)', lineHeight: 1, padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 20px 24px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── 言葉シートの中身（チップ一覧 + 編集時の追加/削除） ──
function WordSheetBody({
  tags, chipBg, chipColor, editing, onRemove, newValue, onNewChange, onAdd,
}: {
  tags: Tag[]
  chipBg: string
  chipColor: string
  editing: boolean
  onRemove: (id: string) => void
  newValue: string
  onNewChange: (v: string) => void
  onAdd: () => void
}) {
  return (
    <>
      {!editing && (
        <p style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)', margin: '0 0 12px' }}>
          ※「✎ プロフィールを編集」で追加・削除できます
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.length === 0 ? (
          <p style={{ fontSize: 13, color: '#A09070', margin: 0 }}>まだありません</p>
        ) : (
          tags.map(tag => (
            <span
              key={tag.id}
              style={{
                background: chipBg, borderRadius: 12, padding: '8px 12px',
                fontSize: 13, color: chipColor,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {formatHashtag(tag.text)}
              {editing && (
                <button
                  onClick={() => onRemove(tag.id)}
                  aria-label="削除"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: chipColor, fontSize: 14, lineHeight: 1, padding: 0,
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {editing && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <input
            value={newValue}
            onChange={e => onNewChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onAdd() }}
            placeholder="言葉を追加"
            style={{
              flex: 1, minWidth: 0, border: '1px solid #D4B896', borderRadius: 10,
              padding: '10px 12px', fontSize: 14, color: '#3B2F1E', background: '#FFFFFF',
            }}
          />
          <button
            onClick={onAdd}
            style={{
              border: 'none', borderRadius: 10, background: '#4A7C59', color: '#F5F0E8',
              fontSize: 14, fontWeight: 700, padding: '0 18px', cursor: 'pointer', flexShrink: 0,
            }}
          >
            追加
          </button>
        </div>
      )}
    </>
  )
}
