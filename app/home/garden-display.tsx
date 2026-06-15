'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import { formatHashtag } from '@/app/onboarding/garden-setup/garden-visuals'
import { DaisyIcon } from '@/src/components/icons/DaisyIcon'
import DaisyTopView from '@/src/components/garden/DaisyTopView'
import SeedTopView from '@/src/components/garden/SeedTopView'
import GardenSetupFlow from '@/src/components/garden/GardenSetupFlow'
import { GRASS_FIELD_BG, SHADOW_FIELD_BG, DAISY_SIZE, SEED_SIZE } from '@/src/components/garden/gardenColors'

type Tag = { id: string; text: string; position_x: number | null; position_y: number | null }
type GardenTab = 'light' | 'shadow'

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
  const [lightTags, setLightTags] = useState<Tag[]>([])
  const [shadowTags, setShadowTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const seedFieldRef = useRef<HTMLDivElement>(null)

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

  // position_x/y が null、または旧オンボーディングの割合値（0〜1）の場合は
  // まだ配置が確定していない（Q1〜Q4で登録したタグをデイジー/タネとして配置編集する必要がある）
  const needsSetup = [...lightTags, ...shadowTags].some(
    tag => tag.position_x === null || tag.position_y === null
      || tag.position_x <= 1 || tag.position_y <= 1
  )

  // タグをタップ → 根の部屋／実の部屋チャットへ遷移（既存動作）
  const handleTagClick = (type: GardenTab) => () => {
    router.push(type === 'light' ? '/room/light' : '/room/shadow')
  }

  // ワンタップでSeed側／Daisy側にスクロール移動
  const scrollToSeed = () => {
    seedFieldRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollToDaisy = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>読み込み中...</p>
  }

  if (needsSetup) {
    return <GardenSetupFlow lightTags={lightTags} shadowTags={shadowTags} />
  }

  if (lightTags.length === 0 && shadowTags.length === 0) {
    return <p className="text-sm text-center mt-10" style={{ color: 'rgba(120,100,70,0.5)' }}>タグが見つかりません</p>
  }

  return (
    <div style={{ width: '100%', maxWidth: 390, margin: '0 auto', padding: '0 24px', height: '100%' }}>
      {/* 農園全体：スクロールで実の畑（地上）↔ 根の畑（地下）が切り替わる */}
      <div
        ref={scrollRef}
        style={{
          position: 'relative',
          marginLeft: -24, marginRight: -24,
          height: '100%',
          overflowY: 'auto',
        }}
      >
        {/* 実の畑（地上）：デコレーション編集時と同じ大きさ（画面の表示領域いっぱい） */}
        <div style={{ position: 'relative', width: '100%', height: '100%', background: GRASS_FIELD_BG }}>
          <div style={{
            position: 'absolute', top: 12, left: 12,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#FAC775', color: '#633806',
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
          }}>
            <DaisyIcon size={14} stage={4} active />
            実の畑
          </div>

          {lightTags.length === 0 ? (
            <p style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              margin: 0, fontSize: 13, color: 'rgba(99,56,6,0.6)', whiteSpace: 'nowrap',
            }}>
              タグが見つかりません
            </p>
          ) : lightTags.map(tag => (
            <DaisyTopView
              key={tag.id}
              cx={tag.position_x ?? 0} cy={tag.position_y ?? 0} size={DAISY_SIZE}
              label={formatHashtag(tag.text)}
              onClick={handleTagClick('light')}
            />
          ))}

          {/* ワンタップでSeedの畑へ */}
          <button
            onClick={scrollToSeed}
            style={{
              position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 6, zIndex: 5,
              background: 'rgba(255,255,255,0.9)', color: '#5C3A1E',
              fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 20,
              border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            🌱 Seedへ ↓
          </button>
        </div>

        {/* 区切り：草ライン・土ライン */}
        <div style={{ height: 8, background: '#4A7C59' }} />
        <div style={{ height: 5, background: '#8B6914' }} />

        {/* 根の畑（地下）：デコレーション編集時と同じ大きさ（画面の表示領域いっぱい） */}
        <div ref={seedFieldRef} style={{ position: 'relative', width: '100%', height: '100%', background: SHADOW_FIELD_BG }}>
          <div style={{
            position: 'absolute', top: 12, left: 12,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#C4A882', color: '#6B4E1A',
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
          }}>
            🌱 根の畑
          </div>

          {shadowTags.length === 0 ? (
            <p style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              margin: 0, fontSize: 13, color: 'rgba(107,78,26,0.6)', whiteSpace: 'nowrap',
            }}>
              タグが見つかりません
            </p>
          ) : shadowTags.map(tag => (
            <SeedTopView
              key={tag.id}
              cx={tag.position_x ?? 0} cy={tag.position_y ?? 0} size={SEED_SIZE}
              label={formatHashtag(tag.text)}
              onClick={handleTagClick('shadow')}
            />
          ))}

          {/* ワンタップでDaisyの畑へ */}
          <button
            onClick={scrollToDaisy}
            style={{
              position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 6, zIndex: 5,
              background: 'rgba(255,255,255,0.9)', color: '#5C3A1E',
              fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 20,
              border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            🌼 Daisyへ ↑
          </button>
        </div>
      </div>
    </div>
  )
}
