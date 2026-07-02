type Props = {
  size?: number
  onClick?: () => void
}

export function FireMarker({ size = 64, onClick }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined, display: 'block' }}
    >
      <defs>
        <radialGradient id="fireGrad" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#FAC775" />
          <stop offset="45%" stopColor="#EF9F27" />
          <stop offset="100%" stopColor="#D85A30" />
        </radialGradient>
      </defs>
      <g transform="translate(55, 50)">
        <path fill="url(#fireGrad)">
          <animate
            attributeName="d"
            dur="0.9s"
            repeatCount="indefinite"
            values="M0,60 C-22,55 -28,30 -16,12 C-12,5 -8,-5 -10,-18 C-2,-10 6,-2 8,10 C18,2 20,-12 14,-26 C26,-14 30,4 22,22 C30,16 32,2 28,-8 C36,8 32,28 18,42 C10,52 -6,58 0,60 Z;
                    M0,60 C-26,53 -30,28 -14,8 C-10,2 -6,-8 -8,-20 C0,-12 8,-4 9,8 C20,0 22,-14 15,-28 C28,-16 32,2 24,20 C32,14 34,0 30,-10 C38,6 33,26 16,40 C8,50 -4,58 0,60 Z;
                    M0,60 C-22,55 -28,30 -16,12 C-12,5 -8,-5 -10,-18 C-2,-10 6,-2 8,10 C18,2 20,-12 14,-26 C26,-14 30,4 22,22 C30,16 32,2 28,-8 C36,8 32,28 18,42 C10,52 -6,58 0,60 Z"
          />
        </path>
        <ellipse cx="0" cy="38" rx="9" ry="14" fill="#FAEEDA" opacity={0.85}>
          <animate attributeName="ry" values="14;18;14" dur="0.9s" repeatCount="indefinite" />
          <animate attributeName="cy" values="38;34;38" dur="0.9s" repeatCount="indefinite" />
        </ellipse>
      </g>
    </svg>
  )
}
