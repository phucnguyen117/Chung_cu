// src/pages/lessor/LessorPostEdit.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function LessorPostEdit() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    category_id: '',
    price: '',
    area: '',
    address: '',
    status: 'draft', // draft | published
  })

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // LOAD BÀI VIẾT + DANH MỤC
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')

        const token = localStorage.getItem('access_token')

        const [postRes, catRes] = await Promise.all([
          fetch(`/api/posts/${id}`, {
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }),
          fetch('/api/categories', {
            headers: { Accept: 'application/json' },
          }),
        ])

        // ----- parse post -----
        const postText = await postRes.text()
        let postJson
        try {
          postJson = JSON.parse(postText)
        } catch {
          console.error('POST RESP:', postText)
          throw new Error('Máy chủ trả về dữ liệu bài viết không hợp lệ.')
        }

        if (!postRes.ok || postJson.status === false) {
          throw new Error(postJson.message || 'Không tải được bài viết.')
        }

        const p = postJson.data
        setForm({
          title: p.title || '',
          category_id: p.category_id || '',
          price: p.price ?? '',
          area: p.area ?? '',
          address: p.address || '',
          status: p.status || 'draft',
        })

        // ----- parse categories -----
        const catText = await catRes.text()
        let catJson
        try {
          catJson = JSON.parse(catText)
        } catch {
          console.error('CATEGORIES RESP:', catText)
          throw new Error('Máy chủ trả về dữ liệu danh mục không hợp lệ.')
        }

        if (!catRes.ok || catJson.status === false) {
          throw new Error(catJson.message || 'Không tải được danh mục.')
        }

        setCategories(catJson.data || catJson || [])
      } catch (err) {
        console.error(err)
        setError(err.message || 'Có lỗi khi tải dữ liệu.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  // HANDLER
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.title.trim()) {
      setError('Vui lòng nhập tiêu đề.')
      return
    }

    if (!form.category_id) {
      setError('Vui lòng chọn danh mục.')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('Bạn chưa đăng nhập.')

      const res = await fetch(`/api/posts/${id}`, {
        method: 'PUT', // PostController@update
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: form.category_id || null,
          title: form.title,
          price: form.price !== '' ? Number(form.price) : null,
          area: form.area !== '' ? Number(form.area) : null,
          address: form.address,
          status: form.status,
        }),
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error('UPDATE RESP:', text)
        throw new Error('Máy chủ trả về dữ liệu không hợp lệ.')
      }

      if (!res.ok || data.status === false) {
        if (res.status === 422 && data.errors) {
          const firstError =
            Object.values(data.errors)[0]?.[0] || 'Dữ liệu không hợp lệ.'
          throw new Error(firstError)
        }
        throw new Error(data.message || 'Không cập nhật được bài viết.')
      }

      setSuccess('Cập nhật bài viết thành công.')
      setTimeout(() => {
        navigate('/lessor/posts')
      }, 1000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi khi cập nhật bài viết.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="lessor-page">
      <header className="lessor-page__head">
        <div>
          <h1 className="lessor-page__title">Sửa bài đăng #{id}</h1>
          <p className="lessor-page__desc">
            Chỉnh sửa nội dung, danh mục, giá, trạng thái bài viết.
          </p>
        </div>
      </header>

      {loading && <p>Đang tải dữ liệu...</p>}
      {error && <p className="lessor-error">{error}</p>}
      {success && <p className="lessor-success">{success}</p>}

      {!loading && (
        <div className="lessor-section--card">
          <form className="lessor-form" onSubmit={handleSubmit}>
            {/* Tiêu đề + danh mục */}
            <div className="lessor-form__row">
              <div className="lessor-form__col">
                <label className="lessor-label">
                  Tiêu đề
                  <input
                    className="lessor-input"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Tiêu đề bài đăng"
                  />
                </label>
              </div>
              <div className="lessor-form__col lessor-form__col--sm">
                <label className="lessor-label">
                  Danh mục
                  <select
                    className="lessor-input"
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Giá + diện tích + trạng thái */}
            <div className="lessor-form__row">
              <div className="lessor-form__col">
                <label className="lessor-label">
                  Giá thuê (VNĐ/tháng)
                  <input
                    type="number"
                    className="lessor-input"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                  />
                </label>
              </div>
              <div className="lessor-form__col">
                <label className="lessor-label">
                  Diện tích (m²)
                  <input
                    type="number"
                    className="lessor-input"
                    name="area"
                    value={form.area}
                    onChange={handleChange}
                    min="0"
                  />
                </label>
              </div>
              <div className="lessor-form__col lessor-form__col--sm">
                <label className="lessor-label">
                  Trạng thái
                  <select
                    className="lessor-input"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="draft">Nháp</option>
                    <option value="published">Đang cho thuê</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="lessor-form__row">
              <div className="lessor-form__col">
                <label className="lessor-label">
                  Địa chỉ
                  <input
                    className="lessor-input"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Số nhà, tên đường..."
                  />
                </label>
              </div>
            </div>

            {/* Nút */}
            <div className="lessor-form__actions">
              <button
                type="button"
                className="lessor-btn lessor-btn--ghost"
                onClick={() => navigate('/lessor/posts')}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="lessor-btn lessor-btn--primary"
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

