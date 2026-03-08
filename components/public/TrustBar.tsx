import { WHATSAPP_FLOAT_URL } from '@/lib/whatsapp'

const WA_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'

const items = [
  {
    icon: (
      <svg className="w-5 h-5 text-gold flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        <path d="M12 12v4M10 14h4" />
      </svg>
    ),
    label: 'Cash on Delivery',
    sub: 'No online payment needed',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-gold flex-shrink-0 fill-current" viewBox="0 0 24 24">
        <path d={WA_PATH} />
      </svg>
    ),
    label: 'WhatsApp Support',
    sub: 'Order help & live tracking',
    href: WHATSAPP_FLOAT_URL,
  },
  {
    icon: (
      <svg className="w-5 h-5 text-gold flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" />
        <rect x="9" y="11" width="14" height="10" rx="2" />
        <circle cx="12" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
      </svg>
    ),
    label: 'Free Delivery over $120',
    sub: 'Beirut $3 · Outside Beirut $4',
  },
]

export default function TrustBar() {
  return (
    <div className="bg-surface border-y border-border py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map(item => {
            const inner = (
              <div key={item.label} className="flex items-center justify-center sm:justify-start gap-3">
                {item.icon}
                <div>
                  <p className="text-foreground text-xs font-semibold tracking-wide">{item.label}</p>
                  <p className="text-muted text-[11px] mt-0.5">{item.sub}</p>
                </div>
              </div>
            )
            return item.href ? (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {inner}
              </a>
            ) : (
              <div key={item.label}>{inner}</div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
