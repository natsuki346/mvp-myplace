'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { UserAvatar } from '@/src/components/UserAvatar'
import { ensureThread } from '@/src/lib/mockChat'
import { openUrl } from '@/src/lib/videoRoom'

// モックワーカーとのチャットで、相手が返す定型文（順番に使われる）
const HELP_MOCK_REPLIES = [
  'こんにちは！メッセージありがとうございます😊',
  'もちろん、お話聞きますよ。どんなことでも大丈夫です。',
  '無理せず、あなたのペースで大丈夫ですよ🌱',
]
// 通話デモで開く Daily.co のデモルーム
const DEMO_CALL_URL = 'https://daime.daily.co/demo'

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
  // Daisy×Seed のAI類似度スコア（0〜1）。ソートにのみ使い、UIには数値を出さない。
  score?: number
}

// ── 動作確認用モックデータ（一時的）─────────────────────────────────────────
// 実データが無くてもリスト表示・導線を確認できるよう、
// 取得結果が0件のときにこの2人を表示する。確認が済んだら削除する。
// score は固定値。スコア降順で並ぶ挙動（さくら→ゆうき）を確認できる。
const MOCK_WORKERS: Worker[] = [
  { userId: 'mock-worker-1', username: 'さくら', avatar_url: null, tag: '挫折から立った', matchCount: 2, score: 0.88 },
  { userId: 'mock-worker-2', username: 'ゆうき', avatar_url: null, tag: '逆境を生きた', matchCount: 1, score: 0.71 },
]

