"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

/**
 * Last line of defence. This replaces the whole document when the root layout
 * itself throws, so it carries its own html and body and cannot rely on the
 * design system being mounted. Styles are inline for that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#14120e",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "1.25rem",
        }}
      >
        <div style={{ maxWidth: "34rem" }}>
          <h1
            style={{
              fontFamily: "ui-serif, Georgia, serif",
              fontSize: "clamp(1.875rem, 4vw, 3rem)",
              fontWeight: 400,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Something went wrong on our side.
          </h1>
          <div
            style={{
              height: 1,
              width: "6rem",
              margin: "2rem 0 1.75rem",
              background: "linear-gradient(90deg,#f8d488,#f0c068 45%,#c8912f)",
            }}
          />
          <p style={{ color: "#5c574e", lineHeight: 1.7, margin: "0 0 2rem" }}>
            The page failed to load. Payment is collected only when a delivery arrives.
            Try again, or contact us on WhatsApp if you need help.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "0.9375rem 2rem",
                fontSize: "0.75rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 600,
                background: "#14120e",
                color: "#ffffff",
                border: "1px solid #14120e",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="https://wa.me/96181492994"
              style={{
                padding: "0.9375rem 2rem",
                fontSize: "0.75rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "#14120e",
                border: "1px solid rgba(20,18,14,.46)",
                textDecoration: "none",
              }}
            >
              Message us
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
