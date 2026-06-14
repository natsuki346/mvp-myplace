import { useSyncExternalStore } from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
} from 'react'

// ─────────────────────────────────────────────────────────────────────────────
//  型
// ─────────────────────────────────────────────────────────────────────────────

export type MaterialType =
  | 'tomato' | 'apple' | 'grape' | 'lemon' | 'sunflower'
  | 'rose' | 'dandelion' | 'leaf' | 'vine'

export type PlantTag = {
  id: string
  tag: string // ハッシュタグラベル
  type: MaterialType | null // null = 未選択（ラベルのみ浮いている状態）
  x: number // %
  y: number // %
}

export type RootNode = {
  id: string
  label: string
  tag?: string // 登録済み根タグの場合の元テキスト
  parentId: string | null // null = 幹から直接伸びる根
  x: number // % (地下エリア基準)
  y: number // % (地下エリア基準)
}

export type GardenData = {
  tags: PlantTag[]
  roots: RootNode[]
}

export const STORAGE_KEY = 'gardenSetup:placements'

const FRUIT_TAG_COLORS = ['#E86848', '#E8A23A', '#E8C83A', '#9DBE5A', '#5E9E6A', '#5AAFAF', '#8B7FD4', '#C76FB0', '#E87090']
const ROOT_TAG_COLORS  = ['#8B6914', '#A0522D', '#7A5C3E', '#9C7A4D', '#6B5B3A', '#8C6A5A', '#7E6651', '#A6824A', '#856044']

export function colorForTag(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  return FRUIT_TAG_COLORS[hash % FRUIT_TAG_COLORS.length]
}

export function colorForRootTag(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  return ROOT_TAG_COLORS[hash % ROOT_TAG_COLORS.length]
}

// 先頭の # を取り除いてから1つだけ付与する（## の二重表示を防ぐ）
export function formatHashtag(tag: string): string {
  return `#${tag.replace(/^#+/, '')}`
}

// SSR時はfalse、クライアントでのマウント完了後にtrueを返す
// （localStorage由来の値などSSRと結果が異なる描画を安全にガードするため）
const subscribeNoop = () => () => {}
export function useMounted(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false)
}

