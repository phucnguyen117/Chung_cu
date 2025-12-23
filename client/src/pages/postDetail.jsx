// src/pages/PostDetail.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import '../assets/style/pages/post-detail.css'
import { api } from '@/api/axios'
import { HeartPlus, HeartOff } from 'lucide-react';
import ReviewTree from "@/components/ReviewTree"


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
  (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api'

/** ====== WISHLIST HELPERS - DỀ DÀI VỀ DATABASE API ====== */
async function getWishlistIdsFromAPI(token) {
  try {
    if (!token) {
      // Không đăng nhập, dùng localStorage
      const raw = localStorage.getItem('wishlist_posts')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map(v => Number(v))
        .filter(v => !Number.isNaN(v))
    }

    // Đăng nhập, lấy từ API
    const res = await fetch(`${API_BASE_URL}/saved-posts/ids`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      // API lỗi, fallback localStorage
      const raw = localStorage.getItem('wishlist_posts')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.map(v => Number(v)).filter(v => !Number.isNaN(v))
    }

    const data = await res.json()
    if (data.status && Array.isArray(data.data)) {
      return data.data
    }
    return []
  } catch (e) {
    console.error('getWishlistIdsFromAPI error', e)
    return []
  }
}

async function toggleWishlistAPI(postId, token) {
  try {
    if (!token) {
      // Không đăng nhập, dùng localStorage
      const raw = localStorage.getItem('wishlist_posts')
      let arr = raw ? JSON.parse(raw) : []
      if (!Array.isArray(arr)) arr = []

      const idx = arr.indexOf(postId)
      if (idx >= 0) {
        arr.splice(idx, 1)
      } else {
        arr.push(postId)
      }

      localStorage.setItem('wishlist_posts', JSON.stringify(arr))
      window.dispatchEvent(new Event('wishlist:changed'))
      return
    }
  


    // Đăng nhập, dùng API
    const ids = await getWishlistIdsFromAPI(token)
    const isSaved = ids.includes(Number(postId))

    const url = isSaved
      ? `${API_BASE_URL}/saved-posts/${postId}`
      : `${API_BASE_URL}/saved-posts/${postId}`

    const method = isSaved ? 'DELETE' : 'POST'

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    if (res.ok) {
      window.dispatchEvent(new Event('wishlist:changed'))
    }
  } catch (e) {
    console.error('toggleWishlistAPI error', e)
  }
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
  const [reviewError, setReviewError] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Show/hide review form and editing state
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState(null)

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

  // currently logged-in user (from localStorage)
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem('auth_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const handleAuthChanged = () => {
      try {
        const raw = localStorage.getItem('auth_user')
        setAuthUser(raw ? JSON.parse(raw) : null)
      } catch {
        setAuthUser(null)
      }
    }
    window.addEventListener('auth:changed', handleAuthChanged)
    return () => window.removeEventListener('auth:changed', handleAuthChanged)
  }, [])

  // Initialize review form visibility depending on whether user already reviewed
  useEffect(() => {
    const myReview = (post?.reviews || []).find(r => r.user_id === authUser?.id)
    if (!authUser) {
      setShowReviewForm(false)
      setEditingReviewId(null)
      return
    }
    setShowReviewForm(!myReview)
    setEditingReviewId(myReview ? myReview.id : null)
  }, [authUser, post])

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

    const token = localStorage.getItem('access_token')

    const initFav = async () => {
      const ids = await getWishlistIdsFromAPI(token)
      const pid = Number(post.id)
      setIsFavorite(ids.includes(pid))
    }

    initFav()
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

    // 7. Cuối cùng mới dùng placeholder (SVG data URI để tránh phụ thuộc mạng)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-size="36">Apartment</text></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
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
  // ===== TÁCH ĐÁNH GIÁ CỦA TÔI & CỘNG ĐỒNG =====
  const myReview = useMemo(() => {
    if (!authUser) return null
    return ratingList.find(r => r.user_id === authUser.id)
  }, [ratingList, authUser])

  const communityReviews = useMemo(() => {
    if (!authUser) return ratingList
    return ratingList.filter(r => r.user_id !== authUser.id)
  }, [ratingList, authUser])

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
    post?.environmentFeatures ||
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
    '../src/assets/images/default-avatar.png'

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



  const handleSubmitReview = async e => {
    e.preventDefault()
    setReviewError('')

    if (!authUser) {
      alert('Bạn cần đăng nhập để gửi đánh giá.')
      return
    }

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
      // Nếu user đã đánh giá trước đó thì gọi edit thay vì tạo mới
      const existing = (post?.reviews || []).find(r => r.user_id === authUser?.id)
      if (existing) {
        setSubmittingReview(true)
        try {
          await handleEditReview(existing.id, {
            rating: ratingInput,
            content: contentInput.trim(),
          })

          setRatingInput(5)
          setContentInput('')
          setReviewPage(1)

          await loadReviewTree()
          await refreshPost()
          alert('Cập nhật đánh giá thành công.')

          // Sau khi cập nhật, ẩn form (theo yêu cầu)
          setShowReviewForm(false)
          setEditingReviewId(null)
        } catch (e) {
          console.error('Update existing review failed', e)
          setReviewError(e.message || 'Không cập nhật được đánh giá.')
        } finally {
          setSubmittingReview(false)
        }

        return
      }

      // Nếu chưa tồn tại đánh giá thì tạo mới
      setSubmittingReview(true)

      const body = JSON.stringify({ rating: ratingInput, content: contentInput.trim() })

      const res = await fetch(`${API_BASE_URL}/posts/${id}/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body,
      })

      const text = await res.text()
      let data = null
      try {
        data = JSON.parse(text)
      } catch (e) {
        // server returned non-JSON (text/html or plain text)
        console.warn('handleSubmitReview: response not JSON', text)
      }

      if (!res.ok) {
        const msg = (data && (data.message || data.error)) || text || 'Không gửi được đánh giá.'
        throw new Error(msg)
      }

      if (data && data.status === false) {
        throw new Error(data.message || 'Không gửi được đánh giá.')
      }

      // RESET FORM
      setRatingInput(5)
      setContentInput('')
      setReviewPage(1)

      await loadReviewTree()
      await refreshPost()

      // Sau khi tạo đánh giá, ẩn form
      setShowReviewForm(false)
      setEditingReviewId(null)

    } catch (err) {
      console.error(err)
      const msg = err?.message || 'Có lỗi khi gửi đánh giá.'
      setReviewError(msg)
      alert(msg)
    } finally {
      setSubmittingReview(false)
    }
  }


  // ===== TOGGLE YÊU THÍCH CHO BÀI NÀY =====
  const toggleFavorite = async () => {
    if (!post) return
    const pid = Number(post.id)
    if (!pid) return

    const token = localStorage.getItem('access_token')

    if (token) {
      // User đăng nhập, dùng API
      await toggleWishlistAPI(pid, token)
      setIsFavorite(!isFavorite)
    } else {
      // Chưa đăng nhập, dùng localStorage
      const raw = localStorage.getItem('wishlist_posts')
      let ids = raw ? JSON.parse(raw) : []
      if (!Array.isArray(ids)) ids = []

      if (ids.includes(pid)) {
        ids = ids.filter(x => x !== pid)
        setIsFavorite(false)
      } else {
        ids = [...ids, pid]
        setIsFavorite(true)
      }
      localStorage.setItem('wishlist_posts', JSON.stringify(ids))
      window.dispatchEvent(new Event('wishlist:changed'))
    }
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

  // ===== LOAD REPLY TREE =====
  const [reviewTree, setReviewTree] = useState([]);

  // ===== LOAD REPLY TREE (FIXED) =====
  async function loadReviewTree() {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`${API_BASE_URL}/posts/${id}/review-tree`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        console.warn("loadReviewTree failed:", res.status);
        setReviewTree([]);
        return;
      }

      const data = await res.json();
      console.log("DEBUG review-tree RAW =", data);

      let tree = [];
      if (Array.isArray(data?.data)) tree = data.data;
      else if (Array.isArray(data?.data?.reviews)) tree = data.data.reviews;
      else if (Array.isArray(data?.reviews)) tree = data.reviews;

      setReviewTree(tree);
    } catch (err) {
      console.error("loadReviewTree error", err);
      setReviewTree([]);
    }
  }



  // Refetch post detail (dùng để làm mới tổng quan bài viết, số đánh giá, avg, ...)
  async function refreshPost() {
    try {
      const res = await fetch(`${API_BASE_URL}/posts/${id}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) {
        console.warn('refreshPost: fetch failed', res.status)
        return
      }
      const data = await res.json()
      const rawPost = data.data || data
      setPost(rawPost)
    } catch (err) {
      console.error('refreshPost error', err)
    }
  }

  // chạy mỗi khi đổi id
  useEffect(() => {
    loadReviewTree()
  }, [id])

  // Gửi reply vào review gốc
  async function handleReplySubmit(reviewId, content) {
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE_URL}/reviews/${reviewId}/replies`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    loadReviewTree();
  }

  // Gửi reply vào reply cấp con
  async function handleReplyToReply(replyId, content) {
    const token = localStorage.getItem("access_token");

    await fetch(`${API_BASE_URL}/replies/${replyId}/child`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    await loadReviewTree();
    await refreshPost();
  }

  // ===== SỬA / XÓA REPLY =====
  async function handleEditReply(replyId, payload) {
    const token = localStorage.getItem("access_token");

    await fetch(`${API_BASE_URL}/replies/${replyId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    await loadReviewTree();
    await refreshPost();
  }


  async function handleDeleteReply(replyId) {
    const token = localStorage.getItem("access_token");

    await fetch(`${API_BASE_URL}/replies/${replyId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    await loadReviewTree();
    await refreshPost();
  }


  // Sửa đánh giá (rating + content)
  async function handleEditReview(reviewId, payload) {
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    await loadReviewTree();
    await refreshPost();
  }

  // Xóa đánh giá
  async function handleDeleteReview(reviewId) {
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    loadReviewTree();
  }


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

            </article>
          )}

          {/* TIỆN ÍCH */}
     {amenities && amenities.length > 0 && (
            <article className="pd-card">
              <h2 className="pd-card__title">
                Tiện ích trong phòng / căn hộ
              </h2>
              <div className="pd-tags">
                {amenities.map((a, index) => (
                  <span key={a.id || index} className="pd-tag">
                    {/* Render an toàn cho cả Object và String */}
                    {typeof a === 'object' ? a.name : a}
                  </span>
                ))}
              </div>
            </article>
          )}

          {/* MÔI TRƯỜNG XUNG QUANH */}
       {envFeatures && envFeatures.length > 0 && (
            <article className="pd-card">
              <h2 className="pd-card__title">Môi trường xung quanh</h2>
              <div className="pd-tags">
                {envFeatures.map((e, index) => (
                  <span key={e.id || index} className="pd-tag">
                    {typeof e === 'object' ? e.name : e}
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
              <div className='favorite-btn'>
                {isFavorite ? <>Bỏ khỏi yêu thích <HeartOff size={18} /></> : <>Lưu tin yêu thích <HeartPlus size={18} /></>}
              </div>
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

            <div className="pd-chat-split">
              {/* ZALO */}
              <button
                type="button"
                className="pd-chat-btn pd-chat-btn--zalo"
                onClick={() => {
                  if (!hostPhone) {
                    alert('Chưa có số điện thoại của chủ nhà')
                    return
                  }
                  window.open(`https://zalo.me/${hostPhone}`, '_blank')
                }}
              >
                Zalo
              </button>

              {/* MESSENGER */}
              <button
                type="button"
                className="pd-chat-btn pd-chat-btn--messenger"
                onClick={() => {
                  if (!post.user?.facebook_id && !post.user?.facebook_url) {
                    alert('Chủ nhà chưa cung cấp Messenger')
                    return
                  }

                  const fbUrl =
                    post.user?.facebook_url ||
                    `https://m.me/${post.user.facebook_id}`

                  window.open(fbUrl, '_blank')
                }}
              >
                Messenger
              </button>
            </div>


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

      {/* ====== ĐÁNH GIÁ & BÌNH LUẬN ====== */}

      <section className="pd-reviews-section">
        <article className="pd-card pd-reviews pd-reviews--full">
          <h2 className="pd-card__title">Đánh giá & bình luận</h2>
          {/* ===== FORM ĐÁNH GIÁ (CHỈ HIỆN KHI CHƯA ĐÁNH GIÁ) ===== */}
          {authUser && showReviewForm && (
            <form className="pd-review-form" onSubmit={handleSubmitReview}>
              <h3 className="pd-review-subtitle">
                {editingReviewId ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá của bạn'}
              </h3>

              {/* STAR RATING */}
              <div className="pd-review-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    type="button"
                    key={i}
                    className={i < ratingInput ? 'is-on' : ''}
                    onClick={() => setRatingInput(i + 1)}
                  >
                    ★
                  </button>
                ))}
              </div>

              {/* CONTENT */}
              <textarea
                rows={4}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                value={contentInput}
                onChange={e => setContentInput(e.target.value)}
                required
              />

              {reviewError && <p className="pd-error">{reviewError}</p>}

              <button
                type="submit"
                className="pd-btn pd-btn--primary"
                disabled={submittingReview}
              >
                {submittingReview
                  ? 'Đang gửi...'
                  : editingReviewId
                    ? 'Cập nhật đánh giá'
                    : 'Gửi đánh giá'}
              </button>
            </form>
          )}

          {/* ===== ĐÁNH GIÁ CỦA BẠN ===== */}
          {authUser && myReview && (
            <div className="pd-my-review-box">
              <h3 className="pd-review-subtitle">Đánh giá của bạn</h3>

              <div className="pd-review-item is-own">
                <div className="pd-review-item__avatar">
                  {authUser.avatar_url ? (
                    <img src={authUser.avatar_url} alt={authUser.name} />
                  ) : (
                    (authUser.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>

                <div className="pd-review-item__body">
                  <div className="pd-review-item__top">
                    <div className="pd-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < Math.round(myReview.rating || 0) ? 'is-on' : ''}
                        >
                          ★
                        </span>
                      ))}
                    </div>

                    <div className="pd-review-actions">
                      <button
                        type="button"
                        className="pd-link"
                        onClick={() => {
                          setRatingInput(myReview.rating || 5)
                          setContentInput(myReview.content || '')
                          setEditingReviewId(myReview.id)
                          setShowReviewForm(true)
                        }}
                      >
                        Sửa
                      </button>

                      <button
                        type="button"
                        className="pd-link danger"
                        onClick={async () => {
                          if (!confirm('Bạn có chắc muốn xóa đánh giá này?')) return
                          await handleDeleteReview(myReview.id)
                          await refreshPost()
                          setShowReviewForm(false)
                          setEditingReviewId(null)
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {myReview.content && (
                    <div className="pd-review-item__content">
                      {myReview.content}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== ĐÁNH GIÁ CỘNG ĐỒNG ===== */}
          <div className="pd-community-reviews">
            <h3 className="pd-review-subtitle">
              Các đánh giá từ cộng đồng ({communityReviews.length})
            </h3>

            {communityReviews.length === 0 && (
              <div className="pd-review-empty">
                <div className="pd-review-empty__icon">💬</div>
                <p>
                  Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm!
                </p>
              </div>
            )}

            <div className="rv-tree-list">
              {communityReviews.map(rv => (
                <ReviewTree
                  key={rv.id}
                  postId={post.id}
                  review={rv}
                  replies={rv.children || rv.replies || []}
                  onReplySubmit={handleReplySubmit}
                  onReplyToReply={handleReplyToReply}
                  onEditReview={handleEditReview}
                  onDeleteReview={handleDeleteReview}
                  onEditReply={handleEditReply}
                  onDeleteReply={handleDeleteReply}
                  currentUserId={authUser?.id}
                  currentUser={authUser}
                />
              ))}

            </div>
          </div>
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
