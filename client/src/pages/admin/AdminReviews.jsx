// src/pages/admin/AdminReviews.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// giống các page khác
const API_BASE_URL =
  (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api'

export default function AdminReviews() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloading, setReloading] = useState(false)

  const token = localStorage.getItem('access_token')

  // LOAD LIST REVIEW CHO ADMIN
  const loadReviews = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`${API_BASE_URL}/admin/reviews`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      if (!res.ok) throw new Error('Không tải được danh sách đánh giá')

      const data = await res.json()
      // BE trả về dạng { status, data: [...], meta: {...} }
      setItems(data.data || data.reviews || [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ẨN / HIỆN REVIEW
  const handleToggleHidden = async (id) => {
    if (!window.confirm('Bạn có chắc muốn ẩn/hiện đánh giá này?')) return
    try {
      setReloading(true)
      const res = await fetch(
        `${API_BASE_URL}/admin/reviews/${id}/toggle`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      const data = await res.json()
      if (!res.ok || data.status === false) {
        throw new Error(data.message || 'Không đổi trạng thái được')
      }

      // update lại trong state
      setItems((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, is_hidden: data.data.is_hidden } : r
        )
      )
    } catch (err) {
      console.error(err)
      alert(err.message || 'Có lỗi xảy ra khi ẩn/hiện.')
    } finally {
      setReloading(false)
    }
  }

  // XOÁ REVIEW
  const handleDelete = async (id) => {
    if (!window.confirm('Xoá vĩnh viễn đánh giá này?')) return
    try {
      setReloading(true)
      const res = await fetch(
        `${API_BASE_URL}/admin/reviews/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      const data = await res.json()
      if (!res.ok || data.status === false) {
        throw new Error(data.message || 'Không xoá được')
      }

      setItems((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error(err)
      alert(err.message || 'Có lỗi xảy ra khi xoá.')
    } finally {
      setReloading(false)
    }
  }

  return (
    <div>
      <h2>Quản lý đánh giá</h2>

      {loading && <p>Đang tải...</p>}
      {error && <p style={{ color: '#fecaca' }}>{error}</p>}

      <div className="admin-card" style={{ marginTop: 10 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span>
            Tổng: <strong>{items.length}</strong> đánh giá
          </span>
          {reloading && (
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              Đang cập nhật...
            </span>
          )}
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Bài đăng</th>
              <th>User</th>
              <th>Rating</th>
              <th>Nội dung</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
              <th style={{ textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  <Link
                    to={`/post/${r.post_id}`}
                    target="_blank"
                    className="post-link"
                  >
                    #{r.post_id}
                    {r.post?.title && ` – ${r.post.title}`}
                  </Link>
                </td>
                <td>{r.user?.name || `User #${r.user_id}`}</td>
                <td>{r.rating}/5</td>
                <td>{r.content}</td>
                <td>
                  {r.is_hidden ? (
                    <span style={{ color: '#facc15' }}>ĐÃ ẨN</span>
                  ) : (
                    <span style={{ color: '#22c55e' }}>HIỂN THỊ</span>
                  )}
                </td>
                <td>
                  {r.created_at &&
                    new Date(r.created_at).toLocaleString('vi-VN')}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {/* Nút Ẩn / Hiện */}
                  <button
                    onClick={() => handleToggleHidden(r.id)}
                    disabled={reloading}
                    style={{
                      marginRight: 8,
                      padding: '6px 14px',
                      fontSize: 13,
                      borderRadius: 999,
                      border: '1px solid #e5e7eb',
                      backgroundColor: r.is_hidden ? '#22c55e' : '#f97316',
                      color: '#ffffff',
                      cursor: reloading ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      minWidth: '80px',
                      boxShadow: '0 1px 2px rgba(15,23,42,0.35)',
                    }}
                  >
                    {r.is_hidden ? 'Hiện' : 'Ẩn'}
                  </button>

                  {/* Nút Xóa */}
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={reloading}
                    style={{
                      padding: '6px 14px',
                      fontSize: 13,
                      borderRadius: 999,
                      border: '1px solid #fecaca',
                      backgroundColor: '#b91c1c',
                      color: '#ffffff',
                      cursor: reloading ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      minWidth: '80px',
                      boxShadow: '0 1px 2px rgba(15,23,42,0.35)',
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !items.length && (
              <tr>
                <td colSpan="8">Chưa có đánh giá nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
