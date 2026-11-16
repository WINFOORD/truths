// Small Supabase-compatible query client. All database access is proxied through
// authenticated Vercel functions; the service-role key never reaches the browser.
class Query {
  constructor(table) {
    this.spec = { table, action: 'select', columns: '*', filters: [], orders: [], limit: null }
    this.singleMode = null
  }
  select(columns = '*') { this.spec.columns = columns; return this }
  insert(values) { this.spec.action = 'insert'; this.spec.values = values; return this }
  update(values) { this.spec.action = 'update'; this.spec.values = values; return this }
  delete() { this.spec.action = 'delete'; return this }
  eq(column, value) { this.spec.filters.push({ op: 'eq', column, value }); return this }
  neq(column, value) { this.spec.filters.push({ op: 'neq', column, value }); return this }
  not(column, operator, value) { this.spec.filters.push({ op: 'not', column, operator, value }); return this }
  order(column, options = {}) { this.spec.orders.push({ column, ascending: options.ascending !== false }); return this }
  limit(count) { this.spec.limit = Math.max(1, Math.min(500, Number(count) || 1)); return this }
  single() { this.singleMode = 'single'; return this }
  maybeSingle() { this.singleMode = 'maybeSingle'; return this }
  then(resolve, reject) { return this.run().then(resolve, reject) }
  async run() {
    try {
      const response = await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', body: JSON.stringify({ ...this.spec, singleMode: this.singleMode })
      })
      const result = await response.json().catch(() => ({}))
      if (response.status === 401) {
        await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {})
        location.reload()
      }
      if (!response.ok) return { data: null, error: { message: result.error || 'خطا در ارتباط با سرور', code: result.code } }
      return { data: result.data ?? null, error: null }
    } catch (error) { return { data: null, error: { message: error.message || 'ارتباط با سرور برقرار نشد' } } }
  }
}
export const sb = { from: table => new Query(table) }
