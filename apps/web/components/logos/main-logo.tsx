import * as React from "react"

export interface MainLogoProps extends React.SVGProps<SVGSVGElement> {
  color?: string
  accent?: string
  size?: number | string
}

export const MainLogo: React.FC<MainLogoProps> = ({
  color = "currentColor",
  accent = "#10B981",
  size = 64,
  ...props
}) => (
  <svg
    viewBox="0 0 256 256"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="ownSpace logo"
    style={{ color }}
    {...props}
  >
    <circle
      cx="128"
      cy="128"
      r="110"
      fill="none"
      stroke="currentColor"
      strokeWidth="10"
      opacity="0.9"
    />

    <g
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.35"
    >
      <line x1="128" y1="64" x2="192" y2="96" />
      <line x1="192" y1="96" x2="192" y2="160" />
      <line x1="192" y1="160" x2="128" y2="192" />
      <line x1="128" y1="192" x2="64" y2="160" />
      <line x1="64" y1="160" x2="64" y2="96" />
      <line x1="64" y1="96" x2="128" y2="64" />
      <line x1="64" y1="96" x2="192" y2="160" />
      <line x1="192" y1="96" x2="64" y2="160" />
      <line x1="128" y1="64" x2="128" y2="192" />
      <line x1="100" y1="128" x2="64" y2="96" />
      <line x1="100" y1="128" x2="64" y2="160" />
      <line x1="156" y1="128" x2="192" y2="96" />
      <line x1="156" y1="128" x2="192" y2="160" />
    </g>

    <line
      x1="100"
      y1="128"
      x2="156"
      y2="128"
      stroke={accent}
      strokeWidth="6"
      strokeLinecap="round"
    />

    <g fill="currentColor">
      <circle cx="128" cy="64" r="6" opacity="0.75" />
      <circle cx="192" cy="96" r="6" opacity="0.75" />
      <circle cx="192" cy="160" r="6" opacity="0.75" />
      <circle cx="128" cy="192" r="6" opacity="0.75" />
      <circle cx="64" cy="160" r="6" opacity="0.75" />
      <circle cx="64" cy="96" r="6" opacity="0.75" />
      <circle cx="128" cy="128" r="4.5" opacity="0.5" />
    </g>

    <circle cx="100" cy="128" r="7.5" fill={accent} />
    <circle cx="156" cy="128" r="7.5" fill={accent} />
  </svg>
)

export default MainLogo
