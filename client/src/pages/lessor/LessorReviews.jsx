// src/pages/lessor/LessorReviews.jsx
import { useEffect, useState } from 'react'

export default function LessorReviews() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')
        
        const token = localStorage.getItem('access_token')
        if (!token) {
          setError('Bạn chưa đăng nhập.')
          setLoading(false)
          return
        }

        const res = await fetch('/api/lessor/reviews', {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const msg = data?.message || 'Không tải được danh sách đánh giá'
          throw new Error(msg)
        }

        setItems(data?.data || data || [])
      } catch (err) {
        setError(err.message || 'Có lỗi xảy ra')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <h2>Quản lý đánh giá</h2>
      <p style={{ marginTop: 4, opacity: 0.8 }}>
        Xem đánh giá mà người thuê viết cho các bài đăng của bạn.
      </p>
      {loading && <p>Đang tải...</p>}
      {error && <p style={{ color: '#fecaca' }}>{error}</p>}

      <div className="lessor-card" style={{ marginTop: 10 }}>
        <table className="lessor-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Bài đăng</th>
              <th>User</th>
              <th>Rating</th>
              <th>Nội dung</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  {r.post?.title ? (
                    <>
                      {r.post.title} <span style={{ opacity: 0.7 }}>#{r.post.id}</span>
                    </>
                  ) : (
                    <>#{r.post_id}</>
                  )}
                </td>
                <td>{r.user?.name || r.user_id}</td>
                <td>{r.rating}/5</td>
                <td>{r.content}</td>
                <td>{new Date(r.created_at).toLocaleString('vi-VN')}</td>
              </tr>
            ))}
            {!loading && !items.length && (
              <tr>
                <td colSpan="6">Chưa có đánh giá nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

