// src/pages/admin/AdminBlogEdit.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
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

export default function AdminBlogEdit() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')

  // tags + editor helpers
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const contentRef = useRef(null)
  const editorImageInputRef = useRef(null)
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false)

  const [existingCover, setExistingCover] = useState(null)
  const [coverFiles, setCoverFiles] = useState([])
  const [coverPreviews, setCoverPreviews] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fileInputRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const token = localStorage.getItem('access_token')

        // 1) Try direct GET by id (some APIs accept id, some use slug)
        let res = await fetch(`${API_BASE_URL}/blogs/${id}`, {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        let data = await safeJson(res)

        // 2) If 404, try searching by q (fallback for slug/searchable endpoints)
        if (!res.ok && res.status === 404) {
          const sres = await fetch(
            `${API_BASE_URL}/blogs?q=${encodeURIComponent(id)}`,
            {
              headers: {
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            },
          )

          const sdata = await safeJson(sres)
          const list = sdata?.data || sdata || []

          if (Array.isArray(list) && list.length > 0) {
            const b = list[0]
            setTitle(b.title || '')
            setSubtitle(b.subtitle || '')
            setContent(b.content || '')
            setExistingCover(b.cover_url || b.cover || null)
            return
          }

          throw new Error('Không tìm thấy bài viết (ID/slug không hợp lệ hoặc đã bị xóa).')
        }

        if (!res.ok) {
          throw new Error(data?.message || 'Không tải được bài blog')
        }

        const b = data.data || data
        setTitle(b.title || '')
        setSubtitle(b.subtitle || '')
        setContent(b.content || '')
        setTags(b.tags || b.tag_list || [])
        // cover URL, tên trường có thể khác => thử một vài tên
        setExistingCover(b.cover_url || b.cover || null)
      } catch (err) {
        console.error(err)
        setError(err.message || 'Có lỗi khi tải bài blog')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const handleFileChange = e => {
    const files = Array.from(e.target.files || []).slice(0, 3)
    setCoverFiles(files)
    const previews = files.map(f => URL.createObjectURL(f))
    setCoverPreviews(previews)
  }

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
      try { ta.focus(); const pos = start + text.length; ta.selectionStart = ta.selectionEnd = pos } catch(e){}
    }, 10)
  }

  // Kho chứa ảnh tạm: Key là link ngắn, Value là dữ liệu thật
  const tempImageMap = useRef({}) 

    // Hàm nén ảnh (giữ nguyên để giảm dung lượng)
    const compressImage = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; // Giới hạn chiều rộng
            let w = img.width;
            let h = img.height;
            if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          }
        }
      })
    }

    const handleEditorImageFile = async (file) => {
        try {
          setUploadingInlineImage(true)
          
          // 1. Tạo dữ liệu ảnh thật (đã nén) để dành gửi server
          const realBase64 = await compressImage(file)

          // 2. Tạo link ảo siêu ngắn để hiển thị trong editor
          const shortBlobUrl = URL.createObjectURL(file)

          // 3. Lưu cặp đôi này vào kho chứa
          tempImageMap.current[shortBlobUrl] = realBase64

          // 4. Chèn link ảo vào ô text (Code lúc này chỉ có 1 dòng!)
          const imgTag = `\n<img src="${shortBlobUrl}" width="100%" />\n`
          insertAtCursor(imgTag)

        } catch (err) {
          console.error(err)
          alert('Lỗi chèn ảnh')
        } finally { 
          setUploadingInlineImage(false) 
        }
      }
  
  // Xóa ảnh bìa hiện có
  const handleRemoveCover = async () => {
    if (!window.confirm('Xác nhận xóa ảnh bìa hiện tại?')) return

    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('Bạn chưa đăng nhập')

      const formData = new FormData()
      formData.append('_method', 'PUT')
      formData.append('remove_cover', '1')

      const res = await fetch(`${API_BASE_URL}/admin/blogs/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      })

      const data = await safeJson(res)
      if (!res.ok || data?.status === false) {
        throw new Error(data?.message || 'Không xóa được ảnh bìa')
      }

      setExistingCover(null)
      setSuccess('Ảnh bìa đã được xóa')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi khi xóa ảnh bìa')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('Bạn chưa đăng nhập')

      let finalContent = content
      Object.entries(tempImageMap.current).forEach(([blobUrl, realBase64]) => {
        // Thay thế tất cả link ảo bằng link thật
        finalContent = finalContent.split(blobUrl).join(realBase64)
      })

      const formData = new FormData()
      formData.append('title', title)
      formData.append('subtitle', subtitle)
      formData.append('content', finalContent)
      // send tags as tags[] entries (avoid sending a JSON string which breaks Laravel 'array' validation)
      if (tags && tags.length > 0) tags.forEach(t => formData.append('tags[]', t))

      // Nếu upload cover mới
      if (coverFiles.length > 0) {
        formData.append('cover', coverFiles[0])
      }

      // Laravel-style method override for file uploads
      formData.append('_method', 'PUT')

      const res = await fetch(`${API_BASE_URL}/admin/blogs/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      })

      const data = await safeJson(res)
      if (!res.ok || data?.status === false) {
        if (res.status === 422 && data?.errors) {
          const first = Object.values(data.errors)[0]?.[0] || 'Dữ liệu không hợp lệ.'
          throw new Error(first)
        }
        throw new Error(data?.message || 'Không cập nhật được bài viết')
      }

      setSuccess('Cập nhật thành công')
      setTimeout(() => navigate('/admin/blog-list'), 800)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page-inner">
      <div className="admin-section__head">
        <div>
          <h2>Sửa bài blog #{id}</h2>
          <p>Chỉnh sửa nội dung, ảnh bìa cho bài blog.</p>
        </div>
        <Link to="/admin/blog-list" className="admin-btn admin-btn--ghost">
          ← Quay lại danh sách blog
        </Link>
      </div>

      {loading && <p>Đang tải dữ liệu…</p>}
      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}

      {!loading && (
        <div className="admin-card admin-blog-create">
          <form onSubmit={handleSubmit} className="admin-blog-form">
            <div className="admin-blog-form__left">
              <label className="admin-field">
                <span>Tiêu đề *</span>
                <input
                  className="admin-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ghi tiêu đề bài blog..."
                />
              </label>

              {/* <label className="admin-field">
                <span>Tiêu đề phụ / mô tả ngắn</span>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={subtitle}
                  onChange={e => setSubtitle(e.target.value)}
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

                <span style={{ display: 'block', marginTop: 12 }}>Nội dung *</span>

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
                  style={{ fontFamily: 'inherit', height: '100%' }}
                  placeholder="Nhập nội dung chi tiết, có thể chèn ảnh bằng kéo/thả, dán hoặc nút Chèn ảnh..."
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

            <div className="admin-blog-form__right">
              <label className="admin-field">
                <span>Ảnh bìa * (thay nếu muốn)</span>

                <div className="admin-upload">
                  <button
                    type="button"
                    className="admin-btn admin-btn--outline"
                    style={{ color: '#ffff' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Chọn ảnh bìa
                  </button>
                  <span className="admin-upload__hint">
                    {coverFiles.length === 0 ? (existingCover ? 'Sử dụng ảnh hiện có' : 'Chưa chọn ảnh. muốn thay đổi hãy thay ảnh mới') : coverFiles.map(f => f.name).join(', ')}
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="admin-upload__input"
                  onChange={handleFileChange}
                />

                {existingCover && coverFiles.length === 0 && (
                  <div className="admin-blog-cover-preview">
                    <img src={existingCover} alt="Existing cover" />
                    <div className="admin-blog-cover-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        onClick={handleRemoveCover}
                        disabled={saving}
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                )}

                {coverPreviews.length > 0 && (
                  <div className="admin-blog-cover-preview-multi">
                    {coverPreviews.map((src, idx) => (
                      <div key={idx} className="admin-blog-cover-thumb">
                        <img src={src} alt={`Cover preview ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </label>

              <div className="admin-form__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => navigate('/admin/blog-list')}
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
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
