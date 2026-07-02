// 各Edge Functionで共通利用するCORSヘッダー。
// ブラウザ（Next.jsの静的書き出しアプリ）から直接fetchするための設定。
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}
