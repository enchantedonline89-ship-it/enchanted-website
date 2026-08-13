/**
 * Renders one JSON-LD block. Server-only, no client JS, no event handlers.
 *
 * `<` is escaped so a stray value (e.g. a future admin-entered product name
 * containing "</script>") can never break out of the script tag.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c")

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
