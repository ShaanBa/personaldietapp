export default function MacroRing({ consumed, goal }) {
  const radius = 78
  const stroke = 8
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const progress = Math.min(consumed / goal, 1.15) // allow slight overflow visual
  const strokeDashoffset = circumference - progress * circumference

  // Color transitions from accent to warning to danger
  let strokeColor = 'var(--accent-primary)'
  if (progress > 1) strokeColor = 'var(--accent-danger)'
  else if (progress > 0.85) strokeColor = 'var(--accent-warning)'

  return (
    <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
      {/* Background track */}
      <circle
        stroke="rgba(255, 255, 255, 0.06)"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      {/* Glow filter */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Progress arc */}
      <circle
        stroke={strokeColor}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        filter="url(#glow)"
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.23, 1, 0.32, 1), stroke 0.3s ease',
        }}
      />
    </svg>
  )
}
