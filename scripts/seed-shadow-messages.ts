import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const HANA_ID   = 'e975603e-c4ba-472a-9c7f-210707bdc599'
const MINORI_ID = '1852775d-2df6-4236-850a-d8b640e7d871'

const HANA_SHADOW_TAG_ID   = '6b4afe77-ab78-4b1a-8b18-73fa230f8fd5'
const MINORI_SHADOW_TAG_ID = '1bdd5fee-76a2-4778-ae71-9ceee902ff60'

const BASE = '2026-06-14T10:00:00+09:00'
const addMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()

const messages = [
  {
    tag_id: HANA_SHADOW_TAG_ID,
    user_id: HANA_ID,
    content: '最近、自分がここにいていいのかなってふと思うことがある',
    created_at: BASE,
  },
  {
    tag_id: MINORI_SHADOW_TAG_ID,
    user_id: MINORI_ID,
    content: 'わかる。なんか急に、自分だけ浮いてる気がする瞬間ってあるよね',
    created_at: addMinutes(BASE, 3),
  },
  {
    tag_id: HANA_SHADOW_TAG_ID,
    user_id: HANA_ID,
    content: 'そうそう。別に何かあったわけじゃないんだけど',
    created_at: addMinutes(BASE, 5),
  },
  {
    tag_id: MINORI_SHADOW_TAG_ID,
    user_id: MINORI_ID,
    content: 'でもこうして話せる場所があるだけで、ちょっと楽になる気がする',
    created_at: addMinutes(BASE, 8),
  },
  {
    tag_id: HANA_SHADOW_TAG_ID,
    user_id: HANA_ID,
    content: 'うん。ここに来るとなんか、ほっとする',
    created_at: addMinutes(BASE, 11),
  },
]

async function seed() {
  console.log('shadowメッセージを挿入中...')
  const { data, error } = await supabase
    .from('messages')
    .insert(messages)
    .select()
  if (error) {
    console.error('エラー:', error)
    return
  }
  console.log(`完了: ${data.length}件挿入しました`)
}

seed()
