import type { DummyMessage } from '@/app/room/dummy-messages'

const HANA_ID   = 'e975603e-c4ba-472a-9c7f-210707bdc599'
const MINORI_ID = '1852775d-2df6-4236-850a-d8b640e7d871'

const HANA   = { id: HANA_ID,   username: 'はな',   avatar_url: null }
const MINORI = { id: MINORI_ID, username: 'みのり', avatar_url: null }

const addMin = (base: string, min: number) =>
  new Date(new Date(base).getTime() + min * 60_000).toISOString()

const BASE_LIGHT  = '2026-06-14T10:00:00+09:00'
const BASE_SHADOW = '2026-06-14T10:00:00+09:00'

export const DEFAULT_MESSAGES: Record<'light' | 'shadow', DummyMessage[]> = {
  light: [
    { id: 'default-light-1', user_id: HANA_ID,   users: HANA,   content: '楽しいって感じる瞬間って、なんか些細なことが多くない？',   created_at: BASE_LIGHT },
    { id: 'default-light-2', user_id: MINORI_ID, users: MINORI, content: 'わかる。コンビニで好きなもの見つけたときとか',              created_at: addMin(BASE_LIGHT, 3) },
    { id: 'default-light-3', user_id: HANA_ID,   users: HANA,   content: 'あー！あとお気に入りの曲がふと流れてきたとき',              created_at: addMin(BASE_LIGHT, 5) },
    { id: 'default-light-4', user_id: MINORI_ID, users: MINORI, content: 'そういうの積み重ねが大事なんだよね、たぶん',               created_at: addMin(BASE_LIGHT, 8) },
    { id: 'default-light-5', user_id: HANA_ID,   users: HANA,   content: 'うん。楽しいって探すもんじゃなくて、気づくものかも',       created_at: addMin(BASE_LIGHT, 11) },
  ],
  shadow: [
    { id: 'default-shadow-1', user_id: HANA_ID,   users: HANA,   content: '最近、自分がここにいていいのかなってふと思うことがある',       created_at: BASE_SHADOW },
    { id: 'default-shadow-2', user_id: MINORI_ID, users: MINORI, content: 'わかる。なんか急に、自分だけ浮いてる気がする瞬間ってあるよね', created_at: addMin(BASE_SHADOW, 3) },
    { id: 'default-shadow-3', user_id: HANA_ID,   users: HANA,   content: 'そうそう。別に何かあったわけじゃないんだけど',               created_at: addMin(BASE_SHADOW, 5) },
    { id: 'default-shadow-4', user_id: MINORI_ID, users: MINORI, content: 'でもこうして話せる場所があるだけで、ちょっと楽になる気がする', created_at: addMin(BASE_SHADOW, 8) },
    { id: 'default-shadow-5', user_id: HANA_ID,   users: HANA,   content: 'うん。ここに来るとなんか、ほっとする',                       created_at: addMin(BASE_SHADOW, 11) },
  ],
}
