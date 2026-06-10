'use client'

type RoomExplainCardProps = {
  type: 'mi' | 'ne'
  onClose: () => void
}

const CONTENT = {
  mi: {
    tagLabel: '🌿 実の部屋',
    tagBg: '#F5D78E',
    tagText: '#4A7C59',
    title: '光の面でつながる場所',
    description: '自分の得意なこと・好きなことを持つ人たちと話せます。共鳴した言葉がタグになって木に実ります。',
    buttonLabel: '根の部屋も見てみる →',
    buttonBg: '#4A7C59',
  },
  ne: {
    tagLabel: '🪨 根の部屋',
    tagBg: '#D4B896',
    tagText: '#8B6914',
    title: '影の面を安心して話せる場所',
    description: '弱さや葛藤を、同じ気持ちの人と静かに分かち合えます。ここでの言葉が、根っこを深くします。',
    buttonLabel: 'はじめる ✓',
    buttonBg: '#8B6914',
  },
} as const

export default function RoomExplainCard({ type, onClose }: RoomExplainCardProps) {
  const c = CONTENT[type]

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, background: 'rgba(59,47,30,0.55)' }}
    >
      <div
        className="w-full rounded-t-3xl px-6 pt-6"
        style={{ maxWidth: 390, background: '#F5F0E8', paddingBottom: 80 }}
      >
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-bold mb-3"
          style={{ background: c.tagBg, color: c.tagText }}
        >
          {c.tagLabel}
        </span>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#3B2F1E' }}>{c.title}</h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(59,47,30,0.7)', lineHeight: 1.7 }}>
          {c.description}
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-full text-sm font-bold"
          style={{ background: c.buttonBg, color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
        >
          {c.buttonLabel}
        </button>
      </div>
    </div>
  )
}
