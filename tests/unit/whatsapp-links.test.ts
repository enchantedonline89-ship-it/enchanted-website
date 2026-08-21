import { describe, expect, it } from 'vitest'
import {
  WHATSAPP_FLOAT_URL,
  WHATSAPP_PHONE,
  buildProductEnquiryURL,
  buildWhatsAppURL,
} from '@/lib/whatsapp'

const SHOP_NUMBER = '96181492994'

describe('customer-facing WhatsApp links', () => {
  it('always points to the configured shop number', () => {
    expect(WHATSAPP_PHONE).toBe(SHOP_NUMBER)
    expect(WHATSAPP_FLOAT_URL).toBe(`https://wa.me/${SHOP_NUMBER}`)
    expect(new URL(buildWhatsAppURL('Ruby Dress')).pathname).toBe(`/${SHOP_NUMBER}`)
  })

  it('encodes product enquiries without any customer/order PII', () => {
    const url = buildProductEnquiryURL('Tops & Sets', 'M', '/product/tops-sets')
    const message = new URL(url).searchParams.get('text')
    expect(message).toContain('Tops & Sets, size M')
    expect(message).toContain('/product/tops-sets')
    expect(new URL(url).searchParams.size).toBe(1)
  })
})
