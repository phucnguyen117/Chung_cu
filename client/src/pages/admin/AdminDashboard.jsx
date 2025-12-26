// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import "@/assets/style/pages/admin.css"
import avatar from '@/assets/images/default-avatar.png';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000") + "/api"

// ================== SAFE JSON ==================
async function safeJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// ================== FIX AVATAR FUNCTION ==================
function getAvatar(user) {
  return (
    user?.avatar_url ||
    user?.avatar ||
    user?.profile?.avatar_url ||
    avatar
  )
}

function normalizeErrorMessage(err) {
  const msg = String(err?.message || err)
  if (msg.includes("Unexpected token") && msg.includes("<")) {
    return "API trả HTML 404/500 — không parse JSON được."
  }
  return msg
}

function extractApiError(data) {
  if (!data) return null
  if (data.message) return data.message
  if (data.errors) {
    // flatten validation errors
    try {
      return Object.values(data.errors).flat().join(' ')
    } catch { return null }
  }
  return null
} 

function formatDateTime(s) {
  try {
    if (!s) return '—'
    const d = new Date(s)
    if (isNaN(d)) return '—'
    return d.toLocaleString('vi-VN')
  } catch { return '—' }
}

export default function AdminDashboard() {
  const token = localStorage.getItem("access_token")

  const [adminUser, setAdminUser] = useState(null)
  const avatarUrl = getAvatar(adminUser)

  const [stats, setStats] = useState({
    total_posts: 0,
    total_users: 0,
    total_reviews: 0,
    total_saved: 0,
  })
  const [selectedRequest, setSelectedRequest] = useState(null)

  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])

  const [status, setStatus] = useState("all")
  const [categoryId, setCategoryId] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [lessorRequests, setLessorRequests] = useState([])
  const [lessorLoading, setLessorLoading] = useState(false)
  const [lessorError, setLessorError] = useState("")
  const [actionError, setActionError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [lastActionAttempt, setLastActionAttempt] = useState(null)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const [menuOpen, setMenuOpen] = useState(false)

  // ================== LOAD ADMIN USER ==================
  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const data = await safeJson(res)
        if (res.ok) setAdminUser(data?.data || data)

      } catch (err) {
        console.log("Không load được admin user")
      }
    })()
  }, [token])

  // ================== LOAD STATS ==================
  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await safeJson(res)
        if (res.ok) setStats({ ...stats, ...(data?.data || data) })

      } catch (err) {
        console.error("Lỗi stats:", err)
      }
    })()
  }, [token])

  // ================== LOAD CATEGORIES ==================
  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`)
        const data = await safeJson(res)
        if (res.ok) setCategories(data?.data || data)

      } catch {
        console.error("Lỗi categories")
      }
    })()
  }, [])

  // ================== LOAD POSTS ==================
  useEffect(() => {
    ; (async () => {
      try {
        setLoading(true)
        setError("")

        const params = new URLSearchParams()
        if (status !== "all") params.set("status", status)
        if (categoryId) params.set("category_id", categoryId)
        if (q.trim()) params.set("q", q.trim())
        params.set("page", page)

        const res = await fetch(`${API_BASE_URL}/admin/posts?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await safeJson(res)
        if (!res.ok) throw new Error(data?.message)

        setPosts(data?.data || [])
        setLastPage(data?.meta?.last_page || 1)

      } catch (err) {
        setError(normalizeErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [status, categoryId, q, page, token])

  // ================== LOAD LESSOR REQUESTS ==================
const loadLessorRequests = async () => {
  try {
    setLessorLoading(true)

    const res = await fetch(`${API_BASE_URL}/admin/lessor-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await safeJson(res)
    if (!res.ok) throw new Error(data?.message)

    const all = Array.isArray(data?.data) ? data.data : []
    const pending = all.filter(r => r.status === 'pending')
    setLessorRequests(pending)

  } catch (err) {
    setLessorError(normalizeErrorMessage(err))
  } finally {
    setLessorLoading(false)
  }
}


  useEffect(() => {
    // initial load
    loadLessorRequests()

    // Polling to keep list in sync across admins (every 10s)
    const iv = setInterval(loadLessorRequests, 10000)
    return () => clearInterval(iv)
  }, [token])

  // ================== POST ACTION ==================
  const handleToggleStatus = async (postId, currentStatus) => {
    const next = currentStatus === "published" ? "hidden" : "published"
    if (!confirm(`Chuyển sang ${next}?`)) return

    try {
      const res = await fetch(`${API_BASE_URL}/admin/posts/${postId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: next }),
      })

      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.message)

      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, status: next } : p
        )
      )

      setActionMessage('Cập nhật trạng thái thành công')
      setTimeout(() => setActionMessage(''), 3000)

    } catch (err) {
      const msg = String(err?.message || err)
      setActionError(msg)
      setTimeout(() => setActionError(''), 5000)
    }
  }

  const handleApprovePost = async (postId) => {
    if (!confirm("Duyệt bài?")) return

    try {
      const res = await fetch(`${API_BASE_URL}/admin/posts/${postId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "published" }),
      })

      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.message)

      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, status: "published" } : p
        )
      )

      setActionMessage('Duyệt bài thành công')
      setTimeout(() => setActionMessage(''), 3000)

    } catch (err) {
      const msg = String(err?.message || err)
      setActionError(msg)
      setTimeout(() => setActionError(''), 5000)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!confirm("Xoá bài?")) return

    try {
      const res = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await safeJson(res)
      if (!res.ok) throw new Error(data?.message)

      setPosts(prev => prev.filter(p => p.id !== postId))

      setActionMessage('Xoá bài thành công')
      setTimeout(() => setActionMessage(''), 3000)

    } catch (err) {
      const msg = String(err?.message || err)
      setActionError(msg)
      setTimeout(() => setActionError(''), 5000)
    }
  }

  // ================== LESSOR REQUEST ACTION ==================
  const handleLessorAction = async (id, action) => {
    // clear previous action error and remember this attempt so user can retry
    setActionError("")
    setLastActionAttempt({ id, action })

    // construct url and method properly
    let url = `${API_BASE_URL}/admin/lessor-requests/${id}/${action}`;
    let method = "POST";
    if (action === "delete") {
      // delete endpoint is DELETE /admin/lessor-requests/{id}
      url = `${API_BASE_URL}/admin/lessor-requests/${id}`
      method = "DELETE";
    }

    if (!confirm("Chắc chắn?")) return;

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await safeJson(res);
      if (!res.ok) {
        const errMsg = extractApiError(data) || data?.message || "Lỗi không xác định"
        throw new Error(errMsg)
      }

      setLessorRequests(prev => prev.filter(r => r.id !== id));
      setSelectedRequest(null);

      // refresh from server to ensure global consistency
     setLessorRequests(prev => prev.filter(r => r.id !== id))


      // non-blocking success feedback
      setActionMessage(data?.message || 'Thao tác thành công')
      setTimeout(() => setActionMessage(''), 3500)

    } catch (err) {
      console.error('Lessor action error', err)

      const msg = String(err?.message || err)
      const isNetwork = msg.includes('Failed to fetch') || err instanceof TypeError
      const userMessage = isNetwork
        ? `Không thể kết nối tới API (${API_BASE_URL}). Kiểm tra backend đang chạy và cấu hình CORS.`
        : (msg || 'Có lỗi khi xử lý yêu cầu.')

      // surface the error inline in the modal and allow retry
      setActionError(userMessage)

      // Only try to refresh list if it's not a network error
      if (!isNetwork) {
        try {
          const res2 = await fetch(`${API_BASE_URL}/admin/lessor-requests`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const d2 = await safeJson(res2)
          const fresh = res2.ok ? (d2?.data || d2 || []) : []
          setLessorRequests(fresh)
          const exists = fresh.some(r => r.id === id)
          if (!exists) {
            // non-blocking notice to user
            setActionMessage('Hành động có vẻ đã thực hiện thành công nhưng server trả lỗi. Danh sách đã được làm mới.')
            setTimeout(() => setActionMessage(''), 3500)
            setSelectedRequest(null)
            setActionError("")
            return
          }
        } catch (e) {
          console.error('Refresh lessor requests failed', e)
        }
      }

    }
  };

  const submitReject = async () => {
    if (!selectedRequest) return
    if (!rejectReason || !rejectReason.trim()) {
      setActionError('Vui lòng nhập lý do từ chối')
      return
    }

    setActionError("")
    setLastActionAttempt({ id: selectedRequest.id, action: 'reject', body: { reason: rejectReason } })

    const url = `${API_BASE_URL}/admin/lessor-requests/${selectedRequest.id}/reject`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      })

      const data = await safeJson(res)
      if (!res.ok) {
        const errMsg = extractApiError(data) || data?.message || 'Lỗi khi từ chối yêu cầu'
        throw new Error(errMsg)
      }

      // success
      setLessorRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
      setSelectedRequest(null)
      setIsRejecting(false)
      setRejectReason('')
      await loadLessorRequests()
      setActionMessage(data?.message || 'Yêu cầu đã bị từ chối')
      setTimeout(() => setActionMessage(''), 3500)

    } catch (err) {
      console.error('Reject failed', err)
      const msg = String(err?.message || err)
      const isNetwork = msg.includes('Failed to fetch') || err instanceof TypeError
      setActionError(isNetwork ? `Không thể kết nối tới API (${API_BASE_URL}). Kiểm tra backend đang chạy và cấu hình CORS.` : msg)
    }
  }


  const resetFilters = () => {
    setStatus("all")
    setCategoryId("")
    setQ("")
    setPage(1)
  }

  // ======================================================
  // ===================== RETURN UI ======================
  // ======================================================

  return (
    <div className="admin-page">

      {/* ================= MOBILE TOPBAR ================= */}
      <div className="admin-mobile-topbar">
        <div className="admin-mobile-avatar">
          <img className="avatar-big" src={avatarUrl} alt="" />
        </div>

        <div className="admin-mobile-menu-btn" onClick={() => setMenuOpen(true)}>
          <svg width="26" height="26" stroke="#fff" strokeWidth="2">
            <path d="M3 6h20M3 13h20M3 20h20" />
          </svg>
        </div>
      </div>

      {/* ================= MOBILE MENU ================= */}
      <div className={`admin-mobile-menu ${menuOpen ? "is-open" : ""}`}>
        <div className="admin-mobile-menu-close" onClick={() => setMenuOpen(false)}>
          ×
        </div>

        <div className="admin-mobile-userbox">
          <img className="avatar-big" src={avatarUrl} />
          <p className="name">{adminUser?.name || "Admin"}</p>
          <p className="email">{adminUser?.email}</p>
        </div>

        <a href="/admin" className="admin-menu__link">Tổng quan</a>
        <a href="/admin/posts" className="admin-menu__link">Bài đăng</a>
        <a href="/admin/users" className="admin-menu__link">Người dùng</a>
        <a href="/admin/reviews" className="admin-menu__link">Đánh giá</a>
        <a href="/admin/blog-list" className="admin-menu__link">Blog</a>

        <div className="admin-menu__section">DANH MỤC HỆ THỐNG</div>
        <a href="/admin/categories" className="admin-menu__link">Danh mục</a>
        <a href="/admin/amenities" className="admin-menu__link">Tiện ích</a>
        <a href="/admin/environment-features" className="admin-menu__link">Môi trường</a>
        <a href="/admin/locations" className="admin-menu__link">Địa lý</a>
        <a href="/admin/saved-posts" className="admin-menu__link">Bài đã lưu</a>


        <a href="/" className="admin-menu__link">Trang chủ</a>
      </div>

      {/* ================= DESKTOP HEADER ================= */}
      <header className="admin-header">
        <div>
          <h1>Bảng điều khiển</h1>
          <p>Quản lý toàn bộ hệ thống.</p>
        </div>

        <div className="admin-header__actions">
          
        </div>
      </header>

      {/* ================= STATS ================= */}
      <section className="admin-stats">
        <div className="admin-stat">
          <p className="admin-stat__label">Tổng bài đăng</p>
          <p className="admin-stat__value">{stats.total_posts}</p>
        </div>

        <div className="admin-stat">
          <p className="admin-stat__label">Người dùng</p>
          <p className="admin-stat__value">{stats.total_users}</p>
        </div>

        <div className="admin-stat">
          <p className="admin-stat__label">Đánh giá</p>
          <p className="admin-stat__value">{stats.total_reviews}</p>
        </div>

        <div className="admin-stat">
          <p className="admin-stat__label">Bài đã lưu</p>
          <p className="admin-stat__value">{stats.total_saved}</p>
        </div>
      </section>

      {/* Simple inline bar chart (no deps) */}
      <section className="admin-section">
        <h3>Biểu đồ nhanh</h3>
        <div style={{display:'flex', gap:20, alignItems:'flex-end', padding:'10px 0'}}>
          {(() => {
            const values = [
              {k:'posts', v: stats.total_posts || 0, color:'#2563eb'},
              {k:'users', v: stats.total_users || 0, color:'#16a34a'},
              {k:'reviews', v: stats.total_reviews || 0, color:'#f59e0b'},
              {k:'saved', v: stats.total_saved || 0, color:'#ef4444'},
            ]
            const max = Math.max(...values.map(x => x.v), 1)
            return values.map(item => (
              <div key={item.k} style={{flex:1, textAlign:'center'}}>
                <div style={{height:120, display:'flex', alignItems:'flex-end', justifyContent:'center'}}>
                  <div style={{width:36, height:`${Math.round((item.v/max)*100)}%`, background:item.color, borderRadius:6}} title={`${item.v}`} />
                </div>
                <div style={{marginTop:8, fontSize:13}}>{item.v}</div>
                <div style={{fontSize:12, color:'#666'}}>{item.k}</div>
              </div>
            ))
          })()}
        </div>
      </section>

      {/* ================= POSTS TABLE ================= */}
      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Danh sách bài đăng</h2>

          <div className="admin-filters">
            <input
              className="admin-input"
              placeholder="Tìm theo tiêu đề…"
              value={q}
              onChange={e => {
                setQ(e.target.value)
                setPage(1)
              }}
            />

            <select
              className="admin-input"
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
              className="admin-input"
              value={status}
              onChange={e => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="published">Hiển thị</option>
              <option value="hidden">Ẩn</option>
            </select>

            <button className="admin-btn admin-btn--ghost" onClick={resetFilters}>
              Xoá lọc
            </button>
          </div>
        </div>

        {error && <p className="admin-error">{error}</p>}
        {loading && <p className="admin-loading">Đang tải…</p>}

        {!loading && !error && (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tiêu đề</th>
                    <th>Giá / Diện tích</th>
                    <th>Địa chỉ</th>
                    <th>Loại</th>
                    <th>Chủ phòng</th>
                    <th>Trạng thái</th>
                    <th>Ngày đăng</th>
                    <th>Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {posts.length === 0 && (
                    <tr>
                      <td colSpan="9" className="admin-empty">
                        Không có bài đăng.
                      </td>
                    </tr>
                  )}

                  {posts.map(post => (
                    <tr key={post.id}>
                      <td>#{post.id}</td>

                      <td className="admin-td-title">
                        <Link className="admin-link" to={`/post/${post.id}`} target="_blank">
                          {post.title}
                        </Link>
                      </td>

                      <td>
                        {post.price?.toLocaleString("vi-VN")} ₫
                        <div className="admin-td-sub">{post.area} m²</div>
                      </td>

                      <td className="admin-td-address">
                        <div className="admin-td-address-main">{post.address}</div>
                        <div className="admin-td-sub admin-td-address-sub">{post.ward?.name}, {post.district?.name}, {post.province?.name}</div>
                      </td>

                      <td>{post.category?.name}</td>

                      <td>
                        {post.user?.name}
                        <div className="admin-td-sub">{post.user?.email}</div>
                      </td>

                      <td>
                        <span className={`admin-badge admin-badge--${post.status}`}>
                          {post.status}
                        </span>
                      </td>

                      <td>
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>

                      <td className="admin-td-actions" >
                        {post.status === "pending" ? (
                          <>
                            <button
                              className="admin-link"
                              onClick={() => handleApprovePost(post.id)}
                            >
                              Duyệt
                            </button>

                            <button
                              className="admin-link admin-link--danger"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              Xoá
                            </button>
                          </>
                        ) : (
                          <>
                            <Link className="admin-link" to={`/admin/posts/${post.id}/edit`}>
                              Sửa
                            </Link>

                            <button
                              className="admin-link admin-link--danger"
                              onClick={() => handleToggleStatus(post.id, post.status)}
                            >
                              {post.status === "published" ? "Ẩn" : "Hiển thị"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-paging">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ‹ Trước
              </button>
              <span>
                Trang {page} / {lastPage}
              </span>
              <button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
                Sau ›
              </button>
            </div>
          </>
        )}
      </section>

      {/* ================= LESSOR REQUESTS ================= */}
      <section className="admin-section">
        <h2>Yêu cầu (chờ xử lý)</h2>

        {lessorError && <p className="admin-error">{lessorError}</p>}
        {lessorLoading && <p className="admin-loading">Đang tải…</p>}

        {!lessorLoading && !lessorError && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Ngày sinh</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                </tr>
              </thead>

              <tbody>
                {lessorRequests.length === 0 && (
                  <tr>
                    <td colSpan="8" className="admin-empty">
                      Không có yêu cầu nào.
                    </td>
                  </tr>
                )}

                {lessorRequests.map(req => (
                  <tr key={req.id}>
                    <td>#{req.id}</td>

                    <td>
                      {req.full_name || req.user?.name}
                      <div className="admin-td-sub">User ID: {req.user_id}</div>
                    </td>

                    <td>{req.email}</td>

                    <td>{req.phone_number}</td>

                    <td>{new Date(req.date_of_birth).toLocaleDateString("vi-VN")}</td>

                    <td>
                      <span className={`admin-badge admin-badge--${req.status}`}>
                        {req.status}
                      </span>
                    </td>

                    <td>{new Date(req.created_at).toLocaleString("vi-VN")}</td>
                    <td>
                      <div className="admin-td-actions">
                        <button
                        style={{
                          padding: "6px 12px",
                          border: "1px solid #007bff",
                          background: "transparent",
                          color: "#007bff",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                          onClick={() => setSelectedRequest(req)}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </section>

      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>

            <button className="modal-close" onClick={() => setSelectedRequest(null)}>×</button>

            <h2>Thông tin yêu cầu #{selectedRequest.id}</h2>

            <p><b>Họ tên:</b> {selectedRequest.full_name}</p>
            <p><b>Email:</b> {selectedRequest.email}</p>
            <p><b>Số điện thoại:</b> {selectedRequest.phone_number}</p>
            <p><b>Ngày sinh:</b> {new Date(selectedRequest.date_of_birth).toLocaleDateString("vi-VN")}</p>
            <p><b>Trạng thái:</b> {selectedRequest.status}</p>
            <p><b>Ngày gửi:</b> {formatDateTime(selectedRequest.created_at)}</p>
            
            <div className="cccd-preview-wrapper">
              <div>
                <p>CCCD mặt trước</p>
                <img className="cccd-large" src={selectedRequest.cccd_front_url} />
              </div>

              <div>
                <p>CCCD mặt sau</p>
                <img className="cccd-large" src={selectedRequest.cccd_back_url} />
              </div>
            </div>

            {actionMessage && (
              <div className="admin-success" style={{marginBottom:12, background:'#e6fffa', color:'#064e3b', padding:12, borderRadius:8}}>
                <div style={{fontWeight:600, marginBottom:6}}>Hoàn thành</div>
                <div style={{marginBottom:4}}>{actionMessage}</div>
              </div>
            )}

            {actionError && (
              <div className="admin-error" style={{marginBottom:12}}>
                <div style={{fontWeight:600, marginBottom:6}}>Lỗi khi thực hiện hành động</div>
                <div style={{marginBottom:8}}>{actionError}</div>
                <div style={{display:'flex', gap:8}}>
                  <button
                    className="admin-btn admin-btn--ghost"
                    onClick={() => {
                      if (lastActionAttempt) {
                        const { id, action, body } = lastActionAttempt
                        if (action === 'reject') {
                          // if we had a body (reason), ensure UI has it and submit
                          if (body?.reason) {
                            setRejectReason(body.reason)
                            submitReject()
                          } else {
                            setIsRejecting(true)
                          }
                        } else {
                          handleLessorAction(id, action)
                        }
                      }
                    }}
                  >
                    Thử lại
                  </button>

                  <button
                    className="admin-btn admin-btn--ghost"
                    onClick={() => setActionError("")}
                  >
                    Đóng lỗi
                  </button>
                </div>
              </div>
            )}

            {isRejecting && (
              <div style={{marginBottom:12}}>
                <div style={{fontWeight:600, marginBottom:8}}>Lý do từ chối</div>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} style={{width:'100%', padding:8, borderRadius:6}} />
                <div style={{display:'flex', gap:8, marginTop:8}}>
                  <button className="admin-btn admin-btn--warning" onClick={() => submitReject()}>
                    Xác nhận từ chối
                  </button>
                  <button className="admin-btn admin-btn--ghost" onClick={() => { setIsRejecting(false); setRejectReason(''); }}>
                    Huỷ
                  </button>
                </div>
              </div>
            )}

            <div className="modal-actions">
            {selectedRequest.status === "pending" && (
              <>              
              <button
                className="admin-btn admin-btn--primary"
                onClick={() => handleLessorAction(selectedRequest.id, "approve")}
              >
                Duyệt
              </button>

              <button
                className="admin-btn admin-btn--warning"
                onClick={() => setIsRejecting(true)}
              >
                Từ chối
              </button>
              </>
            )}
            
              <button
                className="admin-btn admin-btn--danger"
                onClick={() => handleLessorAction(selectedRequest.id, "delete")}
              >
                Xoá
              </button>
            </div>

          </div>
        </div>
      )}

    </div>

  )
}
