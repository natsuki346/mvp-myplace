'use client'

interface BubbleGrowthPopupProps {
  /** バブル中心のX座標（キャンバス内絶対位置） */
  cx: number
  /** バブル上端のY座標（キャンバス内絶対位置） */
  cy: number
}

export default function BubbleGrowthPopup({ cx, cy }: BubbleGrowthPopupProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top: cy - 8,
        transform: 'translateX(-50%) translateY(-100%)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* 吹き出し本体 */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 13,
        color: '#3B2F1E',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        fontWeight: 500,
      }}>
        ルームを訪れたので育ちました🌱
      </div>

      {/* 吹き出し三角（下向き） */}
      <div style={{
        position: 'absolute',
        bottom: -6,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid #FFFFFF',
      }} />
    </div>
  )
}
