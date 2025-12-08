// src/pages/lessor/LessorPostCreate.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LessorPostCreate() {
  const navigate = useNavigate()

  // OPTIONS TỪ BACKEND
  const [categories, setCategories] = useState([])
  const [amenities, setAmenities] = useState([])
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [wards, setWards] = useState([])

  // FORM STATE CHÍNH
  const [form, setForm] = useState({
    title: '',
    category_id: '',
    price: '',
    area: '',
    address: '',
    province_id: '',
    district_id: '',
    ward_id: '',
    status: 'draft', // draft | published
    content: '',
  })

  const [selectedAmenities, setSelectedAmenities] = useState([])      // [id,...]

  const [images, setImages] = useState([])              // File[]
  const [imagePreviews, setImagePreviews] = useState([]) // URL[]

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // LOAD OPTIONS BAN ĐẦU
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true)
        setError('')

        const [catRes, ameRes, provRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/amenities'),
          fetch('/api/provinces'),
        ])

        const [catJson, ameJson, provJson] = await Promise.all([
          catRes.json(),
          ameRes.json(),
          provRes.json(),
        ])

        setCategories(catJson.data || catJson || [])
        setAmenities(ameJson.data || ameJson || [])
        setProvinces(provJson.data || provJson || [])
      } catch (err) {
        console.error(err)
        setError('Không tải được dữ liệu danh mục/tiện ích/địa lý.')
      } finally {
        setLoading(false)
      }
    }

    loadInitial()
  }, [])

  // KHI CHỌN PROVINCE -> LOAD DISTRICT
  useEffect(() => {
    const provinceId = form.province_id
    if (!provinceId) {
      setDistricts([])
      setWards([])
      setForm(f => ({ ...f, district_id: '', ward_id: '' }))
      return
    }

    async function loadDistricts() {
      try {
        const res = await fetch(`/api/districts?province_id=${provinceId}`)
        const json = await res.json()
        setDistricts(json.data || json || [])
        setWards([])
        setForm(f => ({ ...f, district_id: '', ward_id: '' }))
      } catch (err) {
        console.error(err)
      }
    }

    loadDistricts()
  }, [form.province_id])

  // KHI CHỌN DISTRICT -> LOAD WARD
  useEffect(() => {
    const districtId = form.district_id
    if (!districtId) {
      setWards([])
      setForm(f => ({ ...f, ward_id: '' }))
      return
    }

    async function loadWards() {
      try {
        const res = await fetch(`/api/wards?district_id=${districtId}`)
        const json = await res.json()
        setWards(json.data || json || [])
        setForm(f => ({ ...f, ward_id: '' }))
      } catch (err) {
        console.error(err)
      }
    }

    loadWards()
  }, [form.district_id])

  // HANDLERS
  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const toggleAmenity = id => {
    setSelectedAmenities(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }


  // --- Cho phép chọn cộng dồn ảnh ---
  const handleImagesChange = e => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Tạo preview URL
    const newPreviews = files.map(f => URL.createObjectURL(f))

    // Cộng dồn vào state cũ
    setImages(prev => [...prev, ...files])
    setImagePreviews(prev => [...prev, ...newPreviews])
    
    e.target.value = ''
  }

  // --- Xóa ảnh khỏi danh sách chờ upload ---
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    
    // Xóa URL preview để tránh leak memory
    URL.revokeObjectURL(imagePreviews[index])
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Cleanup memory khi component unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  // SUBMIT TẠO BÀI
  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.title.trim()) {
      setError('Vui lòng nhập tiêu đề bài đăng.')
      return
    }
    if (!form.category_id) {
      setError('Vui lòng chọn danh mục.')
      return
    }
    if (!form.price) {
      setError('Vui lòng nhập giá thuê.')
      return
    }
    if (!form.area) {
      setError('Vui lòng nhập diện tích.')
      return
    }
    if (!form.province_id || !form.district_id || !form.ward_id) {
      setError('Vui lòng chọn đầy đủ Tỉnh / Quận / Phường.')
      return
    }

    try {
      setSaving(true)

      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Bạn chưa đăng nhập.')
      }

      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('category_id', form.category_id)
      fd.append('price', form.price)
      fd.append('area', form.area)
      fd.append('address', form.address)
      fd.append('province_id', form.province_id)
      fd.append('district_id', form.district_id)
      fd.append('ward_id', form.ward_id)
      fd.append('status', form.status) // draft | published
      fd.append('content', form.content)

      // mảng tiện ích -> amenities[0], amenities[1] ...
      selectedAmenities.forEach((id, index) => {
        fd.append(`amenities[${index}]`, id)
      })

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          // KHÔNG set Content-Type vì đang gửi FormData
        },
        body: fd,
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Máy chủ trả về dữ liệu không hợp lệ.')
      }

      if (!res.ok || data.status === false) {
        // Ưu tiên lỗi validate 422
        if (res.status === 422 && data.errors) {
          const firstError =
            Object.values(data.errors)[0]?.[0] || 'Lỗi xác thực dữ liệu.'
          throw new Error(firstError)
        }

        if (res.status === 401) {
          throw new Error('Bạn chưa đăng nhập hoặc phiên đã hết hạn.')
        }

        if (res.status === 403) {
          throw new Error('Bạn không có quyền đăng bài.')
        }

        throw new Error(data.message || 'Không tạo được bài đăng.')
      }

      const newPostId = data.data.id // Lấy ID bài viết vừa tạo

      // UPLOAD ẢNH (Gửi từng ảnh lên API riêng)
      if (images.length > 0) {
        const uploadPromises = images.map((file, index) => {
          const imgFd = new FormData()
          // Key đúng theo Controller là 'image' (số ít)
          imgFd.append('image', file) 
          imgFd.append('sort_order', index)

          return fetch(`/api/posts/${newPostId}/images`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            body: imgFd
          })
        })

        await Promise.all(uploadPromises)
      }

      setSuccess('Tạo bài đăng thành công!')
      setTimeout(() => {
        navigate('/lessor/posts')
      }, 1200)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi khi tạo bài đăng.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="lessor-page">
      <header className="lessor-page__head">
        <div>
          <h1 className="lessor-page__title">Đăng bài cho thuê mới</h1>
          <p className="lessor-page__desc">
            Tạo bản ghi mới cho bảng <code>posts</code> và liên kết tới{' '}
            <code>post_images</code>, <code>amenity_post</code>,{' '}
