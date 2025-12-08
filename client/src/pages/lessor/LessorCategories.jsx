// src/pages/lessor/LessorCategories.jsx
import { useEffect, useState } from 'react'

export default function LessorCategories() {
  //  STATE 
  const [items, setItems] = useState([])        // danh sách categories từ API
  const [q, setQ] = useState('')               // từ khoá tìm kiếm
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)  // hiển thị modal
  const [editingItem, setEditingItem] = useState(null)  // item đang sửa (null = thêm mới)
  const [formData, setFormData] = useState({ name: '', slug: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  //  LOAD DANH MỤC TỪ API 
  useEffect(() => {
    const controller = new AbortController()

    async function fetchCategories() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams()
        if (q.trim()) params.append('q', q.trim())

        /**
         * API #1 – Lấy danh sách categories
         * Lessor có thể xem danh sách categories
         */
        const token = localStorage.getItem('access_token')
        const res = await fetch(
          `/api/lessor/categories?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        )

        const text = await res.text()
        let json
        try {
          json = JSON.parse(text)
        } catch {
          // trường hợp backend đang trả HTML (404, trang login, lỗi PHP...)
          throw new Error("Response không phải JSON hợp lệ (backend chưa trả JSON).")
        }

        if (!res.ok) {
          throw new Error(json?.message || 'Không tải được danh sách danh mục')
        }

        const list = json.data || json
        setItems(Array.isArray(list) ? list : [])
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error(err)
        setError(err.message || 'Có lỗi khi tải danh mục')
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
    return () => controller.abort()
  }, [q])

  //  MỞ MODAL THÊM/SỬA 
  const handleOpenModal = (item = null) => {
    setEditingItem(item)
    setFormData({
      name: item?.name || '',
      slug: item?.slug || '',
    })
    setFormError('')
    setShowModal(true)
  }

  //  ĐÓNG MODAL 
  const handleCloseModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormData({ name: '', slug: '' })
    setFormError('')
  }

  //  XỬ LÝ THAY ĐỔI FORM 
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  //  TẠO/SỬA DANH MỤC 
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Bạn chưa đăng nhập.')
      }

      const url = editingItem
        ? `/api/categories/${editingItem.id}`
        : '/api/categories'
      const method = editingItem ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug || undefined,
        }),
      })

      const text = await res.text()
      let json = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch {
        throw new Error('Response không phải JSON hợp lệ.')
      }

      if (!res.ok) {
        throw new Error(json?.message || 'Có lỗi khi lưu danh mục')
      }

      // Đóng modal và reload danh sách
      handleCloseModal()
      // Trigger reload bằng cách thay đổi q
      setQ((prev) => prev + ' ')
      setTimeout(() => setQ((prev) => prev.trim()), 100)
    } catch (err) {
      console.error(err)
      setFormError(err.message || 'Có lỗi khi lưu danh mục')
    } finally {
      setFormLoading(false)
    }
  }

  //  XOÁ 1 DANH MỤC 
  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn chắc chắn muốn xoá danh mục #${id}?`)) return

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Bạn chưa đăng nhập.')
        return
      }

      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const text = await res.text()
      let json = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch {
        // nếu backend trả 204 No Content thì không sao, bỏ qua parse
      }

      if (!res.ok) {
        throw new Error(json?.message || 'Không xoá được danh mục')
      }

      // xoá khỏi state ở FE
      setItems((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error(err)
      alert(err.message || 'Có lỗi khi xoá danh mục')
    }
  }

  return (
    <section className="lessor-page">
      {/* PHẦN HEADER TRANG */}
      <header className="lessor-page__head">
        <div>
          <h1 className="lessor-page__title">Danh mục bài đăng</h1>
          <p className="lessor-page__desc">
            Xem danh sách danh mục có sẵn trong hệ thống.
          </p>
        </div>

        <button
          type="button"
          className="lessor-btn lessor-btn--primary"
          onClick={() => handleOpenModal()}
        >
          + Thêm danh mục
        </button>
      </header>

      {/* CARD CHÍNH */}
      <div className="lessor-section--card">
        {/* Thanh search */}
        <div className="lessor-toolbar">
          <div className="lessor-input-wrap lessor-input-wrap--search">
            <span className="lessor-input__icon">🔍</span>
            <input
              className="lessor-input lessor-input--search"
              placeholder="Tìm theo tên danh mục..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Thông báo lỗi / loading */}
        {error && <p className="lessor-error">{error}</p>}
        {loading && <p className="lessor-loading">Đang tải danh mục…</p>}

        {/* Bảng dữ liệu */}
        <div className="lessor-card-table">
          <table className="lessor-table lessor-table--compact">
            <thead>
              <tr>
                <th>ID</th>
                <th>Slug</th>
                <th>Tên</th>
                <th>Số bài đăng</th>
                <th style={{ width: 150 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {/* Nếu không có data */}
              {items.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={5} className="lessor-empty">
                    Chưa có danh mục nào hoặc không tìm thấy kết quả.
                  </td>
                </tr>
              )}

              {/* Data thật từ API */}
              {items.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.id}</td>
                  <td>{cat.slug}</td>
                  <td>{cat.name}</td>
                  <td>{cat.posts_count ?? 0}</td>
                  <td className="lessor-td-actions">
                    <button
                      type="button"
                      className="lessor-chip lessor-chip--ghost"
                      onClick={() => handleOpenModal(cat)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="lessor-chip lessor-chip--danger"
                      onClick={() => handleDelete(cat.id)}
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL THÊM/SỬA DANH MỤC */}
      {showModal && (
        <div
          className="lessor-modal-overlay"
          onClick={(e) => {
            if (e.target.classList.contains('lessor-modal-overlay')) {
              handleCloseModal()
            }
          }}
        >
          <div className="lessor-modal">
            <div className="lessor-modal__header">
              <h3>{editingItem ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h3>
              <button
                type="button"
                className="lessor-modal__close"
                onClick={handleCloseModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="lessor-modal__body">
              {formError && (
                <p className="lessor-error" style={{ marginBottom: '1rem' }}>
                  {formError}
                </p>
              )}

              <div className="lessor-field">
                <label className="lessor-label">
                  Tên danh mục <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="lessor-input"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Ví dụ: Phòng trọ"
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="lessor-field">
                <label className="lessor-label">Slug (tùy chọn)</label>
                <input
                  type="text"
                  className="lessor-input"
                  name="slug"
                  value={formData.slug}
                  onChange={handleFormChange}
                  placeholder="Ví dụ: phong-tro (để trống sẽ tự tạo từ tên)"
                  disabled={formLoading}
                />
                <small style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  Slug sẽ được tự động tạo từ tên nếu để trống
                </small>
              </div>

              <div className="lessor-modal__footer">
                <button
                  type="button"
                  className="lessor-btn lessor-btn--ghost"
                  onClick={handleCloseModal}
                  disabled={formLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="lessor-btn lessor-btn--primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Đang lưu...' : editingItem ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

