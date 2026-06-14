'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'
import DaisyTopView from '@/src/components/garden/DaisyTopView'
import SeedTopView from '@/src/components/garden/SeedTopView'
import GardenSetupFlow from '@/src/components/garden/GardenSetupFlow'
import { LIGHT_FIELD_BG, SHADOW_FIELD_BG, DAISY_SIZE, SEED_SIZE, FIELD_HEIGHT, SCROLL_MAX_HEIGHT } from '@/src/components/garden/gardenColors'

type Tag = { id: string; text: string; position_x: number | null; position_y: number | null }
type GardenTab = 'light' | 'shadow'

const ACTIVE_BG    = '#4A7C59'
const ACTIVE_TEXT  = '#F5F0E8'
const INACTIVE_BG  = '#D4B896'
const INACTIVE_TEXT = '#5C3A1E'

async function fetchTags(userId: string, type: GardenTab): Promise<Tag[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tags') as any)
    .select('id, text, position_x, position_y')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) console.error(`[GardenDisplay] ${type}タグ取得エラー:`, error.message)
  console.log(`[GardenDisplay] ${type}Tags:`, data)

  return (data as Tag[]) ?? []
}

export default function GardenDisplay() {
  const router = useRouter()
  const [tab, setTab] = useState<GardenTab>('light')
  const [lightTags, setLightTags] = useState<Tag[]>([])
  const [shadowTags, setShadowTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const userId = sessionStorage.getItem('user_id')
      if (!userId) { setLoading(false); return }

      const [light, shadow] = await Promise.all([
        fetchTags(userId, 'light'),
        fetchTags(userId, 'shadow'),
      ])

      if (!cancelled) {
        setLightTags(light)
        setShadowTags(shadow)
        setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [])

  const tags = tab === 'light' ? lightTags : shadowTags
  const needsScroll = FIELD_HEIGHT > SCROLL_MAX_HEIGHT
  // position_x/y が null、または旧オンボーディングの割合値（0〜1）の場合は
  // まだ配置が確定していない（Q1〜Q4で登録したタグをデイジー/タネとして配置編集する必要がある）
  const needsSetup = [...lightTags, ...shadowTags].some(
    tag => tag.position_x === null || tag.position_y === null
      || tag.position_x <= 1 || tag.position_y <= 1
  )

  // タグをタップ → 根の部屋／実の部屋チャットへ遷移（既存動作）
  const handleTagClick = () => {
    router.push(tab === 'light' ? '/room/light' : '/room/shadow')
  }

  if (loading) {
    return <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>読み込み中...</p>
  }

  if (needsSetup) {
    return <GardenSetupFlow lightTags={lightTags} shadowTags={shadowTags} />
  }

  return (
    <div style={{ width: '100%', maxWidth: 390, margin: '0 auto', padding: '0 24px' }}>
      {/* タブ */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('light')}
          className="flex-1 py-3 rounded-xl text-sm font-bold"
          style={{
            background: tab === 'light' ? ACTIVE_BG : INACTIVE_BG,
            color: tab === 'light' ? ACTIVE_TEXT : INACTIVE_TEXT,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <DaisyIcon size={18} stage={4} active={tab === 'light'} />
          実の部屋
        </button>
        <button
          onClick={() => setTab('shadow')}
          className="flex-1 py-3 rounded-xl text-sm font-bold"
          style={{
            background: tab === 'shadow' ? ACTIVE_BG : INACTIVE_BG,
            color: tab === 'shadow' ? ACTIVE_TEXT : INACTIVE_TEXT,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <span>🌱</span>
          根の部屋
        </button>
      </div>

      {/* コンテンツ */}
      {tags.length === 0 ? (
        <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>タグが見つかりません</p>
      ) : (
        <div
          style={{
            position: 'relative',
            marginLeft: -24, marginRight: -24,
            height: needsScroll ? SCROLL_MAX_HEIGHT : FIELD_HEIGHT,
            overflowY: needsScroll ? 'auto' : 'visible',
            background: tab === 'light' ? LIGHT_FIELD_BG : SHADOW_FIELD_BG,
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: FIELD_HEIGHT }}>
            {tags.map(tag => (
              tab === 'light'
                ? (
                  <DaisyTopView
                    key={tag.id}
                    cx={tag.position_x ?? 0} cy={tag.position_y ?? 0} size={DAISY_SIZE}
                    label={formatHashtag(tag.text)}
                    onClick={handleTagClick}
                  />
                )
                : (
                  <SeedTopView
                    key={tag.id}
                    cx={tag.position_x ?? 0} cy={tag.position_y ?? 0} size={SEED_SIZE}
                    label={formatHashtag(tag.text)}
                    onClick={handleTagClick}
                  />
                )
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
