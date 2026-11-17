// Client for the feature API (/api/hub). Access rules are enforced on the server.
export async function hub(action, data = {}) {
  try {
    const r = await fetch('/api/hub', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    })
    const j = await r.json().catch(() => ({}))
    if (r.status === 401) {
      await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {})
      location.reload()
    }
    if (!r.ok) return { data: null, error: j.error || 'خطا در ارتباط با سرور' }
    return { data: j.data ?? null, error: null }
  } catch {
    return { data: null, error: 'ارتباط با سرور برقرار نشد' }
  }
}
