/**
 * 静态数据访问层
 *
 * 数据源：仓库内的静态 JSON（public/data/），由 GitHub Actions 维护。
 * 替代原先的 Supabase 直连，好处：
 *   - 不会因免费项目 pause 导致数据「消失」
 *   - 不受办公网 DNS 拦截 *.supabase.co 影响
 *   - 数据进 Git 有完整版本历史，可回滚
 */

// 带 base 前缀，兼容子路径部署
const BASE = import.meta.env.BASE_URL || '/'
const INDEX_URL = `${BASE}data/ips-index.json`.replace(/\/{2,}/g, '/')

let _cache = null

/**
 * 获取全部 IP 记录（不含 raw_md 全文，约 111KB）
 * @returns {Promise<Array>}
 */
export async function fetchIPs() {
  if (_cache) return _cache
  const res = await fetch(`${INDEX_URL}?t=${Date.now()}`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`加载数据失败：HTTP ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('数据格式异常：期望数组')
  // 按创建时间倒序（与原 Supabase 查询一致）
  _cache = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return _cache
}

/**
 * 按 ID 获取单条记录，并按需加载其 MD 报告全文
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function fetchIPById(id) {
  const all = await fetchIPs()
  const ip = all.find(r => String(r.id) === String(id))
  if (!ip) return null

  // 报告全文单独按需加载，避免首屏拉取 1.4MB
  if (ip.has_report && ip.raw_md === undefined) {
    try {
      const url = `${BASE}data/reports/${ip.id}.md`.replace(/\/{2,}/g, '/')
      const res = await fetch(url, { cache: 'no-cache' })
      ip.raw_md = res.ok ? await res.text() : ''
    } catch {
      ip.raw_md = ''
    }
  }
  return ip
}

/** 清空缓存，强制下次重新拉取 */
export function clearCache() {
  _cache = null
}
