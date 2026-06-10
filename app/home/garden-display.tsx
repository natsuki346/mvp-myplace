'use client'

import { useState } from 'react'
import {
  colorForTag,
  formatHashtag,
  useMounted,
  loadGardenData,
  TreeSVG,
  RootsSVG,
  RootNodeView,
  MaterialIcon,
} from '@/app/onboarding/garden-setup/garden-visuals'

const noop = () => {}

export default function GardenDisplay() {
  const mounted = useMounted()
  const [garden] = useState(() => loadGardenData())
  const { tags: plantTags, roots: rootNodes } = garden

  return (
    <div style={{ width: '100%', maxWidth: 390, margin: '0 auto' }}>
      {/* 地上エリア（木に飾られた実タグ） */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '390 / 600', overflow: 'hidden' }}>
        <TreeSVG />

        {mounted && plantTags.map(tag => tag.type === null ? (
          <div
            key={tag.id}
            style={{
              position: 'absolute',
              left: `${tag.x}%`,
              top: `${tag.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          >
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#5A4A35',
              background: 'rgba(255,255,255,0.85)',
              border: `1.5px dashed ${colorForTag(tag.tag)}`,
              borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap',
            }}>
              {formatHashtag(tag.tag)}
            </span>
          </div>
        ) : (
          <div
            key={tag.id}
            style={{
              position: 'absolute',
              left: `${tag.x}%`,
              top: `${tag.y}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              zIndex: 2,
            }}
          >
            <MaterialIcon type={tag.type} size={36} />
            <span style={{
              fontSize: 9, color: '#fff', background: colorForTag(tag.tag),
              borderRadius: 6, padding: '1px 5px', marginTop: 2, whiteSpace: 'nowrap',
            }}>
              {formatHashtag(tag.tag)}
            </span>
          </div>
        ))}
      </div>

      {/* 地下エリア（埋めた根っこ） */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '390 / 480', overflow: 'hidden' }}>
        <RootsSVG rootNodes={rootNodes} mounted={mounted} />

        {mounted && rootNodes.map(node => (
          <RootNodeView
            key={node.id}
            node={node}
            selected={false}
            onPointerDown={noop}
            onPointerMove={noop}
            onPointerUp={noop}
            onClick={noop}
          />
        ))}
      </div>

      {/* 地下エリアの続き（土の余白）：地上+地下合わせて十分な高さを確保しつつボトムナビとの間に余白を作る */}
      <div style={{ width: '100%', height: 150, background: '#8B6F4E' }} />
    </div>
  )
}
