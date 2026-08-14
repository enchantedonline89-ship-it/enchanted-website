/**
 * Replaces the old three-equal-card trust strip. Same information, but as a
 * masthead band with unequal columns, so it reads as a rule under the hero
 * rather than as a row of feature cards.
 */
const FACTS = [
  { term: "Payment", detail: "Cash on delivery, everywhere in Lebanon" },
  { term: "Delivery", detail: "$4 anywhere in Lebanon" },
  { term: "Ordering", detail: "Confirmed over WhatsApp, usually same day" },
] as const

export default function DeliveryBand() {
  return (
    <section aria-label="How ordering works" className="border-b border-line">
      <dl className="mx-auto grid max-w-[1440px] grid-cols-1 gap-y-px px-5 md:grid-cols-[1.1fr_0.85fr_1.25fr] lg:px-10">
        {FACTS.map((fact, i) => (
          <div
            key={fact.term}
            className={`flex flex-col gap-1.5 py-6 md:py-7 ${
              i > 0 ? "border-t border-line md:border-l md:border-t-0 md:pl-8 lg:pl-12" : ""
            } ${i < FACTS.length - 1 ? "md:pr-8 lg:pr-12" : ""}`}
          >
            <dt className="t-meta">{fact.term}</dt>
            <dd className="text-[0.9375rem] leading-snug text-ink">{fact.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