export default function HelpPage() {
  const router = useRouter()
  const [workers, setWorkers] = useState<Worker[] | null>(null)
  // 「話してみる」で選んだ相手。null なら一覧、値があれば手段選択画面を表示。
  const [selected, setSelected] = useState<Worker | null>(null)
  // タグ検索：表示中のユーザーをフロント側で絞り込む（AIマッチ結果はそのまま、表示だけ絞る）。
  const [search, setSearch] = useState('')

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
        // AI類似度スコアの降順に並べる（バックエンドも並べ替え済みだが念のため統一）。
        const list = ((data?.users as Worker[]) ?? []).slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        setWorkers(list)
      } catch {
        setWorkers([])
      }
    })()
  }, [])

  // 通話 or チャットで話し始める。
  // 共通：シーカー(uid=requester)→ワーカー(w.userId=receiver) の connections を pending で作成
  //       （既にあればスキップ）。ワーカーがチャット画面で「話を聞く/今は難しい」を押すと
  //       status が accepted / rejected に更新される。
  // チャット：チャット画面を開き、初期メッセージを自動送信 → ワーカーが承認して会話開始。
  // 通話　：通話リクエスト（＝依頼メッセージ）を自動送信 → ワーカーが承認すると通話ボタンが
  //         有効になり、🎥ボタンで Daily.co の通話が始まる（既存実装）。
  // Talk me は「通話」「チャット」の2択のみ（対面は Come on が担当）。
  const start = async (w: Worker, method: 'call' | 'chat') => {
    const uid = localStorage.getItem('user_id')
    if (!uid) return

    // 動作確認用モック（mock-worker-*）は実在ユーザーではないため DB を使えない。
    // 一気通貫のデモが通るよう、通話は Daily.co デモルーム、チャットはモックスレッドへ繋ぐ。
    if (w.userId.startsWith('mock-')) {
      if (method === 'call') {
        // 通話：Daily.co のデモルームを開く
        await openUrl(DEMO_CALL_URL)
        return
      }
      // チャット：モックスレッドを生成し、既存チャット画面へ（preset を自動送信＝右側に表示）
      ensureThread({ friendId: w.userId, name: w.username, tag: w.tag, replies: HELP_MOCK_REPLIES })
      const q = new URLSearchParams({
        friendId: w.userId,
        name: w.username,
        tag: w.tag,
        want: 'chat',
        preset: 'こんにちは！話聞いてほしいです🌱',
        autosend: '1',
      }).toString()
      router.push(`/home/chat?${q}`)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('connections') as any)
      .select('id')
      .or(`and(requester_id.eq.${uid},receiver_id.eq.${w.userId}),and(requester_id.eq.${w.userId},receiver_id.eq.${uid})`)
    if (!existing || existing.length === 0) {
      // 承認待ち（pending）で作成。ワーカーの承認後に accepted になる。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('connections') as any)
        .insert({ requester_id: uid, receiver_id: w.userId, status: 'pending' })
    }

    // TODO: 決済実装 — 話し始める前にワーカーへの支払い（課金/与信）をここで確定させる。
    //       通話・チャット共通。今はフローのみ実装し、決済は後で追加する。

    // 手段ごとの初期メッセージ（autosend=1 でチャット画面到達時に自動送信される）
    const preset = method === 'call'
      ? 'こんにちは！通話で話したいです🌱'
      : 'こんにちは！話聞いてほしいです🌱'

    const q = new URLSearchParams({
      friendId: w.userId,
      name: w.username,
      tag: w.tag,
      want: method,
      preset,
      autosend: '1',
    }).toString()
    router.push(`/room/friend/chat?${q}`)
  }

  return (
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
          onClick={() => (selected ? setSelected(null) : router.back())}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#3B2F1E', padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← 戻る
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#3B2F1E' }}>
          {selected ? '話す手段を選ぶ' : 'Talk me — 今話せる人'}
        </span>
      </div>

      {/* ── 手段選択画面（「話してみる」で相手を選んだあと） ── */}
      {selected ? (
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '32px 20px calc(24px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <UserAvatar username={selected.username} avatarUrl={selected.avatar_url} size={72} />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#3B2F1E', margin: '14px 0 6px' }}>
            {selected.username}
          </span>
          <span style={{
            display: 'inline-block',
            background: '#E4EFE0', color: '#3B6D11',
            borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
          }}>
            #{selected.tag}
          </span>

          <p style={{ fontSize: 14, color: 'rgba(59,47,30,0.7)', margin: '28px 0 16px', textAlign: 'center' }}>
            どちらの方法で話しますか？
          </p>

          <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => start(selected, 'call')}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #F6D06B 0%, #E0A020 100%)',
                color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              📞 通話で話す
            </button>
            <button
              onClick={() => start(selected, 'chat')}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, cursor: 'pointer',
                background: '#FFFFFF', border: '1px solid #4A7C59',
                color: '#4A7C59', fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              💬 チャットで話す
            </button>
          </div>
        </div>
      ) : (
      /* ── 一覧（オンライン＆通話対応のワーカーのみ・マッチ度順） ── */
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px calc(24px + env(safe-area-inset-bottom))' }}>
        <p style={{ fontSize: 13, color: 'rgba(59,47,30,0.6)', margin: '0 0 14px', textAlign: 'center' }}>
          あなたの悩みを乗り越えた経験があり、いま話せる人です
        </p>

        {/* タグ検索：表示中のユーザーをタグ文字列でフロント側フィルタ */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="タグで絞り込む（例：挫折）"
          style={{
            width: '100%', boxSizing: 'border-box', margin: '0 0 14px',
            padding: '10px 14px', borderRadius: 12, fontSize: 14,
            border: '1px solid rgba(139,115,85,0.3)', background: '#FFFFFF', color: '#3B2F1E',
          }}
        />

        {workers === null ? (
          <p style={{ textAlign: 'center', paddingTop: 40, fontSize: 13, color: 'rgba(59,47,30,0.45)' }}>
            探しています...
          </p>
        ) : (
          <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:items-start">
            {/* 実データが0件のときはモックデータを表示（動作確認用・確認後に削除） */}
            {(workers.length > 0 ? workers : MOCK_WORKERS)
              .filter(w => !search.trim() || w.tag.includes(search.trim()))
              .map(w => (
              <div
                key={w.userId}
                style={{
                  width: '100%', background: '#FFFFFF', borderRadius: 16,
                  border: '1px solid rgba(139,115,85,0.15)',
                  boxShadow: '0 1px 4px rgba(59,47,30,0.05)',
                  padding: '14px 16px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <UserAvatar username={w.username} avatarUrl={w.avatar_url} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#3B2F1E', marginBottom: 4 }}>
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
                </div>

                {/* 1アクションのみ。押すと手段（通話/チャット）選択画面へ遷移する。 */}
                <button
                  onClick={() => setSelected(w)}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: '#E2B34F',
                    color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                  }}
                >
                  話してみる
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
