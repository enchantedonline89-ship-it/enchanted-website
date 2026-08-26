import type { CSSProperties } from "react"
import type { SiteTheme, ThemeIntensity } from "@/types"

const CHRISTMAS_SNOW = [
  ["3%", "3px", "-8s", "18s", "18px", "0.78"],
  ["9%", "6px", "-2s", "22s", "-28px", "0.68"],
  ["16%", "4px", "-14s", "20s", "24px", "0.82"],
  ["23%", "8px", "-5s", "25s", "-18px", "0.55"],
  ["31%", "3px", "-11s", "17s", "22px", "0.76"],
  ["38%", "5px", "-1s", "21s", "-26px", "0.62"],
  ["46%", "7px", "-16s", "24s", "30px", "0.7"],
  ["53%", "4px", "-7s", "19s", "-20px", "0.8"],
  ["61%", "3px", "-13s", "18s", "16px", "0.72"],
  ["68%", "7px", "-3s", "23s", "-24px", "0.6"],
  ["75%", "5px", "-18s", "26s", "30px", "0.74"],
  ["82%", "3px", "-9s", "17s", "-14px", "0.82"],
  ["89%", "6px", "-15s", "22s", "22px", "0.64"],
  ["96%", "4px", "-4s", "19s", "-26px", "0.78"],
] as const

const RAMADAN_STARS = [
  ["6%", "16%", "0s", "0.72"],
  ["14%", "38%", "-1.7s", "0.5"],
  ["25%", "12%", "-3.2s", "0.64"],
  ["36%", "28%", "-0.8s", "0.42"],
  ["49%", "10%", "-2.4s", "0.7"],
  ["61%", "34%", "-4.1s", "0.48"],
  ["72%", "15%", "-1.2s", "0.68"],
  ["83%", "31%", "-3.6s", "0.46"],
  ["93%", "12%", "-2s", "0.72"],
] as const

const RAMADAN_LANTERNS = [
  ["7%", "5.8rem", "-2.2s", "0.84"],
  ["88%", "8.5rem", "-4.6s", "0.72"],
  ["72%", "4.8rem", "-1.1s", "0.48"],
] as const

type SeasonalStyle = CSSProperties & Record<`--seasonal-${string}`, string>

function ChristmasBackdrop({ intensity }: { intensity: ThemeIntensity }) {
  return (
    <div className="seasonal-backdrop seasonal-backdrop--christmas" data-intensity={intensity} aria-hidden="true">
      <span className="seasonal-backdrop__wash" />
      <span className="seasonal-christmas-garland" />
      <div className="seasonal-snow">
        {CHRISTMAS_SNOW.map(([left, size, delay, duration, drift, opacity]) => (
          <i
            key={`${left}-${duration}`}
            className="seasonal-snowflake"
            style={
              {
                "--seasonal-left": left,
                "--seasonal-size": size,
                "--seasonal-delay": delay,
                "--seasonal-duration": duration,
                "--seasonal-drift": drift,
                "--seasonal-opacity": opacity,
              } as SeasonalStyle
            }
          />
        ))}
      </div>
      <svg
        className="seasonal-christmas-sprig seasonal-christmas-sprig--left"
        viewBox="0 0 180 220"
        focusable="false"
      >
        <path className="seasonal-sprig-stem" d="M12 214C55 166 72 105 95 12" />
        <path d="M40 178 4 163M52 157 15 132M64 134 25 108M76 108 40 78M88 80 55 50M97 47 74 23M39 178l12-40M52 157l20-45M64 134l27-44M76 108l36-38M88 80l39-24" />
        <circle cx="46" cy="162" r="5" />
        <circle cx="74" cy="111" r="4" />
        <circle cx="92" cy="67" r="5" />
      </svg>
      <svg
        className="seasonal-christmas-sprig seasonal-christmas-sprig--right"
        viewBox="0 0 180 220"
        focusable="false"
      >
        <path className="seasonal-sprig-stem" d="M12 214C55 166 72 105 95 12" />
        <path d="M40 178 4 163M52 157 15 132M64 134 25 108M76 108 40 78M88 80 55 50M97 47 74 23M39 178l12-40M52 157l20-45M64 134l27-44M76 108l36-38M88 80l39-24" />
        <circle cx="46" cy="162" r="5" />
        <circle cx="74" cy="111" r="4" />
        <circle cx="92" cy="67" r="5" />
      </svg>
    </div>
  )
}

function RamadanBackdrop({ intensity }: { intensity: ThemeIntensity }) {
  return (
    <div className="seasonal-backdrop seasonal-backdrop--ramadan" data-intensity={intensity} aria-hidden="true">
      <span className="seasonal-backdrop__wash" />
      <span className="seasonal-ramadan-canopy" />
      <div className="seasonal-ramadan-stars">
        {RAMADAN_STARS.map(([left, top, delay, opacity]) => (
          <i
            key={`${left}-${top}`}
            className="seasonal-ramadan-star"
            style={
              {
                "--seasonal-left": left,
                "--seasonal-top": top,
                "--seasonal-delay": delay,
                "--seasonal-opacity": opacity,
              } as SeasonalStyle
            }
          />
        ))}
      </div>
      <div className="seasonal-ramadan-lanterns">
        {RAMADAN_LANTERNS.map(([left, length, delay, opacity]) => (
          <i
            key={`${left}-${length}`}
            className="seasonal-ramadan-lantern"
            style={
              {
                "--seasonal-left": left,
                "--seasonal-length": length,
                "--seasonal-delay": delay,
                "--seasonal-opacity": opacity,
              } as SeasonalStyle
            }
          />
        ))}
      </div>
      <svg
        className="seasonal-ramadan-crescent"
        viewBox="0 0 160 180"
        focusable="false"
      >
        <path d="M111 12c-40 12-62 56-45 94 14 32 50 48 82 35-20 27-59 37-89 21C15 139 2 83 28 43 46 17 79 4 111 6v6Z" />
        <path d="m118 48 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2 5-10Z" />
      </svg>
    </div>
  )
}

export default function SeasonalBackdrop({
  theme,
  intensity,
}: {
  theme: SiteTheme
  intensity: ThemeIntensity
}) {
  if (theme === "christmas") return <ChristmasBackdrop intensity={intensity} />
  if (theme === "ramadan") return <RamadanBackdrop intensity={intensity} />
  return null
}
