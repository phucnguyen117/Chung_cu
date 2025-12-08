// src/pages/lessor/LessorPosts.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LessorPosts() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  // LẤY DANH SÁCH BÀI ĐĂNG TỪ API /api/posts?my_posts=1
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

        const res = await fetch('/api/posts?my_posts=1', {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        const text = await res.text()
        let data
        try {
          data = JSON.parse(text)
        } catch {
          console.error('RESP TEXT:', text)
          throw new Error('Máy chủ trả về dữ liệu không hợp lệ.')
        }

        if (!res.ok || data.status === false) {
          throw new Error(data.message || 'Không tải được danh sách bài đăng.')
        }

        setItems(data.data || [])
      } catch (err) {
        console.error(err)
        setError(err.message || 'Có lỗi xảy ra')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // XÓA BÀI: DELETE /api/posts/:id
  const handleDelete = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài này?')) return

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Bạn chưa đăng nhập.')
        return
      }

      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error('RESP TEXT:', text)
        throw new Error('Máy chủ trả về dữ liệu không hợp lệ.')
      }

      if (!res.ok || data.status === false) {
        throw new Error(data.message || 'Không xóa được bài đăng.')
      }

      setItems((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error(err)
      alert(err.message || 'Có lỗi khi xóa bài')
    }
  }

  const formatPrice = (value) => {
    if (value == null) return '-'
    const num = Number(value)
    if (Number.isNaN(num)) return value
    return num.toLocaleString('vi-VN')
  }

  const formatDate = (d) => {
    if (!d) return '-'
    try {
      return new Date(d).toLocaleString('vi-VN')
    } catch {
      return d
    }
  }

  return (
    <section className="lessor-page">
      <header className="lessor-page__head">
        <div>
          <h2 className="lessor-page__title">Quản lý bài đăng</h2>
          <p className="lessor-page__desc">
            Quản lý các bài đăng của bạn.
          </p>
        </div>

        <button
          type="button"
          className="lessor-btn lessor-btn--primary"
          onClick={() => navigate('/lessor/posts/create')}
        >
          + Đăng bài mới
        </button>
      </header>

      {loading && <p>Đang tải...</p>}
      {error && <p style={{ color: '#fecaca' }}>{error}</p>}

      <div className="lessor-card" style={{ marginTop: 10 }}>
        <table className="lessor-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tiêu đề</th>
              <th>Danh mục</th>
              <th>Giá (VNĐ/tháng)</th>
              <th>Trạng thái</th>
              <th>Ngày đăng</th>
              <th style={{ width: 220 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  <Link to={`/post/${p.id}`} target="_blank" rel="noreferrer">
                    {p.title}
                  </Link>
                </td>
                <td>{p.category?.name || '-'}</td>
                <td>{formatPrice(p.price)}</td>
                <td>{p.status}</td>
                <td>{formatDate(p.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* Sửa: sau này làm trang edit */}
                    <button
                      type="button"
                      className="lessor-btn lessor-btn--sm"
                      onClick={() => navigate(`/lessor/posts/${p.id}/edit`)}
                    >
                      Sửa
                    </button>

                    {/* Xóa */}
                    <button
                      type="button"
                      className="lessor-btn lessor-btn--sm lessor-btn--danger"
                      onClick={() => handleDelete(p.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && !items.length && (
              <tr>
                <td colSpan="7" className="lessor-empty">Chưa có bài đăng nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

