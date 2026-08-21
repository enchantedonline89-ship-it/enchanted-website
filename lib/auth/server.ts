import { betterAuth } from 'better-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCloudflareEnv } from '@/lib/cloudflare/env'
import { enqueueEmail } from '@/lib/email/queue'

function requiredBinding(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is not configured`)
  return value.trim()
}

export async function getAuth() {
  const env = await getCloudflareEnv()
  if (!env) throw new Error('Cloudflare runtime bindings are unavailable')

  const secret = requiredBinding(env.BETTER_AUTH_SECRET, 'BETTER_AUTH_SECRET')
  const baseURL = requiredBinding(env.BETTER_AUTH_URL, 'BETTER_AUTH_URL')
  const adminEmail = env.ADMIN_EMAIL.trim().toLowerCase()
  const socialProviders =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}

  return betterAuth({
    appName: 'Enchanted',
    baseURL,
    basePath: '/api/auth',
    secret,
    database: env.DB,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url, token }) => {
        await enqueueEmail(env, {
          idempotencyKey: `password-reset:${user.id}:${token}`,
          template: 'reset-password',
          recipient: user.email,
          payload: { name: user.name, url },
        })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url, token }) => {
        await enqueueEmail(env, {
          idempotencyKey: `verify-email:${user.id}:${token}`,
          template: 'verify-email',
          recipient: user.email,
          payload: { name: user.name, url },
        })
      },
    },
    socialProviders,
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: true,
          defaultValue: 'customer',
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const role = user.email.toLowerCase() === adminEmail ? 'admin' : 'customer'
            await env.DB.batch([
              env.DB.prepare(
                'UPDATE "user" SET role = ?, "updatedAt" = ? WHERE id = ?',
              ).bind(role, new Date().toISOString(), user.id),
              env.DB.prepare(
                `INSERT OR IGNORE INTO customer_profiles
                  (user_id, created_at, updated_at)
                 VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              ).bind(user.id),
            ])
          },
        },
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 8 },
        '/sign-up/email': { window: 300, max: 5 },
        '/request-password-reset': { window: 300, max: 3 },
      },
    },
    advanced: {
      cookiePrefix: 'enchanted',
      useSecureCookies: baseURL.startsWith('https://'),
      database: { generateId: 'uuid' },
    },
  })
}

export type EnchantedAuth = Awaited<ReturnType<typeof getAuth>>
export type EnchantedSession = Awaited<ReturnType<EnchantedAuth['api']['getSession']>>

export async function getServerSession(): Promise<EnchantedSession> {
  try {
    return await (await getAuth()).api.getSession({ headers: await headers() })
  } catch {
    return null
  }
}

export async function requireCustomer() {
  const session = await getServerSession()
  if (!session?.user) redirect('/?auth=1')
  return session
}

export async function requireAdmin() {
  const session = await getServerSession()
  if (!session?.user || session.user.role !== 'admin') redirect('/admin/login')
  return session
}
