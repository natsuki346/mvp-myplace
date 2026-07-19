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

// AIタグ生成の呼び先（Supabase Edge Functions）。オンボーディングの QuestionCard と同じ。
const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

// 編集時に「質問を選んで書き殴る→AI生成」するための質問。オンボーディングと同じ内容。
// light（Daisy）＝Q1・Q2 / shadow（Seed）＝Q3・Q4
const EDIT_QUESTIONS: Record<'light' | 'shadow', string[]> = {
  light: [
    '自分の好きなところ、思う存分出してみよう',
    '自分がテンション上がる瞬間って、どんな時？',
  ],
  shadow: [
    '自分ではわかってるけど、あまり人に言わないこと、何かある？',
    'よく一人で悩んじゃうけど、誰にも吐き出してないもの、思うがままに出してみない？',
  ],
}

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

  // 編集専用シート（アイコン変更・AI生成/手動での言葉の追加・削除を1枚に集約）
  const [editOpen, setEditOpen] = useState(false)
  const [editType, setEditType] = useState<'light' | 'shadow'>('light')

  // 開いているボトムアップシート（閲覧用：つながり / Daisy一覧 / Seed一覧）
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

  // 言葉の追加（Daisy=light / Seed=shadow）。成否をbooleanで返し、
  // 呼び出し側（入力欄クリア・生成チップの✓表示）で使う。
  const addTag = async (type: 'light' | 'shadow', raw: string): Promise<boolean> => {
    const text = raw.trim().replace(/^#+/, '')
    if (!text || !userId) return false
    // すでに同じ言葉があれば二重登録しない（AI生成の再追加対策）
    const current = type === 'light' ? lightTags : shadowTags
    if (current.some(t => t.text === text)) return true
    const color = type === 'light' ? '#F5D78E' : '#D4B896'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('tags') as any)
      .insert({ user_id: userId, text, type, color, is_active: true })
      .select('id, text')
      .single()
    if (error) { console.error('tag add error:', error.message); return false }
    const row = data as Tag
    if (type === 'light') setLightTags(prev => [...prev, row])
    else setShadowTags(prev => [...prev, row])
    return true
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
    // ログアウト時はオンライン状態を解除（失敗しても続行）
    const uid = localStorage.getItem('user_id')
    if (uid) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/set-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ user_id: uid, is_online: false }),
      }).catch(() => {})
    }
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
        </div>
        {/* アイコン変更用の隠しinput（編集シートの「アイコンを変更」から発火） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
        />

        <p style={{ fontSize: 20, fontWeight: 'bold', color: '#3B2F1E', margin: '6px 0 0' }}>
          {user?.username ?? ''}
        </p>
        <p style={{ fontSize: 13, color: '#8B6914', margin: 0 }}>
          @{user?.username ?? ''}
        </p>

        <button
          onClick={() => { setEditType('light'); setEditOpen(true) }}
          style={{
            marginTop: 6,
            background: '#4A7C59',
            border: 'none',
            color: '#F5F0E8',
            borderRadius: 20, padding: '9px 22px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ✎ プロフィールを編集
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
          <TagListView
            tags={lightTags}
            chipBg="#F5D78E"
            chipColor="#8B6914"
            onEdit={() => { setSheet(null); setEditType('light'); setEditOpen(true) }}
          />
        </BottomSheet>
      )}

      {sheet === 'shadow' && (
        <BottomSheet title="🌱 Seed の言葉" accent="#8B6914" onClose={() => setSheet(null)}>
          <TagListView
            tags={shadowTags}
            chipBg="#D4B896"
            chipColor="#5C3A1E"
            onEdit={() => { setSheet(null); setEditType('shadow'); setEditOpen(true) }}
          />
        </BottomSheet>
      )}

      {/* ── 編集専用シート（「✎ プロフィールを編集」から開く。AI生成を主役に据える） ── */}
      {editOpen && (
        <BottomSheet title="✎ プロフィールを編集" accent="#4A7C59" onClose={() => setEditOpen(false)}>
          {/* アイコン変更 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <UserAvatar username={user?.username} avatarUrl={user?.avatar_url} size={52} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                border: '1px solid #D4B896', background: '#FFFFFF', borderRadius: 20,
                padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#8B6914',
                cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.5 : 1,
              }}
            >
              {uploading ? 'アップロード中...' : '📷 アイコンを変更'}
            </button>
          </div>

          {/* Daisy / Seed 切替 */}
          <div
            style={{
              display: 'flex', background: '#FFFFFF', border: '1px solid #D4B896',
              borderRadius: 12, overflow: 'hidden', marginBottom: 18,
            }}
          >
            {([
              { key: 'light' as const, label: '🌼 Daisy' },
              { key: 'shadow' as const, label: '🌱 Seed' },
            ]).map(({ key, label }) => {
              const on = editType === key
              return (
                <button
                  key={key}
                  onClick={() => setEditType(key)}
                  style={{
                    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700,
                    background: on ? '#4A7C59' : 'transparent',
                    color: on ? '#F5F0E8' : '#A0906F',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* 選択中の種別の 言葉一覧 + AI生成 + 手動追加（keyで種別切替時にAI状態をリセット） */}
          <WordSheetBody
            key={editType}
            tags={editType === 'light' ? lightTags : shadowTags}
            chipBg={editType === 'light' ? '#F5D78E' : '#D4B896'}
            chipColor={editType === 'light' ? '#8B6914' : '#5C3A1E'}
            editing={true}
            onRemove={id => removeTag(editType, id)}
            type={editType}
            questions={EDIT_QUESTIONS[editType]}
            onAdd={text => addTag(editType, text)}
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

// ── 言葉の閲覧用シート（一覧表示 + 「編集する」で編集シートへ） ──
function TagListView({
  tags, chipBg, chipColor, onEdit,
}: {
  tags: Tag[]
  chipBg: string
  chipColor: string
  onEdit: () => void
}) {
  return (
    <>
      <button
        onClick={onEdit}
        style={{
          width: '100%', border: 'none', borderRadius: 20, background: '#4A7C59',
          color: '#F5F0E8', fontSize: 13, fontWeight: 700, padding: '10px 0',
          cursor: 'pointer', marginBottom: 16,
        }}
      >
        ✎ 編集する
      </button>
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
              }}
            >
              {formatHashtag(tag.text)}
            </span>
          ))
        )}
      </div>
    </>
  )
}

// ── 編集シートの中身（チップ一覧 + AI生成／手動の追加・削除） ──
function WordSheetBody({
  tags, chipBg, chipColor, editing, onRemove, type, questions, onAdd,
}: {
  tags: Tag[]
  chipBg: string
  chipColor: string
  editing: boolean
  onRemove: (id: string) => void
  type: 'light' | 'shadow'
  questions: string[]
  onAdd: (text: string) => Promise<boolean>
}) {
  const accent = type === 'light' ? '#4A7C59' : '#6B4F12'

  // AI生成フロー用の状態（このシート内で完結）
  const [selectedQ, setSelectedQ] = useState(0)
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<string[]>([])
  const [manual, setManual] = useState('')

  // 登録済み判定（保存時は#を外しているので、比較も#を外して行う）
  const existing = new Set(tags.map(t => t.text))
  const isAdded = (raw: string) => existing.has(raw.trim().replace(/^#+/, ''))

  const handleGenerate = async () => {
    if (!draft.trim() || generating) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/generate-tags`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({ text: draft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました')
      const newTags: string[] = data.tags ?? []
      setGenerated(prev => [...prev, ...newTags.filter(t => !prev.includes(t))])
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleAddManual = async () => {
    const ok = await onAdd(manual)
    if (ok) setManual('')
  }

  return (
    <>
      {!editing && (
        <p style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)', margin: '0 0 12px' }}>
          ※「✎ プロフィールを編集」で追加・削除できます
        </p>
      )}

      {/* 登録済みチップ一覧 */}
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
        <>
          {/* ── AIでつくる：質問を選んで書き殴る → 生成 ── */}
          <div style={{ marginTop: 22, borderTop: '1px solid rgba(212,184,150,0.6)', paddingTop: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#3B2F1E', margin: '0 0 10px' }}>
              ✦ 質問に答えて言葉をつくる
            </p>

            {/* 質問を選ぶ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {questions.map((q, i) => {
                const on = i === selectedQ
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedQ(i)}
                    style={{
                      textAlign: 'left', width: '100%', padding: '10px 12px', borderRadius: 12,
                      cursor: 'pointer', fontSize: 13, lineHeight: 1.5,
                      border: on ? `1.5px solid ${accent}` : '1px solid #D4B896',
                      background: on ? 'rgba(74,124,89,0.08)' : '#FFFFFF',
                      color: on ? '#3B2F1E' : '#7A6A50',
                      fontWeight: on ? 700 : 400,
                    }}
                  >
                    {q}
                  </button>
                )
              })}
            </div>

            {/* 書き殴る */}
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="ここに思うままに書いてみてください..."
              rows={3}
              style={{
                width: '100%', border: '1px solid #D4B896', borderRadius: 12,
                padding: '12px', color: '#3B2F1E', background: '#FFFFFF', resize: 'none',
                // iOSでフォーカス時に自動ズームしないよう16px以上を確保
                fontSize: 16, outline: 'none', marginBottom: 10,
              }}
            />

            <button
              onClick={handleGenerate}
              disabled={!draft.trim() || generating}
              style={{
                width: '100%', border: 'none', borderRadius: 20, padding: '12px 0',
                fontSize: 14, fontWeight: 700,
                background: draft.trim() && !generating ? accent : 'rgba(0,0,0,0.08)',
                color: draft.trim() && !generating ? '#F5F0E8' : 'rgba(0,0,0,0.28)',
                cursor: draft.trim() && !generating ? 'pointer' : 'default',
              }}
            >
              {generating ? '生成中...' : 'タグを生成する'}
            </button>

            {genError && (
              <p style={{ color: '#C0392B', fontSize: 12, textAlign: 'center', margin: '8px 0 0' }}>{genError}</p>
            )}

            {/* 生成されたタグ（タップで追加） */}
            {generated.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 11, color: 'rgba(59,47,30,0.45)', margin: '0 0 8px' }}>
                  タップして追加
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {generated.map(t => {
                    const added = isAdded(t)
                    return (
                      <button
                        key={t}
                        onClick={() => { if (!added) onAdd(t) }}
                        disabled={added}
                        style={{
                          borderRadius: 12, padding: '8px 12px', fontSize: 13,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          border: `1px solid ${added ? 'rgba(0,0,0,0.12)' : accent}`,
                          background: added ? 'rgba(0,0,0,0.04)' : '#FFFFFF',
                          color: added ? 'rgba(0,0,0,0.3)' : '#3B2F1E',
                          cursor: added ? 'default' : 'pointer',
                        }}
                      >
                        {formatHashtag(t)}
                        <span style={{ fontWeight: 700, color: added ? 'rgba(0,0,0,0.3)' : accent }}>
                          {added ? '✓' : '+'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── 手動でも追加できる ── */}
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <input
              value={manual}
              onChange={e => setManual(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddManual() }}
              placeholder="自分で言葉を追加"
              style={{
                flex: 1, minWidth: 0, border: '1px solid #D4B896', borderRadius: 10,
                padding: '10px 12px', fontSize: 16, color: '#3B2F1E', background: '#FFFFFF',
              }}
            />
            <button
              onClick={handleAddManual}
              style={{
                border: 'none', borderRadius: 10, background: accent, color: '#F5F0E8',
                fontSize: 14, fontWeight: 700, padding: '0 18px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              追加
            </button>
          </div>
        </>
      )}
    </>
  )
}
