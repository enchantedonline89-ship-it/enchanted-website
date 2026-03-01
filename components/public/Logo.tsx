interface LogoProps {
  className?: string
}

export default function Logo({ className = 'h-9 w-auto' }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 40"
      fill="none"
      className={className}
      aria-label="Enchanted Style"
      role="img"
    >
      {/* Decorative diamond accent */}
      <polygon points="10,20 16,14 22,20 16,26" fill="#c9a84c" opacity="0.9" />
      <polygon points="10,20 16,14 22,20 16,26" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.5" />

      {/* ENCHANTED */}
      <text
        x="30"
        y="16"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing="4"
        fill="#c9a84c"
      >
        ENCHANTED
      </text>

      {/* Thin rule */}
      <line x1="30" y1="20" x2="210" y2="20" stroke="#c9a84c" strokeWidth="0.4" opacity="0.5" />

      {/* STYLE */}
      <text
        x="30"
        y="33"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="9"
        fontWeight="400"
        letterSpacing="8"
        fill="#5a4a35"
      >
        STYLE
      </text>
    </svg>
  )
}
