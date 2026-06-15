'use client'

import type { CSSProperties } from 'react'

type UserAvatarProps = {
  username?: string | null
  avatarUrl?: string | null
  size: number
  onClick?: () => void
}

export function UserAvatar({ username, avatarUrl, size, onClick }: UserAvatarProps) {
  const initial = (username ?? '?').slice(0, 1).toUpperCase()
  const shared: CSSProperties = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    cursor: onClick ? 'pointer' : undefined,
  }

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" onClick={onClick} style={{ ...shared, objectFit: 'cover' }} />
    )
  }

  return (
    <div
      onClick={onClick}
      style={{
        ...shared,
        background: '#4A7C59', color: '#F5F0E8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.4), fontWeight: 700,
      }}
    >
      {initial}
    </div>
  )
}
