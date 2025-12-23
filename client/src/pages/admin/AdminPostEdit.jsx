// src/pages/admin/AdminPostEdit.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '@/config/api.js';

export default function AdminPostEdit() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    category_id: '',
    price: '',
    area: '',
    address: '',
    status: 'draft', // draft | published | hidden
    content: '',
  })

  const [categories, setCategories] = useState([])
  const [amenities, setAmenities] = useState([])
  const [envFeatures, setEnvFeatures] = useState([])

  const [selectedAmenities, setSelectedAmenities] = useState([])
  const [selectedEnvFeatures, setSelectedEnvFeatures] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ===== LOAD BÀI VIẾT + DANH MỤC =====
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')

        const token = localStorage.getItem('access_token')

        const [postRes, catRes, amenRes, envRes] = await Promise.all([
          fetch(`${API_URL}/posts/${id}`, {
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }),
          fetch(`${API_URL}/categories`, {
            headers: { Accept: 'application/json' },
          }),
          fetch(`${API_URL}/amenities`, { headers: { Accept: 'application/json' } }),
          fetch(`${API_URL}/environment-features`, { headers: { Accept: 'application/json' } }),
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
          content: p.content || '',
        })

      // set selected amenities / environment features based on the post data
      setSelectedAmenities((p.amenities && Array.isArray(p.amenities)) ? p.amenities.map(a => a.id) : [])
      // support both camelCase and snake_case responses
      const postEnv = p.environmentFeatures || p.environment_features || []
      setSelectedEnvFeatures(Array.isArray(postEnv) ? postEnv.map(e => e.id) : [])

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

      // ----- parse amenities -----
      const amenText = await amenRes.text()
      let amenJson
      try {
        amenJson = JSON.parse(amenText)
      } catch {
        console.error('AMENITIES RESP:', amenText)
        amenJson = { status: false, data: [] }
      }
      if (amenRes.ok && amenJson.status !== false) setAmenities(amenJson.data || amenJson || [])

      // ----- parse environment features -----
      const envText = await envRes.text()
      let envJson
      try {
        envJson = JSON.parse(envText)
      } catch {
        console.error('ENV RESP:', envText)
        envJson = { status: false, data: [] }
      }
      if (envRes.ok && envJson.status !== false) setEnvFeatures(envJson.data || envJson || [])
      } catch (err) {
        console.error(err)
        setError(err.message || 'Có lỗi khi tải dữ liệu.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  // ===== HANDLER =====
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const toggleAmenity = (id) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleEnvFeature = (id) => {
    setSelectedEnvFeatures((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
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

      const res = await fetch(`${API_URL}/posts/${id}`, {
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
          content: form.content,
          // include selected relations
          amenity_ids: selectedAmenities,
          environment_ids: selectedEnvFeatures,
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
        navigate('/admin/posts')
      }, 1000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi khi cập nhật bài viết.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Sửa bài đăng #{id}</h1>
          <p className="admin-page__desc">
            Chỉnh sửa nội dung, danh mục, giá, trạng thái bài viết.
          </p>
        </div>
      </header>

      {loading && <p>Đang tải dữ liệu...</p>}
      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}

      {!loading && (
        <div className="admin-section--card">
          <form className="admin-form" onSubmit={handleSubmit}>
            {/* Tiêu đề + danh mục */}
            <div className="admin-form__row">
              <div className="admin-form__col">
                <label className="admin-label">
                  Tiêu đề
                  <input
                    className="admin-input"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Tiêu đề bài đăng"
                  />
                </label>
              </div>
              <div className="admin-form__col admin-form__col--sm">
                <label className="admin-label">
                  Danh mục
                  <select
                    className="admin-input"
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
            <div className="admin-form__row">
              <div className="admin-form__col">
                <label className="admin-label">
                  Giá thuê (VNĐ/tháng)
                  <input
                    type="number"
                    className="admin-input"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                  />
                </label>
              </div>
              <div className="admin-form__col">
                <label className="admin-label">
                  Diện tích (m²)
                  <input
                    type="number"
                    className="admin-input"
                    name="area"
                    value={form.area}
                    onChange={handleChange}
                    min="0"
                  />
                </label>
              </div>
              <div className="admin-form__col admin-form__col--sm">
                <label className="admin-label">
                  Trạng thái
                  <select
                    className="admin-input"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="draft">Nháp</option>
                    <option value="published">Đang cho thuê</option>
                    <option value="hidden">Đã ẩn</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="admin-form__row">
              <div className="admin-form__col">
                <label className="admin-label">
                  Địa chỉ
                  <input
                    className="admin-input"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Số nhà, tên đường..."
                  />
                </label>
              </div>
            </div>

            {/* Nội dung */}
            <div className="admin-form__row">
              <div className="admin-form__col">
                <label className="admin-label">
                  Nội dung mô tả bài đăng
                  <textarea
                    className="admin-input"
                    style={{ minHeight: "140px" }}
                    name="content"
                    value={form.content}
                    onChange={handleChange}
                    placeholder="Mô tả chi tiết căn hộ..."
                  ></textarea>
                </label>
              </div>
            </div>

            {/* Tiện ích + Môi trường xung quanh */}
            <div className="admin-form__row">
              <div className="admin-form__col">
                <div className="admin-label">Tiện ích</div>
                <div className="admin-checkbox-list">
                  {amenities.length === 0 && <p>Không có tiện ích.</p>}
                  {amenities.map((a) => (
                    <label key={a.id} className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(a.id)}
                        onChange={() => toggleAmenity(a.id)}
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="admin-form__col">
                <div className="admin-label">Môi trường xung quanh</div>
                <div className="admin-checkbox-list">
                  {envFeatures.length === 0 && <p>Không có môi trường.</p>}
                  {envFeatures.map((e) => (
                    <label key={e.id} className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedEnvFeatures.includes(e.id)}
                        onChange={() => toggleEnvFeature(e.id)}
                      />
                      {e.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Nút */}
            <div className="admin-form__actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => navigate('/admin/posts')}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="admin-btn admin-btn--primary"
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