địa lý{' '}
            <code>provinces/districts/wards</code>.
          </p>
        </div>
      </header>

      <div className="lessor-section--card">
        {loading && <p className="lessor-loading">Đang tải dữ liệu chọn...</p>}
        {error && <p className="lessor-error">{error}</p>}
        {success && <p className="lessor-success">{success}</p>}

        <form className="lessor-form" onSubmit={handleSubmit}>
          {/* HÀNG 1: tiêu đề + danh mục */}
          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <label className="lessor-label">
                Tiêu đề bài đăng
                <input
                  className="lessor-input"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="VD: Phòng trọ full nội thất gần ĐH Bách Khoa"
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
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* HÀNG 2: giá + diện tích + trạng thái */}
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

          {/* HÀNG 3: địa chỉ + địa lý */}
          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <label className="lessor-label">
                Địa chỉ cụ thể
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

          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <label className="lessor-label">
                Tỉnh / Thành
                <select
                  className="lessor-input"
                  name="province_id"
                  value={form.province_id}
                  onChange={handleChange}
                >
                  <option value="">-- Chọn tỉnh/thành --</option>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="lessor-form__col">
              <label className="lessor-label">
                Quận / Huyện
                <select
                  className="lessor-input"
                  name="district_id"
                  value={form.district_id}
                  onChange={handleChange}
                  disabled={!districts.length}
                >
                  <option value="">-- Chọn quận/huyện --</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="lessor-form__col">
              <label className="lessor-label">
                Phường / Xã
                <select
                  className="lessor-input"
                  name="ward_id"
                  value={form.ward_id}
                  onChange={handleChange}
                  disabled={!wards.length}
                >
                  <option value="">-- Chọn phường/xã --</option>
                  {wards.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* MÔ TẢ */}
          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <label className="lessor-label">
                Mô tả chi tiết
                <textarea
                  className="lessor-input lessor-input--textarea"
                  name="content"
                  rows={6}
                  value={form.content}
                  onChange={handleChange}
                  placeholder="Mô tả nội thất, quy định, tiện nghi, đối tượng cho thuê..."
                />
              </label>
            </div>
          </div>

          {/* TIỆN ÍCH */}
          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <h3 className="lessor-subtitle">Tiện ích trong phòng</h3>
              <div className="lessor-chip-list">
                {amenities.map(a => (
                  <label key={a.id} className="lessor-chip-input">
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(a.id)}
                      onChange={() => toggleAmenity(a.id)}
                    />
                    <span>{a.name}</span>
                  </label>
                ))}
                {amenities.length === 0 && (
                  <p className="lessor-note">
                    Chưa có tiện ích nào, hãy thêm ở mục Tiện ích.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ẢNH BÀI ĐĂNG */}
          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <h3 className="lessor-subtitle">Ảnh bài đăng</h3>
              <label className="lessor-upload">
                <span>Chọn nhiều ảnh (tối đa tuỳ bạn cấu hình)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                />
              </label>

              {imagePreviews.length > 0 && (
                <div className="lessor-upload-preview">
                  {imagePreviews.map((src, idx) => (
                    <div
                      key={idx}
                      className="lessor-upload-preview__item"
                    >
                      <img src={src} alt={`preview-${idx}`} />

                      {/* Nút Xóa Ảnh */}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          background: 'red',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* NÚT LƯU */}
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
              {saving ? 'Đang lưu...' : 'Đăng bài'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

