// src/pages/lessor/LessorDashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '@/assets/style/pages/lessor/lessor.css'

// ------ helper: parse JSON an toàn ------
async function safeJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.warn('Phản hồi không phải JSON:', res.url, text.slice(0, 120))
    return null
  }
}

function normalizeErrorMessage(err) {
  const msg = String(err?.message || err)
  if (msg.includes('Unexpected token') && msg.includes('<')) {
    return 'API trả về HTML (thường là lỗi 404/500) nên không parse được JSON. Kiểm tra lại route /api/lessor/posts ở backend.'
  }
  return msg
}

export default function LessorDashboard() {
  // --- SỐ LIỆU TỔNG QUAN (stats) ---
  // map với các bảng: posts, reviews
  const [stats, setStats] = useState({
    total_posts: 0,
    total_reviews: 0,
  })

  // --- DANH SÁCH BÀI ĐĂNG (bảng posts) ---
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([]) // bảng categories

  const [status, setStatus] = useState('all') // enum status trong posts
  const [categoryId, setCategoryId] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewSummary, setReviewSummary] = useState({
    average_rating: 0,
    ratings_count: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    total_reviews: 0,
  })

  // LOAD STATS 
  useEffect(() => {
    ;(async () => {
      try {
        // API: GET /api/lessor/stats hoặc tính từ posts của lessor
        const token = localStorage.getItem('access_token')
        const res = await fetch('/api/lessor/stats', {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        const data = await safeJson(res)

        if (!res.ok) {
          // Nếu không có endpoint, tính từ posts
          const postsRes = await fetch('/api/posts', {
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
          const postsData = await safeJson(postsRes)
          const myPosts = Array.isArray(postsData?.data || postsData) ? (postsData?.data || postsData) : []
          setStats({
            total_posts: myPosts.length,
            total_reviews: 0, // sẽ tính sau
          })
          return
        }

        setStats(prev => ({
          ...prev,
          ...(data?.data || data || {}),
        }))
      } catch (err) {
        console.error('Lỗi load stats:', err)
        // không cần hiển thị lỗi to, chỉ log console
      }
    })()
  }, [])

  //  LOAD CATEGORIES 
  useEffect(() => {
    ;(async () => {
      try {
        // API: GET /api/categories
        // Gợi ý response: { data: [{id, name, slug}, ...] }
        const res = await fetch('/api/categories')
        const data = await safeJson(res)
        if (!res.ok) return

        setCategories(data?.data || data || [])
      } catch (err) {
        console.error('Lỗi load categories:', err)
      }
    })()
  }, [])

  //  LOAD POSTS (bảng posts - chỉ của lessor) 
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError('')

        const token = localStorage.getItem('access_token')
        if (!token) {
          setError('Bạn chưa đăng nhập.')
          setLoading(false)
          return
        }

        const params = new URLSearchParams()
        if (status !== 'all') params.set('status', status)
        if (categoryId) params.set('category_id', categoryId)
        if (q.trim()) params.set('q', q.trim())
        params.set('page', String(page))

        // API: GET /api/posts?my_posts=1 hoặc /api/lessor/posts
        // Lessor chỉ xem bài đăng của chính mình
        const res = await fetch(`/api/posts?my_posts=1&${params.toString()}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await safeJson(res)

        if (!res.ok) {
          throw new Error(data?.message || 'Không tải được danh sách bài đăng')
        }

        const list = data?.data || data || []
        setPosts(Array.isArray(list) ? list : [])

        const meta = data?.meta || data?.pagination || {}
        setLastPage(meta.last_page || 1)
      } catch (err) {
        console.error('Lỗi load posts:', err)
        setError(normalizeErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [status, categoryId, q, page])

  //  REVIEWS SUMMARY (avg stars - chỉ của lessor) 
  useEffect(() => {
    ;(async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const res = await fetch('/api/lessor/reviews', {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await safeJson(res)
        if (!res.ok || data?.status === false) return

        const reviews = data?.data || []
        const total = reviews.length
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
        const avg = total > 0 ? sum / total : 0
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        reviews.forEach(r => {
          const rating = Math.round(r.rating || 0)
          if (rating >= 1 && rating <= 5) counts[rating] = (counts[rating] || 0) + 1
        })

        setReviewSummary({
          average_rating: avg,
          ratings_count: counts,
          total_reviews: total,
        })
      } catch (err) {
        console.error('Lỗi load reviews summary:', err)
      }
    })()
  }, [])

  const resetFilters = () => {
    setStatus('all')
    setCategoryId('')
    setQ('')
    setPage(1)
  }

  //  CHART DATA 
  const barData = useMemo(() => {
    const categories = ['apartment', 'house', 'room']
    const labels = {
      apartment: 'Căn hộ',
      house: 'Nhà nguyên căn',
      room: 'Phòng trọ',
    }
    const result = {
      apartment: { published: 0, pending: 0, draft: 0 },
      house: { published: 0, pending: 0, draft: 0 },
      room: { published: 0, pending: 0, draft: 0 },
    }

    posts.forEach(p => {
      const name = p.category?.name?.toLowerCase?.() || ''
      const status = (p.status || '').toLowerCase()
      let key = 'room'
      if (name.includes('căn hộ') || name.includes('apartment') || name.includes('chung cư')) {
        key = 'apartment'
      } else if (name.includes('nhà')) {
        key = 'house'
      }

      if (status === 'published') result[key].published += 1
      else if (status === 'pending') result[key].pending += 1
      else result[key].draft += 1
    })

    const series = categories.map(key => {
      const totals = result[key]
      const total = totals.published + totals.pending + totals.draft
      return {
        key,
        label: labels[key],
        total,
        breakdown: [
          { status: 'published', label: 'Đang cho thuê', value: totals.published, color: 'var(--chart-green, #34d399)' },
          { status: 'pending', label: 'Chờ duyệt', value: totals.pending, color: 'var(--chart-amber, #fbbf24)' },
          { status: 'draft', label: 'Còn trống', value: totals.draft, color: 'var(--chart-slate, #94a3b8)' },
        ],
      }
    })

    const max = Math.max(
      ...series.flatMap(s => s.breakdown.map(b => b.value)),
      1,
    )
    return { series, max }
  }, [posts])

  const ratingsBars = useMemo(() => {
    const counts = reviewSummary.ratings_count || {}
    const maxCount = Math.max(...Object.values(counts || {}), 1)
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: counts[star] || 0,
      width: `${Math.round(((counts[star] || 0) / maxCount) * 100)}%`,
    }))
  }, [reviewSummary])

  //  RENDER 
  return (
    <div className="lessor-page">
      {/* HEADER */}
      <header className="lessor-header">
        <div>
          <h1>Bảng điều khiển</h1>
          <p>
            Quản lý bài đăng và đánh giá của bạn trong hệ thống cho thuê
            chung cư / phòng trọ.
          </p>
        </div>

        <div className="lessor-header__actions">
          {/* API create post: front sẽ điều hướng sang form tạo (LessorPostCreate.jsx) */}
          <Link
            to="/lessor/posts/create"
            className="lessor-btn lessor-btn--primary"
          >
            + Đăng bài mới
          </Link>
        </div>
      </header>

      {/* STATS CARDS (posts, reviews) */}
      <section className="lessor-stats">
        <div className="lessor-stat">
          <p className="lessor-stat__label">Tổng bài đăng</p>
          <p className="lessor-stat__value">{stats.total_posts}</p>
          <p className="lessor-stat__hint">Bài đăng của bạn</p>
        </div>
        <div className="lessor-stat">
          <p className="lessor-stat__label">Đánh giá</p>
          <p className="lessor-stat__value">{stats.total_reviews}</p>
          <p className="lessor-stat__hint">Đánh giá về bài đăng của bạn</p>
        </div>
      </section>

      {/* BIỂU ĐỒ */}
      <section className="lessor-section lessor-charts">
        <div className="lessor-card lessor-chart-card">
          <header className="lessor-card__head">
            <div>
              <h3>Biểu đồ số lượng chung cư / phòng</h3>
            </div>
          </header>
          <div className="chart-bar-wrapper chart-bar-wrapper--grouped">
            {barData.series.map(item => (
              <div key={item.key} className="chart-bar chart-bar--group">
                <div className="chart-bar__group">
                  {item.breakdown.map(part => (
                    <div className="chart-bar__group-item" key={part.status}>
                      <div
                        className="chart-bar__col"
                        style={{
                          background: part.color,
                          height: `${(part.value / barData.max) * 100}%`,
                        }}
                        aria-label={`${item.label} - ${part.label}: ${part.value}`}
                        title={`${item.label} - ${part.label}: ${part.value}`}
                      />
                      <span className="chart-bar__value chart-bar__value--sm">
                        {part.value}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="chart-bar__label">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <div className="chart-legend__item">
              <span className="chart-legend__swatch chart-legend__swatch--published" />
              <span>Đang cho thuê</span>
            </div>
            <div className="chart-legend__item">
              <span className="chart-legend__swatch chart-legend__swatch--pending" />
              <span>Chờ duyệt</span>
            </div>
            <div className="chart-legend__item">
              <span className="chart-legend__swatch chart-legend__swatch--draft" />
              <span>Còn trống</span>
            </div>
          </div>
        </div>

        <div className="lessor-card lessor-chart-card">
          <header className="lessor-card__head">
            <div>
              <h3>Điểm xếp hạng đánh giá </h3>
              <p>
                Điểm trung bình: {reviewSummary.average_rating.toFixed(1)}★ ·{' '}
                {reviewSummary.total_reviews} đánh giá
              </p>
            </div>
          </header>
          <div className="chart-rating-wrapper">
            {ratingsBars.map(row => (
              <div key={row.star} className="chart-rating-row">
                <span className="chart-rating-star">{row.star}★</span>
                <div className="chart-rating-bar">
                  <div
                    className="chart-rating-bar__fill"
                    style={{ width: row.width }}
                    aria-label={`Số đánh giá ${row.star} sao: ${row.count}`}
                  />
                </div>
                <span className="chart-rating-count">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DANH SÁCH BÀI ĐĂNG (bảng posts) */}
      <section className="lessor-section">
        <div className="lessor-section__head">
          <div>
            <h2>Danh sách bài đăng của bạn</h2>
            <p>
              Quản lý bài đăng phòng trọ / nhà nguyên căn / căn hộ của bạn trong bảng{' '}
              <code>posts</code>.
            </p>
          </div>

          <div className="lessor-filters">
            <input
              className="lessor-input"
              placeholder="Tìm theo tiêu đề, địa chỉ, ID…"
              value={q}
              onChange={e => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
            <select
              className="lessor-input"
              value={categoryId}
              onChange={e => {
                setCategoryId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả loại phòng</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="lessor-input"
              value={status}
              onChange={e => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">Trạng thái: Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="published">Đang hiển thị</option>
            </select>
            <button
              type="button"
              className="lessor-btn lessor-btn--ghost"
              onClick={resetFilters}
            >
              Xoá lọc
            </button>
          </div>
        </div>

        {error && <p className="lessor-error">{error}</p>}
        {loading && !error && (
          <p className="lessor-loading">Đang tải danh sách bài đăng…</p>
        )}

        {!loading && !error && (
          <>
            <div className="lessor-table-wrap">
              <table className="lessor-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tiêu đề</th>
                    <th>Giá / Diện tích</th>
                    <th>Địa chỉ</th>
                    <th>Loại</th>
                    <th>Trạng thái</th>
                    <th>Ngày đăng</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.length === 0 && (
                    <tr>
                      <td colSpan="8" className="lessor-empty">
                        Không có bài đăng nào phù hợp.
                      </td>
                    </tr>
                  )}

                  {posts.map(post => (
                    <tr key={post.id}>
                      <td>#{post.id}</td>
                      <td className="lessor-td-title">
                        <Link
                          to={`/post/${post.id}`}
                          className="lessor-link"
                          target="_blank"
                        >
                          {post.title}
                        </Link>
                      </td>
                      <td>
                        <div>
                          {post.price?.toLocaleString?.('vi-VN') ?? post.price}{' '}
                          ₫
                        </div>
                        <div className="lessor-td-sub">{post.area} m²</div>
                      </td>
                      <td>
                        <div>{post.address}</div>
                        <div className="lessor-td-sub">
                          {post.ward?.name}, {post.district?.name},{' '}
                          {post.province?.name}
                        </div>
                      </td>
                      <td>{post.category?.name || '—'}</td>
                      <td>
                        <span
                          className={`lessor-badge lessor-badge--${
                            post.status || 'pending'
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                      <td>
                        {post.published_at
                          ? new Date(
                              post.published_at,
                            ).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
                      <td className="lessor-td-actions">
                        <Link
                          to={`/lessor/posts/${post.id}/edit`}
                          className="lessor-link"
                        >
                          Sửa
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PHÂN TRANG */}
            <div className="lessor-paging">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ‹ Trước
              </button>
              <span>
                Trang {page} / {lastPage}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
              >
                Sau ›
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

