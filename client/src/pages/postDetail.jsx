// src/pages/PostDetail.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import '../assets/style/pages/post-detail.css'

// DÙNG CHUNG CHO MỌI ẢNH: string, CloudinaryFile, PostImage + file
function normalizeImageUrl(source) {
  if (!source) return ''
  if (typeof source === 'string') return source

  if (source.full_url) return source.full_url
  if (source.fullUrl) return source.fullUrl

  if (source.url) return source.url
  if (source.secure_url) return source.secure_url

  if (source.file) {
    if (source.file.url) return source.file.url
    if (source.file.secure_url) return source.file.secure_url
  }

  if (source.image_url) return source.image_url
  if (source.path) return source.path

  return ''
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

/** ====== LOCAL WISHLIST HELPERS (dùng chung với các trang khác) ====== */
function getWishlistIds() {
  try {
    const raw = localStorage.getItem('wishlist_posts')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(v => Number(v))
      .filter(v => !Number.isNaN(v))
  } catch (e) {
    console.error('parse wishlist_posts error', e)
    return []
  }
}

function saveWishlistIds(ids) {
  localStorage.setItem('wishlist_posts', JSON.stringify(ids))
  // để header / icon tim các nơi khác biết thay đổi
  window.dispatchEvent(new Event('wishlist:changed'))
}

export default function PostDetail() {
  const { id } = useParams()

  const [post, setPost] = useState(null)
  const [postImages, setPostImages] = useState([]) // ẢNH LẤY TỪ /posts/{id}/images

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // form đánh giá
  const [ratingInput, setRatingInput] = useState(5)
  const [contentInput, setContentInput] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [reviewError, setReviewError] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // hiển thị SĐT khi hover nút gọi
  const [showPhone, setShowPhone] = useState(false)

  // phân trang review (3 cái / trang)
  const [reviewPage, setReviewPage] = useState(1)
  const REVIEWS_PER_PAGE = 3

  // trạng thái yêu thích
  const [isFavorite, setIsFavorite] = useState(false)

  // ===== GALLERY MODAL STATE =====
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = fit, 2 = 2x zoom

  // ===== LOAD CHI TIẾT BÀI =====
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')

        const res = await fetch(`${API_BASE_URL}/posts/${id}`)

        if (!res.ok) throw new Error('Không tải được thông tin bài đăng.')

        const data = await res.json()
        console.log('POST DETAIL RESPONSE =', data)
        const rawPost = data.data || data
        console.log('POST DETAIL amenities =', rawPost.amenities)
        setPost(rawPost)

        console.log('POST DETAIL =', rawPost)
        console.log('POST ID =', rawPost.id)
        console.log('POST amenities =', rawPost.amenities)

        // đổi bài thì quay về page 1 review
        setReviewPage(1)
      } catch (err) {
        console.error(err)
        setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  // ===== LOAD DANH SÁCH ẢNH RIÊNG (API /posts/{id}/images) =====
  useEffect(() => {
    async function loadImages() {
      try {
        const res = await fetch(`${API_BASE_URL}/posts/${id}/images`)
        if (!res.ok) {
          console.error('Không tải được danh sách ảnh của bài.', res.status)
          return
        }

        const data = await res.json()
        console.log('POST IMAGES RESPONSE =', data)
        setPostImages(data.data || data)
      } catch (err) {
        console.error('Lỗi khi tải ảnh bài viết:', err)
      }
    }

    loadImages()
  }, [id])

  // ===== INIT TRẠNG THÁI YÊU THÍCH KHI ĐÃ CÓ POST =====
  useEffect(() => {
    if (!post) return
    const ids = getWishlistIds()
    const pid = Number(post.id)
    setIsFavorite(ids.includes(pid))
  }, [post])

  // ====== dữ liệu hiển thị mềm dẻo ======
  const mainImage = useMemo(() => {
    if (!post) return ''

    // 0. Nếu đã chọn từ gallery thì ưu tiên
    if (post.cover_image) {
      const coverUrl = normalizeImageUrl(post.cover_image)
      if (coverUrl) return coverUrl
    }

    // 1. Dùng main_image_url backend trả ra
    if (post.main_image_url) {
      const mainUrl = normalizeImageUrl(post.main_image_url)
      if (mainUrl) return mainUrl
    }

    // 2. thumbnail_url (đã chuẩn hoá ở BE)
    if (post.thumbnail_url) {
      const thumbUrl = normalizeImageUrl(post.thumbnail_url)
      if (thumbUrl) return thumbUrl
    }

    // 3. thumbnail quan hệ
    if (post.thumbnail) {
      const thumbUrl = normalizeImageUrl(post.thumbnail)
      if (thumbUrl) return thumbUrl
    }

    // 4. Ảnh đầu tiên trong quan hệ images
    if (post.images && post.images.length > 0) {
      const firstUrl = normalizeImageUrl(post.images[0])
      if (firstUrl) return firstUrl
    }

    // 5. Fallback sang postImages (API /posts/{id}/images)
    if (postImages && postImages.length > 0) {
      const firstUrl = normalizeImageUrl(postImages[0])
      if (firstUrl) return firstUrl
    }

    // 6. THÊM: tự dò field string nào là URL trong object post
    const anyUrl = Object.values(post).find(
      val => typeof val === 'string' && /^https?:\/\//i.test(val),
    )
    if (anyUrl) return anyUrl

    // 7. Cuối cùng mới dùng placeholder
    return 'https://via.placeholder.com/1200x600?text=Apartment'
  }, [post, postImages])

  // LIST ẢNH ĐỂ DÙNG CHO GALLERY (ưu tiên post.images, nếu trống thì dùng postImages)
  const galleryImages = useMemo(() => {
    if (post?.images && post.images.length > 0) {
      return post.images
    }
    return postImages
  }, [post, postImages])

  const locationText = useMemo(() => {
    if (!post) return ''
    const parts = [
      post.address,
      post.ward?.name,
      post.district?.name,
      post.province?.name,
    ].filter(Boolean)
    return parts.join(', ')
  }, [post])

  const categoryName = post?.category?.name || 'Tin cho thuê'

  const priceText = post?.price
    ? `${Number(post.price).toLocaleString('vi-VN')} đ/tháng`
    : 'Thỏa thuận'

  const areaText = post?.area ? `${post.area} m²` : ''

  const createdAtText = post?.created_at
    ? new Date(post.created_at).toLocaleString('vi-VN')
    : ''

  const ratingList = post?.reviews || []
  const ratingCount = ratingList.length || post?.reviews_count || 0
  const ratingAvg =
    ratingList.length
      ? ratingList.reduce((sum, r) => sum + (r.rating || 0), 0) /
        ratingList.length
      : post?.reviews_avg || 0

  // Tiện ích trong phòng (lấy trực tiếp từ API /posts/{id})
  const amenities = post?.amenities || []
  console.log('DEBUG amenities (from post) =', amenities)
  console.log('DEBUG amenities.length =', amenities.length)

  // Môi trường xung quanh
  const envFeatures =
    post?.environment_features ||
    post?.env_features || // fallback nếu BE đặt tên khác
    []
  console.log('DEBUG envFeatures =', envFeatures)
  console.log('DEBUG envFeatures.length =', envFeatures.length)

  // Đối tượng phù hợp
  const memberTargets = post?.target_members || post?.members || []

  // Chính sách / quy định
  const policies = post?.rental_policies || post?.policies || []

  // avatar & phone chủ nhà (từ user của bài đăng)
  const hostAvatarUrl =
    post?.user?.avatar_url ||
    post?.user?.avatar ||
    post?.user?.avatar_path ||
    post?.user?.profile_photo_url ||
    ''

  const hostPhone =
    post?.contact_phone || // ƯU TIÊN số điện thoại riêng của bài
    post?.user?.phone ||
    post?.user?.phone_number ||
    post?.user?.tel ||
    ''

  // phân trang review (mỗi trang 3 cái)
  const totalReviewPages = useMemo(
    () =>
      ratingList.length
        ? Math.ceil(ratingList.length / REVIEWS_PER_PAGE)
        : 1,
    [ratingList.length],
  )

  const pagedReviews = useMemo(() => {
    if (!ratingList.length) return []
    const start = (reviewPage - 1) * REVIEWS_PER_PAGE
    return ratingList.slice(start, start + REVIEWS_PER_PAGE)
  }, [ratingList, reviewPage])

  const renderStars = value => {
    const full = Math.round(value || 0)
    return (
      <span className="pd-stars">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < full ? 'is-on' : ''}>
            ★
          </span>
        ))}
      </span>
    )
  }

  const handleImagesChange = e => {
    const files = Array.from(e.target.files || [])
    if (files.length > 3) {
      alert('Bạn chỉ được chọn tối đa 3 ảnh.')
    }
    setImageFiles(files.slice(0, 3))
  }

  const handleSubmitReview = async e => {
    e.preventDefault()
    setReviewError('')

    const token = localStorage.getItem('access_token')
    if (!token) {
      alert('Bạn cần đăng nhập để gửi đánh giá.')
      return
    }

    if (!ratingInput || ratingInput < 1 || ratingInput > 5) {
      setReviewError('Vui lòng chọn số sao (1–5).')
      return
    }
    if (!contentInput.trim()) {
      setReviewError('Vui lòng nhập nội dung bình luận.')
      return
    }

    try {
      setSubmittingReview(true)

      const formData = new FormData()
      formData.append('rating', ratingInput)
      formData.append('content', contentInput.trim())
      imageFiles.forEach(file => {
        formData.append('images[]', file)
      })

      const res = await fetch(`${API_BASE_URL}/posts/${id}/reviews`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
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
        throw new Error(data.message || 'Không gửi được đánh giá.')
      }

      const newReview = data.data || data.review || data

      setPost(prev => {
        if (!prev) return prev
        const oldReviews = prev.reviews || []
        const newReviews = [newReview, ...oldReviews]
        return {
          ...prev,
          reviews: newReviews,
          reviews_count: (prev.reviews_count || oldReviews.length) + 1,
        }
      })

      setRatingInput(5)
      setContentInput('')
      setImageFiles([])
      setReviewPage(1)
    } catch (err) {
      console.error(err)
      setReviewError(err.message || 'Có lỗi khi gửi đánh giá.')
    } finally {
      setSubmittingReview(false)
    }
  }

  // ===== TOGGLE YÊU THÍCH CHO BÀI NÀY =====
  const toggleFavorite = () => {
    if (!post) return
    const pid = Number(post.id)
    if (!pid) return

    let ids = getWishlistIds()
    if (ids.includes(pid)) {
      ids = ids.filter(x => x !== pid)
      setIsFavorite(false)
    } else {
      ids = [...ids, pid]
      setIsFavorite(true)
    }
    saveWishlistIds(ids)
  }

  // ===== GALLERY MODAL HANDLERS =====
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const openGalleryModal = (index = 0) => {
    setActiveImageIndex(index)
    setZoomLevel(1)
    setDragOffset({ x: 0, y: 0 })
    setShowGalleryModal(true)
  }

  const closeGalleryModal = () => {
    setShowGalleryModal(false)
    setZoomLevel(1)
    setDragOffset({ x: 0, y: 0 })
  }

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)
    setZoomLevel(1)
    setDragOffset({ x: 0, y: 0 })
  }

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
    setZoomLevel(1)
    setDragOffset({ x: 0, y: 0 })
  }

  // Click để phóng to, click lần 2 để tắt modal
  const toggleZoom = () => {
    if (zoomLevel === 1) {
      // Lần 1: zoom to 2x
      setZoomLevel(2)
      setDragOffset({ x: 0, y: 0 })
    } else {
      // Lần 2: close modal
      closeGalleryModal()
    }
  }

  // Drag để kéo xem ảnh khi đã zoom
  const handleMouseDown = (e) => {
    // Chỉ drag khi đã zoom
    if (zoomLevel <= 1) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return
    
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    
    // Cập nhật drag offset từ vị trí hiện tại
    setDragOffset((prevOffset) => ({
      x: prevOffset.x + deltaX,
      y: prevOffset.y + deltaY,
    }))
    
    // Cập nhật drag start point
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // ===== DEBUG LOG MỖI LẦN RENDER =====
  console.log('DEBUG mainImage =', mainImage)
  console.log('DEBUG post =', post)
  console.log('DEBUG post.images =', post?.images)
  console.log('DEBUG postImages =', postImages)
  console.log('DEBUG post.thumbnail =', post?.thumbnail)

  if (loading) {
    return (
      <main className="container container--main pd-page">
        <p>Đang tải dữ liệu phòng...</p>
      </main>
    )
  }

  if (error || !post) {
    return (
      <main className="container container--main pd-page">
        <p className="pd-error">{error || 'Không tìm thấy bài đăng.'}</p>
        <Link to="/" className="pd-link-back">
          ← Quay về trang chủ
        </Link>
      </main>
    )
  }

  return (
    <main className="container container--main pd-page">
      {/* HERO ẢNH LỚN */}
      <section className="pd-hero">
        <img src={mainImage} alt={post.title} className="pd-hero__img" />
        <div className="pd-hero__overlay" />
        <div className="pd-hero__content">
          <p className="pd-hero__topline">
            {categoryName}
            {post.status === 'published' && (
              <span className="pd-badge">Đang cho thuê</span>
            )}
          </p>
          <h1 className="pd-hero__title">{post.title}</h1>

          <div className="pd-hero__meta">
            <span className="pd-hero__price">{priceText}</span>
            {areaText && <span className="pd-dot">•</span>}
            {areaText && <span>{areaText}</span>}
            {locationText && (
              <>
                <span className="pd-dot">•</span>
                <span>{locationText}</span>
              </>
            )}
          </div>

          <div className="pd-hero__bottom">
            <div className="pd-rating">
              {ratingCount > 0 ? (
                <>
                  {renderStars(ratingAvg)}
                  <span className="pd-rating__number">
                    {ratingAvg.toFixed(1)}/5
                  </span>
                  <span className="pd-rating__count">
                    ({ratingCount} đánh giá)
                  </span>
                  <Link to={`/posts/${post.id}/reviews`} className="pd-link">
                    Xem chi tiết đánh giá
                  </Link>
                </>
              ) : (
                <span className="pd-rating__empty">
                  Chưa có đánh giá nào
                </span>
              )}
            </div>
            <p className="pd-hero__time">Đăng lúc: {createdAtText}</p>
          </div>
        </div>
      </section>

      {/* LAYOUT 2 CỘT: THÔNG TIN + LIÊN HỆ */}
      <section className="pd-layout">
        {/* CỘT TRÁI: THÔNG TIN CHÍNH */}
        <div className="pd-main">
          {/* GALLERY NHỎ CUỘN NGANG */}
          {galleryImages && galleryImages.length > 1 && (
            <div className="pd-gallery">
              {galleryImages.map((img, idx) => {
                const imgUrl = normalizeImageUrl(img)
                if (!imgUrl) return null
                return (
                  <button
                    key={img.id || img.full_url || img.url}
                    type="button"
                    className="pd-gallery__item"
                    onClick={() => openGalleryModal(idx)}
                  >
                    <img src={imgUrl} alt={post.title} />
                  </button>
                )
              })}
            </div>
          )}

          {/* THÔNG TIN CHI TIẾT */}
          <article className="pd-card">
            <h2 className="pd-card__title">Thông tin chi tiết</h2>
            <dl className="pd-info-grid">
              <div>
                <dt>Giá thuê</dt>
                <dd>{priceText}</dd>
              </div>
              <div>
                <dt>Diện tích</dt>
                <dd>{areaText || '—'}</dd>
              </div>
              <div>
                <dt>Loại tin</dt>
                <dd>{categoryName}</dd>
              </div>
              <div>
                <dt>Người đăng</dt>
                <dd>{post.user?.name || '—'}</dd>
              </div>
              <div className="pd-info-wide">
                <dt>Địa chỉ</dt>
                <dd>{locationText || '—'}</dd>
              </div>
            </dl>
          </article>

          {/* MÔ TẢ */}
          {post.content && (
            <article className="pd-card">
              <h2 className="pd-card__title">Mô tả chi tiết</h2>
              <div className="pd-content">{post.content}</div>

              {/* TIỆN ÍCH TRONG MÔ TẢ */}
              {amenities.length > 0 && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px', margin: '0 0 8px 0' }}>
                    Tiện ích trong phòng
                  </h3>
                  <div className="pd-tags">
                    {amenities.map(a => (
                      <span key={a.id || a.name} className="pd-tag">
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* MÔI TRƯỜNG XUNG QUANH TRONG MÔ TẢ */}
              {envFeatures.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px', margin: '0 0 8px 0' }}>
                    Môi trường xung quanh
                  </h3>
                  <div className="pd-tags">
                    {envFeatures.map(e => (
                      <span key={e.id || e.name} className="pd-tag">
                        {e.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )}

          {/* TIỆN ÍCH */}
          {amenities.length > 0 && (
            <article className="pd-card">
              <h2 className="pd-card__title">
                Tiện ích trong phòng / căn hộ
              </h2>
              <div className="pd-tags">
                {amenities.map(a => (
                  <span key={a.id || a.name} className="pd-tag">
                    {a.name}
                  </span>
                ))}
              </div>
            </article>
          )}

          {/* MÔI TRƯỜNG XUNG QUANH */}
          {envFeatures.length > 0 && (
            <article className="pd-card">
              <h2 className="pd-card__title">Môi trường xung quanh</h2>
              <div className="pd-tags">
                {envFeatures.map(e => (
                  <span key={e.id || e.name} className="pd-tag">
                    {e.name}
                  </span>
                ))}
              </div>
            </article>
          )}

          {memberTargets.length > 0 && (
            <article className="pd-card">
              <h2 className="pd-card__title">Đối tượng phù hợp</h2>
              <div className="pd-tags">
                {memberTargets.map(m => (
                  <span key={m.id || m.name} className="pd-tag">
                    {m.name}
                  </span>
                ))}
              </div>
            </article>
          )}

          {policies.length > 0 && (
            <article className="pd-card">
              <h2 className="pd-card__title">Chính sách &amp; quy định</h2>
              <div className="pd-tags">
                {policies.map(p => (
                  <span key={p.id || p.name} className="pd-tag">
                    {p.name}
                  </span>
                ))}
              </div>
            </article>
          )}
        </div>

        {/* CỘT PHẢI: LIÊN HỆ + LƯU Ý */}
        <aside className="pd-aside">
          <section className="pd-card pd-contact">
            <h2 className="pd-card__title">Liên hệ đặt phòng</h2>

            {/* NÚT YÊU THÍCH (TRÊN NÚT LIÊN HỆ) */}
            <button
              type="button"
              className={
                'pd-btn pd-btn--ghost pd-btn-fav' +
                (isFavorite ? ' is-on' : '')
              }
              onClick={toggleFavorite}
            >
              {isFavorite ? 'Bỏ khỏi yêu thích ♥' : 'Lưu tin yêu thích ♡'}
            </button>

            <div className="pd-host">
              <div className="pd-host__avatar">
                {hostAvatarUrl ? (
                  <img
                    src={hostAvatarUrl}
                    alt={post.user?.name || 'Chủ nhà'}
                  />
                ) : (
                  (post.user?.name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="pd-host__name">
                  {post.user?.name || 'Chủ nhà'}
                </p>
                {post.user?.email && (
                  <p className="pd-host__meta">{post.user.email}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              className="pd-btn pd-btn--primary pd-btn-call"
              onMouseEnter={() => setShowPhone(true)}
              onMouseLeave={() => setShowPhone(false)}
              onClick={() => {
                if (!hostPhone) {
                  alert(
                    'Chưa có số điện thoại của chủ nhà trong dữ liệu API.',
                  )
                  return
                }
                window.location.href = `tel:${hostPhone}`
              }}
            >
              {hostPhone
                ? showPhone
                  ? `Gọi: ${hostPhone}`
                  : 'Gọi điện cho chủ nhà'
                : 'Chưa có SĐT'}
            </button>
            {hostPhone && showPhone && (
              <p className="pd-contact__phone">
                SĐT: <strong>{hostPhone}</strong>
              </p>
            )}

            <button type="button" className="pd-btn pd-btn--ghost">
              Nhắn tin (Zalo / Messenger)
            </button>

            <p className="pd-contact__note">
              Vui lòng nói rõ bạn xem tin trên hệ thống để được ưu tiên hỗ
              trợ.
            </p>
          </section>

          <section className="pd-card pd-sidebox">
            <h3 className="pd-card__subtitle">Lưu ý khi đi xem phòng</h3>
            <ul className="pd-tips">
              <li>Không chuyển cọc nếu chưa xem phòng trực tiếp.</li>
              <li>
                Kiểm tra hợp đồng rõ ràng về giá, thời hạn và chi phí phát sinh.
              </li>
              <li>
                Chụp ảnh tình trạng phòng trước khi nhận để tránh tranh chấp.
              </li>
            </ul>
          </section>
        </aside>
      </section>

      {/* ====== ĐÁNH GIÁ & BÌNH LUẬN - FULL WIDTH BÊN DƯỚI ====== */}
      <section className="pd-reviews-section">
        <article className="pd-card pd-reviews pd-reviews--full">
          <h2 className="pd-card__title">Đánh giá & bình luận</h2>

          {/* TÓM TẮT */}
          <div className="pd-reviews__summary">
            <div>
              {ratingCount > 0 ? (
                <>
                  {renderStars(ratingAvg)}
                  <span className="pd-rating__number">
                    {ratingAvg.toFixed(1)}/5
                  </span>
                  <span className="pd-rating__count">
                    ({ratingCount} đánh giá)
                  </span>
                </>
              ) : (
                <span className="pd-rating__empty">
                  Chưa có đánh giá nào, hãy là người đầu tiên.
                </span>
              )}
            </div>
          </div>

          {/* LIST REVIEW: tối đa 3 / 1 trang */}
          {pagedReviews.length > 0 && (
            <div className="pd-reviews__list">
              {pagedReviews.map(rv => {
                const avatarUrl =
                  rv.user?.avatar_url ||
                  rv.user?.avatar ||
                  rv.user?.avatar_path ||
                  ''
                return (
                  <div key={rv.id} className="pd-review-item">
                    <div className="pd-review-item__head">
                      <div className="pd-review-item__avatar">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={rv.user?.name || 'Người dùng'}
                          />
                        ) : (
                          (rv.user?.name || 'U')
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="pd-review-item__name">
                          {rv.user?.name || 'Người dùng'}
                        </p>
                        <div className="pd-review-item__meta">
                          {renderStars(rv.rating)}
                          {rv.created_at && (
                            <span>
                              {new Date(
                                rv.created_at,
                              ).toLocaleString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {rv.content && (
                      <p className="pd-review-item__content">{rv.content}</p>
                    )}

                    {/* Block ảnh review nếu sau này có */}
                    {rv.images && rv.images.length > 0 && (
                      <div className="pd-review-item__images">
                        {rv.images.slice(0, 3).map(img => (
                          <img
                            key={img.id || img.url}
                            src={normalizeImageUrl(img)}
                            alt="review"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* PAGINATION nhỏ 1 2 3 phía dưới */}
          {totalReviewPages > 1 && (
            <div className="pd-reviews__pagination">
              {Array.from(
                { length: totalReviewPages },
                (_, idx) => idx + 1,
              ).map(pageNum => (
                <button
                  key={pageNum}
                  type="button"
                  className={
                    'pd-page-btn' +
                    (pageNum === reviewPage ? ' is-active' : '')
                  }
                  onClick={() => setReviewPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          )}

          {/* FORM GỬI ĐÁNH GIÁ */}
          <form className="pd-review-form" onSubmit={handleSubmitReview}>
            <h3 className="pd-card__subtitle">Viết đánh giá của bạn</h3>

            <div className="pd-review-form__row">
              <label>Đánh giá sao</label>
              <div className="pd-review-stars-input">
                {Array.from({ length: 5 }, (_, i) => {
                  const starVal = i + 1
                  return (
                    <button
                      key={starVal}
                      type="button"
                      className={
                        'pd-star-btn' +
                        (starVal <= ratingInput ? ' is-on' : '')
                      }
                      onClick={() => setRatingInput(starVal)}
                    >
                      ★
                    </button>
                  )
                })}
                <span className="pd-review-stars-input__text">
                  {ratingInput} / 5
                </span>
              </div>
            </div>

            <div className="pd-review-form__row">
              <label>Nội dung bình luận</label>
              <textarea
                rows="4"
                value={contentInput}
                onChange={e => setContentInput(e.target.value)}
                placeholder="Chia sẻ trải nghiệm thật của bạn về phòng này..."
              />
            </div>

            <div className="pd-review-form__row">
              <label>Ảnh (tối đa 3 ảnh)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
              />
              {imageFiles.length > 0 && (
                <ul className="pd-review-form__files">
                  {imageFiles.map((f, idx) => (
                    <li key={idx}>{f.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {reviewError && (
              <p className="pd-error" style={{ marginTop: 4 }}>
                {reviewError}
              </p>
            )}

            <button
              type="submit"
              className="pd-btn pd-btn--primary"
              disabled={submittingReview}
            >
              {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </form>
        </article>
      </section>

      {/* ===== GALLERY MODAL ===== */}
      {showGalleryModal && galleryImages.length > 0 && (
        <div
          className="pd-gallery-modal-overlay"
          onClick={closeGalleryModal}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="pd-gallery-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* HEADER: ONLY CLOSE BUTTON */}
            <div className="pd-gallery-modal__header">
              <button
                type="button"
                className="pd-gallery-modal__close"
                onClick={closeGalleryModal}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* ZOOM HINT */}
            {zoomLevel === 1 && (
              <div className="pd-gallery-modal__hint">
                Click ảnh để phóng to, click lần nữa để tắt
              </div>
            )}

            {/* DRAG HINT - Khi đã zoom */}
            {zoomLevel > 1 && (
              <div className="pd-gallery-modal__hint" style={{ animation: 'none', opacity: 0.6 }}>
                Kéo chuột để xem các vùng khác
              </div>
            )}

            {/* MAIN IMAGE VIEWER */}
            <div
              className="pd-gallery-modal__viewer"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              }}
            >
              <div
                className={`pd-gallery-modal__image-container zoom-${zoomLevel}`}
                style={{
                  transform: zoomLevel > 1 ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : 'none',
                }}
              >
                <img
                  src={normalizeImageUrl(galleryImages[activeImageIndex])}
                  alt={`View ${activeImageIndex + 1}`}
                  className="pd-gallery-modal__image"
                  onClick={toggleZoom}
                  style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                />
              </div>

              {/* LEFT ARROW */}
              {galleryImages.length > 1 && zoomLevel === 1 && (
                <button
                  type="button"
                  className="pd-gallery-modal__nav pd-gallery-modal__nav--prev"
                  onClick={prevImage}
                  title="Ảnh trước"
                >
                  ‹
                </button>
              )}

              {/* RIGHT ARROW */}
              {galleryImages.length > 1 && zoomLevel === 1 && (
                <button
                  type="button"
                  className="pd-gallery-modal__nav pd-gallery-modal__nav--next"
                  onClick={nextImage}
                  title="Ảnh tiếp"
                >
                  ›
                </button>
              )}
            </div>

            {/* THUMBNAIL LIST BELOW */}
            {galleryImages.length > 1 && zoomLevel === 1 && (
              <div className="pd-gallery-modal__thumbs">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={
                      'pd-gallery-modal__thumb' +
                      (idx === activeImageIndex ? ' is-active' : '')
                    }
                    onClick={() => {
                      setActiveImageIndex(idx)
                      setZoomLevel(1)
                      setDragOffset({ x: 0, y: 0 })
                    }}
                  >
                    <img
                      src={normalizeImageUrl(img)}
                      alt={`Thumb ${idx + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* IMAGE COUNTER */}
            {galleryImages.length > 1 && zoomLevel === 1 && (
              <div className="pd-gallery-modal__counter">
                {activeImageIndex + 1} / {galleryImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
