import type { DummyMessage } from '@/app/room/dummy-messages'

const HANA_ID   = 'e975603e-c4ba-472a-9c7f-210707bdc599'
const MINORI_ID = '1852775d-2df6-4236-850a-d8b640e7d871'

const HANA   = { id: HANA_ID,   username: 'はな',   avatar_url: null }
const MINORI = { id: MINORI_ID, username: 'みのり', avatar_url: null }

const addMin = (base: string, min: number) =>
  new Date(new Date(base).getTime() + min * 60_000).toISOString()

const BASE_LIGHT  = '2026-06-14T10:00:00+09:00'
const BASE_SHADOW = '2026-06-14T10:00:00+09:00'

// saved_messages.message_id に保存できるよう、固定の UUID を振っておく
// （'default-light-1' のような非UUID文字列は uuid 型カラムに insert できないため）
export const DEFAULT_MESSAGES: Record<'light' | 'shadow', DummyMessage[]> = {
  light: [
    { id: 'c42adaf6-78cb-4809-b40d-f2726546f5d5', user_id: HANA_ID,   users: HANA,   content: '楽しいって感じる瞬間って、なんか些細なことが多くない？',   created_at: BASE_LIGHT },
    { id: '0558a6f0-0aee-45c3-97b4-1bdcc348d72b', user_id: MINORI_ID, users: MINORI, content: 'わかる。コンビニで好きなもの見つけたときとか',              created_at: addMin(BASE_LIGHT, 3) },
    { id: '84cef78b-c108-4fd1-9b53-d2c1f85129fc', user_id: HANA_ID,   users: HANA,   content: 'あー！あとお気に入りの曲がふと流れてきたとき',              created_at: addMin(BASE_LIGHT, 5) },
    { id: 'c030544e-7cb1-4bb0-8f99-efd0ec3ee3aa', user_id: MINORI_ID, users: MINORI, content: 'そういうの積み重ねが大事なんだよね、たぶん',               created_at: addMin(BASE_LIGHT, 8) },
    { id: 'c0447836-4b47-483d-83cf-ee3f4cd617d4', user_id: HANA_ID,   users: HANA,   content: 'うん。楽しいって探すもんじゃなくて、気づくものかも',       created_at: addMin(BASE_LIGHT, 11) },
  ],
  shadow: [
    { id: 'ee67c6c8-f3ae-4844-a159-eb5895ee43e5', user_id: HANA_ID,   users: HANA,   content: '最近、自分がここにいていいのかなってふと思うことがある',       created_at: BASE_SHADOW },
    { id: '0fb8112b-e7ea-4104-be04-bd5a05ea35aa', user_id: MINORI_ID, users: MINORI, content: 'わかる。なんか急に、自分だけ浮いてる気がする瞬間ってあるよね', created_at: addMin(BASE_SHADOW, 3) },
    { id: '72bf5b7d-d8af-4b71-a7c1-8ea8b245f619', user_id: HANA_ID,   users: HANA,   content: 'そうそう。別に何かあったわけじゃないんだけど',               created_at: addMin(BASE_SHADOW, 5) },
    { id: '08be69d7-f4c5-4dbd-98b4-1a31776e8d42', user_id: MINORI_ID, users: MINORI, content: 'でもこうして話せる場所があるだけで、ちょっと楽になる気がする', created_at: addMin(BASE_SHADOW, 8) },
    { id: '383bf591-f830-4748-81e4-f121566aff1a', user_id: HANA_ID,   users: HANA,   content: 'うん。ここに来るとなんか、ほっとする',                       created_at: addMin(BASE_SHADOW, 11) },
  ],
}
