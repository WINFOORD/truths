import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const b64 = value => Buffer.from(value).toString('base64url')
const sign = value => createHmac('sha256', process.env.SESSION_SECRET || '').update(value).digest('base64url')
export function createSession(payload, maxAgeSeconds) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET باید حداقل ۳۲ کاراکتر باشد')
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds }))
  return `${body}.${sign(body)}`
}
export function readSession(req) {
  const cookie = req.headers.cookie || ''
  const token = cookie.split(';').map(x => x.trim()).find(x => x.startsWith('tt_session='))?.slice('tt_session='.length)
  if (!token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature || !process.env.SESSION_SECRET) return null
  const expected = sign(body)
  const a = Buffer.from(signature), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}
export function setSessionCookie(res, token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `tt_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`)
}
export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `tt_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
}
export async function tg(chat, text) {
  if (!chat || !process.env.TELEGRAM_BOT_TOKEN) {
    console.error('Telegram config missing:', {
      chatExists: Boolean(chat),
      tokenExists: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    })
    return false
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat,
          text,
          disable_web_page_preview: true,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok || !data.ok) {
      console.error('Telegram API error:', {
        status: response.status,
        error_code: data.error_code,
        description: data.description,
      })
      return false
    }

    return true
  } catch (error) {
    console.error('Telegram request failed:', error.message)
    return false
  }
}
export function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '))
  return res.status(405).json({ error: 'Method not allowed' })
}