export function loadGardenData(): GardenData {
  if (typeof window === 'undefined') return { tags: [], roots: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { tags: [], roots: [] }
    const parsed = JSON.parse(raw)
    return { tags: parsed.tags ?? [], roots: parsed.roots ?? [] }
  } catch {
    return { tags: [], roots: [] }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  木のイラスト（地上）
// ─────────────────────────────────────────────────────────────────────────────

export function TreeSVG() {
  return (
    <svg
      viewBox="0 0 390 600"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="gs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#EAF2F5" />
          <stop offset="100%" stopColor="#F5F0E8" />
        </linearGradient>
        <linearGradient id="gs-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E8DEC8" />
          <stop offset="100%" stopColor="#CCBA96" />
        </linearGradient>
        <linearGradient id="gs-trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#A5764A" />
          <stop offset="100%" stopColor="#6B4E1A" />
        </linearGradient>
      </defs>

      {/* 空 / 土 */}
      <rect x="0" y="0"   width="390" height="396" fill="url(#gs-sky)" />
      <rect x="0" y="380" width="390" height="220" fill="url(#gs-soil)" />

      {/* 草テクスチャ */}
      {[35, 72, 122, 178, 242, 295, 342, 368].map((cx, i) => (
        <ellipse key={i} cx={cx} cy={380} rx={3.5} ry={5.5} fill="#7AB878" opacity={0.28} />
      ))}

      {/* 幹 */}
      <path
        d="M163 600 C158 510 166 420 176 350 C180 315 186 280 193 256
           L197 256 C204 280 210 315 214 350 C224 420 232 510 227 600 Z"
        fill="url(#gs-trunk)"
      />

      {/* 中央上の枝 */}
      <path d="M188 260 C185 195 187 130 193 70 C197 70 199 70 202 70 C206 130 206 195 202 260 Z" fill="url(#gs-trunk)" />

      {/* 左上の枝 */}
      <path d="M190 265 C145 228 100 188 70 128 C81 150 117 195 161 234 C176 247 186 254 195 270 Z" fill="url(#gs-trunk)" />
      <path d="M81 150 C65 142 49 138 33 137 C48 144 65 153 83 168 Z" fill="url(#gs-trunk)" />

      {/* 右上の枝 */}
      <path d="M200 265 C245 228 290 188 320 128 C309 150 273 195 229 234 C214 247 204 254 195 270 Z" fill="url(#gs-trunk)" />
      <path d="M309 150 C325 142 341 138 357 137 C342 144 325 153 307 168 Z" fill="url(#gs-trunk)" />

      {/* 左下の枝 */}
      <path d="M187 308 C140 288 90 270 45 252 C53 264 95 284 145 302 C165 310 177 314 191 324 Z" fill="url(#gs-trunk)" />
      <path d="M53 264 C39 262 25 263 11 268 C25 268 41 273 57 282 Z" fill="url(#gs-trunk)" />

      {/* 右下の枝 */}
      <path d="M203 308 C250 288 300 270 345 252 C337 264 295 284 245 302 C225 310 213 314 199 324 Z" fill="url(#gs-trunk)" />
      <path d="M337 264 C351 262 365 263 379 268 C365 268 349 273 333 282 Z" fill="url(#gs-trunk)" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  根のイラスト（地下）
// ─────────────────────────────────────────────────────────────────────────────

export function RootsSVG({ rootNodes, mounted }: { rootNodes: RootNode[]; mounted: boolean }) {
  const W = 390
  const H = 480
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMin meet"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="gs-undersoil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#CCBA96" />
          <stop offset="100%" stopColor="#8B6F4E" />
        </linearGradient>
      </defs>

      {/* 地下の土 */}
      <rect x="0" y="0" width={W} height={H} fill="url(#gs-undersoil)" />

      {/* 土の中のテクスチャ */}
      {[[48, 60], [340, 110], [90, 220], [300, 280], [60, 380], [330, 410]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} fill="#5A3A0A" opacity={0.15} />
      ))}

      {/* 幹から伸びる主根 */}
      <line x1={W / 2} y1="0" x2={W / 2} y2="34" stroke="#6B4E1A" strokeWidth="10" strokeLinecap="round" />

      {/* 各根タグ・派生ノードへの根（マウント後のみ描画してSSRとの不一致を防ぐ） */}
      {mounted && rootNodes.map(node => {
        const parent = node.parentId ? rootNodes.find(n => n.id === node.parentId) : null
        const fromX = parent ? (parent.x / 100) * W : W / 2
        const fromY = parent ? (parent.y / 100) * H : 28
        const toX = (node.x / 100) * W
        const toY = (node.y / 100) * H
        const midX = (fromX + toX) / 2
        const midY = (fromY + toY) / 2 + 16
        return (
          <path
            key={node.id}
            d={`M${fromX},${fromY} Q${midX},${midY} ${toX},${toY}`}
            stroke="#5A3A0A"
            strokeWidth={parent ? 2.5 : 4}
            fill="none"
            strokeLinecap="round"
            opacity={0.85}
          />
        )
      })}
    </svg>
  )
}

export function RootNodeView({
  node, selected, onPointerDown, onPointerMove, onPointerUp, onClick,
}: {
  node: RootNode
  selected: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void
  onClick: (e: ReactMouseEvent<HTMLDivElement>) => void
}) {
  const isTop = node.parentId === null
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${node.x}%`,
        top: `${node.y}%`,
        transform: 'translate(-50%, -50%)',
        touchAction: 'none',
        cursor: 'grab',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        zIndex: 2,
      }}
    >
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: isTop ? '#8B6914' : '#A9875F',
        border: selected ? '2px solid #4A7C59' : '2px solid rgba(255,255,255,0.6)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
      <span style={{
        fontSize: 10, marginTop: 3, padding: '2px 8px', borderRadius: 999,
        whiteSpace: 'nowrap', color: '#fff', fontWeight: 600,
        background: isTop ? colorForRootTag(node.tag ?? node.label) : 'rgba(90,58,10,0.8)',
        outline: selected ? '2px solid #4A7C59' : 'none',
      }}>
        {isTop ? formatHashtag(node.label) : node.label}
      </span>
    </div>
  )
}
