type Match = {
  distanceMeters: number
  commonTags: string[]
}

type Props = {
  match: Match | null
  onClose: () => void
  onTagClick: (tag: string) => void
}

function normalizeTag(text: string): string {
  return text.replace(/^#+/, '')
}

export function MatchModal({ match, onClose, onTagClick }: Props) {
  const isOpen = match !== null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isOpen ? 'rgba(0,0,0,0.45)' : 'transparent',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 0.2s ease, background 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '85%',
          maxWidth: 340,
          background: '#FFFDF8',
          borderRadius: 20,
          padding: '28px 24px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          position: 'relative',
          transform: isOpen ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            background: 'none',
            border: 'none',
            fontSize: 20,
            color: 'rgba(59,47,30,0.4)',
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
          aria-label="閉じる"
        >
          ×
        </button>

        {/* ヘッダー */}
        <p style={{
          margin: '0 0 16px',
          fontWeight: 700,
          fontSize: 16,
          color: '#3B2F1E',
          fontFamily: 'sans-serif',
        }}>
          🤝 共通タグ
        </p>

        {/* タグ + チャットボタン */}
        {match?.commonTags.map(tag => (
          <div
            key={tag}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <span style={{
              background: '#F5D78E',
              borderRadius: 14,
              padding: '5px 12px',
              fontSize: 13,
              color: '#7A5C00',
              fontWeight: 600,
              fontFamily: 'sans-serif',
              flexShrink: 0,
            }}>
              #{normalizeTag(tag)}
            </span>
            <button
              onClick={() => onTagClick(tag)}
              style={{
                background: '#4A7C59',
                color: '#F5F0E8',
                border: 'none',
                borderRadius: 12,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'sans-serif',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              チャットに入る ›
            </button>
          </div>
        ))}

        {/* 距離 */}
        <p style={{
          margin: '12px 0 0',
          fontSize: 12,
          color: 'rgba(59,47,30,0.45)',
          fontFamily: 'sans-serif',
        }}>
          約{match?.distanceMeters}m
        </p>
      </div>
    </div>
  )
}
