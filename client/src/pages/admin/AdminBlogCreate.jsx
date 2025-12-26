// src/pages/admin/AdminBlogCreate.jsx
import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '@/assets/style/pages/admin.css'

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api'

async function safeJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.warn('Phản hồi không phải JSON:', res.url, text.slice(0, 120))
    return null
  }
}

export default function AdminBlogCreate() {
  const navigate = useNavigate()
  const token = localStorage.getItem('access_token')

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')

  // ==== ẢNH BÌA: CHO PHÉP 1–3 ẢNH ====
  const [coverFiles, setCoverFiles] = useState([])        // mảng File
  const [coverPreviews, setCoverPreviews] = useState([])  // mảng URL preview

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // tags + editor helpers
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const contentRef = useRef(null)
  const editorImageInputRef = useRef(null)
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false)

  const fileInputRef = useRef(null)

  const handleFileChange = e => {
    const files = Array.from(e.target.files || []).slice(0, 3) // tối đa 3
    setCoverFiles(files)

    const previews = files.map(file => URL.createObjectURL(file))
    setCoverPreviews(previews)
  }

  // Insert HTML text (eg. <img/>) at textarea cursor position
  const insertAtCursor = (text) => {
    const ta = contentRef.current
    if (!ta) {
      setContent(prev => prev + text)
      return
    }

    const start = ta.selectionStart || 0
    const end = ta.selectionEnd || 0
    const before = content.slice(0, start)
    const after = content.slice(end)
    const newVal = before + text + after
    setContent(newVal)

    setTimeout(() => {
      try {
        ta.focus()
        const pos = start + text.length
        ta.selectionStart = ta.selectionEnd = pos
      } catch (e) {}
    }, 10)
  }

  const handleEditorImageFile = async (file) => {
    try {
      setUploadingInlineImage(true)

      // Read as data URL so we can insert immediately without backend
      await new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => {
          const url = fr.result
          insertAtCursor(`<img src="${url}" alt="" />`)
          resolve()
        }
        fr.onerror = reject
        fr.readAsDataURL(file)
      })
    } catch (err) {
      console.error('Lỗi insert inline image', err)
      alert('Không thể chèn ảnh vào nội dung')
    } finally {
      setUploadingInlineImage(false)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề bài viết')
      return
    }
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung chính')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('title', title)
      formData.append('subtitle', subtitle)
      formData.append('content', content)
      // send tags as tags[] entries (avoid sending a JSON string which breaks Laravel 'array' validation)
      if (tags && tags.length > 0) tags.forEach(t => formData.append('tags[]', t))

      if (coverFiles.length > 0) {
        // Ảnh đầu tiên làm cover chính
        formData.append('cover', coverFiles[0])

        // Nếu BE muốn nhận thêm gallery:
        // coverFiles.slice(1).forEach(file => {
        //   formData.append('images[]', file)
        // })
      }

      const res = await fetch(`${API_BASE_URL}/admin/blogs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      })

      const data = await safeJson(res)

      if (!res.ok || data?.status === false) {
        throw new Error(data?.message || 'Không tạo được bài blog')
      }

      setSuccess('Tạo bài blog thành công!')
      setTimeout(() => {
        navigate('/admin/blog-list') // đổi path cho đúng route list blog
      }, 800)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi xảy ra khi lưu bài viết')
    } finally {
      setLoading(false)
    }
  }

  // Tên file hiển thị bên cạnh nút
  const fileNamesText =
    coverFiles.length === 0
      ? 'Chưa chọn ảnh nào '
      : coverFiles.map(f => f.name).join(', ')

  return (
    <div className="admin-page-inner">
      <div className="admin-section__head">
        <div>
          <h2>Viết bài blog mới</h2>
          <p>Tạo bài viết chia sẻ kinh nghiệm, hướng dẫn cho người thuê trọ.</p>
        </div>
        <Link to="/admin/blog-list" className="admin-btn admin-btn--ghost">
          ← Quay lại danh sách blog
        </Link>
      </div>

      <div className="admin-card admin-blog-create">
        {error && (
          <p className="admin-error" style={{ marginBottom: 12 }}>
            {error}
          </p>
        )}
        {success && (
          <p className="admin-success" style={{ marginBottom: 12 }}>
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="admin-blog-form">
          {/* Cột trái: thông tin chính */}
          <div className="admin-blog-form__left">
            <label className="admin-field">
              <span>Tiêu đề chính *</span>
              <input
                className="admin-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Kinh nghiệm thực tế khi đi xem trọ lần đầu"
              />
            </label>

            {/* <label className="admin-field">
              <span>Tiêu đề phụ / mô tả ngắn</span>
              <textarea
                className="admin-input"
                rows={3}
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Chuẩn bị những gì trước khi đi xem phòng, nên hỏi chủ nhà câu gì..."
              />
            </label> */}

            <label className="admin-field gf-field-card">
              {/* <span>Tags bài viết</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tags.map((t, i) => (
                    <span key={i} style={{ padding: '4px 8px', background: 'rgba(148,163,184,0.08)', borderRadius: 16, fontSize: 13 }}>
                      {t} <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} style={{ marginLeft: 6, background: 'transparent', border: 0, color: '#fb7185', cursor: 'pointer' }}>✕</button>
                    </span>
                  ))}
                </div>
                <input
                  className="admin-input"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const t = tagInput.trim().replace(/,$/, '')
                      if (t && !tags.includes(t)) setTags(prev => [...prev, t])
                      setTagInput('')
                    }
                  }}
                  placeholder="Thêm tag và nhấn Enter"
                  style={{ minWidth: 160 }}
                />
              </div> */}

              <span style={{ display: 'block', marginTop: 12 }}>Nội dung bài viết *</span>

              <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--outline"
                  style={{ color: '#ffff' }}                  
                  onClick={() => editorImageInputRef.current?.click()}
                >
                  Chèn ảnh vào nội dung
                </button>
                {uploadingInlineImage && <span style={{fontSize: 13}}>Đang tải ảnh…</span>}
              </div>

              <textarea
                ref={contentRef}
                className="admin-input"
                rows={10}
                value={content}
                onChange={e => setContent(e.target.value)}
                onDrop={(e) => { e.preventDefault(); const files = e.dataTransfer?.files; if (files && files.length) handleEditorImageFile(files[0]) }}
                onPaste={(e) => { const files = e.clipboardData?.files; if (files && files.length) { handleEditorImageFile(files[0]) } }}
                placeholder="Nhập nội dung chi tiết, có thể chèn ảnh bằng kéo/thả, dán hoặc nút Chèn ảnh..."
                style={{ fontFamily: 'inherit', height: '100%' }}
              />

              <input
                ref={editorImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEditorImageFile(f); e.target.value = '' }}
              />
            </label>
          </div>

          {/* Cột phải: ảnh bìa + nút đăng */}
          <div className="admin-blog-form__right">
            <label className="admin-field">
              <span>Ảnh bìa *</span>

              <div className="admin-upload">
                <button
                  type="button"
                  className="admin-btn admin-btn--outline"
                  style={{ color: '#ffff' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Chọn ảnh bìa
                </button>
                <span className="admin-upload__hint">{fileNamesText}</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="admin-upload__input"
                onChange={handleFileChange}
              />

              {coverPreviews.length > 0 && (
                <div className="admin-blog-cover-preview-multi">
                  {coverPreviews.map((src, idx) => (
                    <div key={idx} className="admin-blog-cover-thumb">
                      <img src={src} alt={`Cover preview ${idx + 1}`} />
                      <div className="admin-blog-cover-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger"
                          onClick={() => handleRemoveCover(idx)}
                          disabled={loading}
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="admin-form__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => navigate('/admin/blog-list')}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={loading}
                >
                  {loading ? 'Đang lưu...' : 'Đăng bài blog'}
                </button>
              </div>
            </label>
          </div>
        </form>
      </div>
    </div>
  )
}
