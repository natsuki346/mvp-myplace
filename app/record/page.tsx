'use client'

// 記録の単体表示ページ。?view=daily|schedule|calendar|history で1セクションだけを描画する。
// セグメントタブ／サブトグルは廃止し、サイドバー（ProfileDrawer）の各項目から直接開く。
// データ取得と派生値は useRecordData に集約し、各セクションは共有部品を使う。

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BottomNav } from '@/src/components/BottomNav'
import FirstVisitCoach from '@/src/components/tutorial/FirstVisitCoach'
import { useRecordData } from '@/src/components/record/useRecordData'
import {
  CARD_BG, CARD_BORDER, RECORD_VIEW_META, paramToView,
} from '@/src/components/record/recordShared'
import DailyCheckinCard from '@/src/components/record/DailyCheckinCard'
import ScheduleSection from '@/src/components/record/ScheduleSection'
import CalendarSection from '@/src/components/record/CalendarSection'
import HistorySection from '@/src/components/record/HistorySection'
import InsightModal from '@/src/components/record/InsightModal'
import AiReportCard from '@/src/components/record/AiReportCard'

function RecordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = paramToView(searchParams.get('view'))

  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => { setUserId(localStorage.getItem('user_id')) }, [])

  const data = useRecordData(userId)
  const [showInsight, setShowInsight] = useState(false)

  const heading = RECORD_VIEW_META[view].heading

  return (
    <>
    <div
      // PC時：コンテンツを max-w-2xl で中央寄せし、上部ナビ（56px）分だけ高さを縮める。translateで画面全体（サイドバー240px無視）の中央に
      className="md:max-w-2xl! md:h-[calc(100svh-56px)]! md:-translate-x-[120px]"
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        height: '100svh', overflow: 'hidden', position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
      {/* ── ヘッダー（戻るボタン＝直前の画面へ／見出しは中央維持） ── */}
      <div style={{
        padding: '10px 20px 10px', flexShrink: 0,
        borderBottom: '1px solid rgba(139,115,85,0.15)', textAlign: 'center',
        position: 'relative',
      }}>
        <button
          onClick={() => router.back()}
          aria-label="戻る"
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, color: '#3B2F1E', padding: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← 戻る
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#3B2F1E' }}>{heading}</span>
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '16px 20px calc(96px + env(safe-area-inset-bottom))',
      }}>
        {data.loading ? (
          <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.4)' }}>読み込み中...</p>
        ) : data.error ? (
          <p style={{ textAlign: 'center', paddingTop: 48, fontSize: 13, color: 'rgba(59,47,30,0.5)' }}>データを取得できませんでした</p>
        ) : view === 'schedule' ? (
          <ScheduleSection schedules={data.schedules} entering={data.entering} enterRoom={data.enterRoom} />
        ) : view === 'history' ? (
          <HistorySection history={data.history} users={data.users} partnerOf={data.partnerOf} />
        ) : view === 'calendar' ? (
          <CalendarSection dayMap={data.dayMap} users={data.users} partnerOf={data.partnerOf} enterRoom={data.enterRoom} />
        ) : (
          /* daily：チェックイン／インサイト入口／AIレポート */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <DailyCheckinCard todayEntry={data.todayEntry} saveToday={data.saveToday} />

            {/* インサイトボタン → 全画面モーダル */}
            <button
              onClick={() => setShowInsight(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2F1E', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📊</span> インサイト
              </span>
              <span style={{ fontSize: 18, color: '#8B6914' }}>›</span>
            </button>

            <AiReportCard
              userId={data.userId}
              feelingLog={data.feelingLog}
              history={data.history}
              tags={data.tags}
              partnerOf={data.partnerOf}
            />
          </div>
        )}
      </div>
    </div>

      {/* ── インサイト全画面モーダル（fixed。transform対象の外に出す） ── */}
      {showInsight && (
        <InsightModal
          monthlySummary={data.monthlySummary}
          allHashtags={data.allHashtags}
          maxTag={data.maxTag}
          onClose={() => setShowInsight(false)}
        />
      )}

      <BottomNav />

      {/* ── 初回訪問時の説明 ── */}
      <FirstVisitCoach
        storageKey="coach_record_v2"
        heading="🕐 記録"
        lines={[
          { icon: '📅', title: '予定', desc: 'これから話す約束を確認し、時間になったら入室できます。' },
          { icon: '🎥', title: '履歴', desc: '過去に話した相手や通話の記録を振り返れます。' },
          { icon: '📝', title: 'デイリー', desc: '毎日の気分の記録・向き合ったテーマ・AIレポートをまとめて見られます。' },
        ]}
        note="※ 一部の集計は準備中のサンプルを含みます。内容は今後さらに充実していきます。"
      />
    </>
  )
}

export default function RecordPage() {
  return (
    <Suspense fallback={null}>
      <RecordContent />
    </Suspense>
  )
}
