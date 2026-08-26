import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [twoFactorClient({ twoFactorPage: '/auth/two-factor' })],
})
