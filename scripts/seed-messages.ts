import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const HANA_ID = 'e975603e-c4ba-472a-9c7f-210707bdc599'
const MINORI_ID = '1852775d-2df6-4236-850a-d8b640e7d871'

const HANA_LIGHT_TAG_ID = 'cbfd0a9c-91ac-4aed-bfc0-63428f6292cd'
const MINORI_LIGHT_TAG_ID = 'ac8eb007-d0c2-4ae8-ae6d-6b7d8b1c0967'

const messages = [
  { tag_id: HANA_LIGHT_TAG_ID, user_id: HANA_ID, content: 'ここに来るといつも少し楽になれる' },
  { tag_id: HANA_LIGHT_TAG_ID, user_id: HANA_ID, content: 'ありのままでいいって思えてきた' },
  { tag_id: MINORI_LIGHT_TAG_ID, user_id: MINORI_ID, content: 'わかる、なんか安心するよね' },
  { tag_id: MINORI_LIGHT_TAG_ID, user_id: MINORI_ID, content: 'ここにいると自分を好きになれる気がする' },
  { tag_id: HANA_LIGHT_TAG_ID, user_id: HANA_ID, content: 'また来ます！' },
]

async function seed() {
  console.log('メッセージを挿入中...')
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
