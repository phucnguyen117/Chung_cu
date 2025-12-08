// src/pages/Wishlist.jsx
import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../assets/style/style.css'

// ===== CẤU HÌNH API =====
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// Chuẩn hoá mọi kiểu object ảnh thành URL string
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

// ====== LOCAL WISHLIST HELPERS (CHỐNG TRÙNG ID) ======
function getWishlistIds() {
  try {
    const raw = localStorage.getItem('wishlist_posts')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const nums = parsed
      .map(v => Number(v))
      .filter(v => !Number.isNaN(v))

    // bỏ trùng ID
    return Array.from(new Set(nums))
  } catch (e) {
    console.error('parse wishlist_posts error', e)
    return []
  }
}

function saveWishlistIds(ids) {
  const nums = ids
    .map(v => Number(v))
    .filter(v => !Number.isNaN(v))

  const unique = Array.from(new Set(nums))
  localStorage.setItem('wishlist_posts', JSON.stringify(unique))
  window.dispatchEvent(new Event('wishlist:changed'))
}

export default function Wishlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState([]) // ID các tin đang được chọn
  const navigate = useNavigate()

  const totalCount = items.length
  const selectedCount = selectedIds.length

  // === TÍNH TRẠNG "CHỌN TẤT CẢ" ===
  const isAllSelected = useMemo(
    () => totalCount > 0 && selectedCount === totalCount,
    [totalCount, selectedCount],
  )

  // load dữ liệu post yêu thích
  useEffect(() => {
    const ids = getWishlistIds()
    if (!ids.length) {
      setItems([])
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')

        // ==== bulk /posts?ids=1,2,3 ====
        const res = await axios.get(`${API_BASE_URL}/posts`, {
          params: {
            ids: ids.join(','), // backend nhận ids="1,2,3"
          },
        })

        let posts = res.data.data || res.data.posts || res.data || []
        if (!Array.isArray(posts)) posts = []

        const mapped = posts.map(p => {
          const candidates = []

          if (p.cover_image) candidates.push(p.cover_image)
          if (p.main_image_url) candidates.push(p.main_image_url)
          if (p.thumbnail_url) candidates.push(p.thumbnail_url)
          if (p.thumbnail) candidates.push(p.thumbnail)

          if (Array.isArray(p.images) && p.images.length > 0) {
            candidates.push(p.images[0])
          }
          if (Array.isArray(p.post_images) && p.post_images.length > 0) {
            candidates.push(p.post_images[0])
          }

          let firstImg = ''
          for (const c of candidates) {
            const u = normalizeImageUrl(c)
            if (u) {
              firstImg = u
              break
            }
          }

          if (!firstImg) {
            const anyUrl = Object.values(p).find(
              v => typeof v === 'string' && /^https?:\/\//i.test(v),
            )
            if (anyUrl) firstImg = anyUrl
          }

          if (!firstImg) {
            firstImg = 'https://via.placeholder.com/400x250?text=No+Image'
          }

          return {
            id: Number(p.id),
            title: p.title,
            price: Number(p.price) || 0,
            area: Number(p.area) || 0,
            addr: p.address || p.full_address || '',
            img: firstImg,
            vip: p.is_vip === 1 || p.vip === 1,
            time: new Date(
              p.created_at || Date.now(),
            ).toLocaleDateString('vi-VN'),
            category_id: p.category_id || null,
            category_name: p.category?.name || '',
          }
        })

        // giữ đúng thứ tự theo ids trong localStorage
        const mapById = new Map(mapped.map(m => [Number(m.id), m]))
        const ordered = ids
          .map(id => mapById.get(Number(id)))
          .filter(Boolean)

        setItems(ordered)
      } catch (err) {
        console.error(err)
        setError('Không tải được danh sách yêu thích.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // luôn làm sạch selectedIds nếu items thay đổi (tránh giữ id không còn tồn tại)
  useEffect(() => {
    setSelectedIds(prev =>
      prev.filter(id => items.some(it => Number(it.id) === Number(id))),
    )
  }, [items])

  // === toggle chọn 1 tin ===
  const toggleSelect = id => {
    const pid = Number(id)
    setSelectedIds(prev =>
      prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid],
    )
  }

  // === chọn / bỏ chọn tất cả ===
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map(it => Number(it.id)))
    }
  }

  // xoá 1 sản phẩm khỏi wishlist
  const removeFromWishlist = id => {
    const pid = Number(id)
    const ids = getWishlistIds().filter(x => x !== pid)
    saveWishlistIds(ids)
    setItems(prev => prev.filter(it => Number(it.id) !== pid))
    setSelectedIds(prev => prev.filter(x => x !== pid))
  }

  // xoá các sản phẩm đang được chọn
  const handleDeleteSelected = () => {
    if (!selectedIds.length) return

    const currentIds = getWishlistIds()
    const remainingIds = currentIds.filter(
      id => !selectedIds.includes(Number(id)),
    )
    saveWishlistIds(remainingIds)

    setItems(prev =>
      prev.filter(it => !selectedIds.includes(Number(it.id))),
    )
    setSelectedIds([])
  }

  // xoá hết
  const clearWishlist = () => {
    saveWishlistIds([])
    setItems([])
    setSelectedIds([])
  }

  const goExplore = () => {
    navigate('/phong-tro') // hoặc trang nào anh muốn
  }

  return (
    <div className="re">
      {/* HERO nhỏ cho trang wishlist */}
      <section className="re-hero re-hero--small u-fullbleed">
        <div className="container re-hero__inner">
          <div>
            <h1>Danh sách yêu thích</h1>
            <p>Lưu các tin đăng anh quan tâm để xem lại nhanh chóng.</p>
          </div>
        </div>
      </section>

      <section className="container re-layout">
        <div className="re-main">
          <header className="re-results__head">
            <div>
              <h2>Tin đã lưu</h2>
              {loading ? (
                <p>Đang tải...</p>
              ) : (
                <p>{totalCount.toLocaleString()} tin yêu thích</p>
              )}
            </div>

            {/* Thanh action gọn gàng bên phải */}
            {totalCount > 0 && (
              <div className="wishlist-toolbar">
                <label className="wishlist-select-all">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                  <span>Chọn tất cả</span>
                </label>

                <span className="wishlist-toolbar__info">
                  Đã chọn {selectedCount}/{totalCount}
                </span>

                {/* CHỈ hiện khi: 0 < selected < total */}
                {selectedCount > 0 && selectedCount < totalCount && (
                  <button
                    type="button"
                    className="re-btn re-btn--ghost"
                    onClick={handleDeleteSelected}
                  >
                    Xoá mục đã chọn
                  </button>
                )}

                <button
                  type="button"
                  className="re-btn re-btn--ghost"
                  onClick={clearWishlist}
                >
                  Xoá tất cả
                </button>
              </div>
            )}
          </header>

          {error && <p className="re-error">{error}</p>}

          {!loading && totalCount === 0 && !error && (
            <div className="re-empty">
              <p>Chưa có tin nào trong danh sách yêu thích.</p>
              <button
                type="button"
                className="re-btn re-btn--primary"
                onClick={goExplore}
              >
                Bắt đầu khám phá
              </button>
            </div>
          )}

          <div className="re-grid">
            {items.map(it => {
              const checked = selectedIds.includes(Number(it.id))

              return (
                <article
                  key={it.id}
                  className={'re-card' + (it.vip ? ' is-vip' : '')}
                >
                  <div className="re-card__media">
                    <img src={it.img} alt={it.title} />
                    {it.vip && <span className="re-badge">VIP</span>}

                    {/* nút xoá khỏi yêu thích ở góc ảnh */}
                    <button
                      type="button"
                      className="re-card__fav-btn is-on"
                      onClick={() => removeFromWishlist(it.id)}
                      aria-label="Xoá khỏi yêu thích"
                    >
                      ♥
                    </button>
                  </div>

                  <div className="re-card__body">
                    <h3 className="re-card__title" title={it.title}>
                      {it.title}
                    </h3>

                    {/* Category nhỏ (nếu có) */}
                    {it.category_name && (
                      <div className="re-card__cat">
                        {it.category_name}
                      </div>
                    )}

                    <div className="re-card__meta">
                      <span className="price">
                        {it.price?.toLocaleString()} ₫/tháng
                      </span>
                      {!!it.area && (
                        <>
                          <span className="dot">•</span>
                          <span>{it.area} m²</span>
                        </>
                      )}
                      {it.addr && (
                        <>
                          <span className="dot">•</span>
                          <span>{it.addr}</span>
                        </>
                      )}
                    </div>

                    {/* FOOT: checkbox chọn + nút xem chi tiết */}
                    <div className="re-card__foot re-card__foot--wishlist">
                      <label className="wishlist-card-select">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(it.id)}
                        />
                        <span>Chọn xoá</span>
                      </label>

                      <span className="time">{it.time}</span>

                      <Link
                        to={`/post/${it.id}`}
                        className="re-btn re-btn--line"
                      >
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        {/* aside bên phải */}
        <aside className="re-aside">
          <div className="re-filtercard">
            <h3>Mẹo sử dụng</h3>
            <p>
              Nhấn biểu tượng ♥ trên mỗi tin để thêm hoặc xoá khỏi danh
              sách yêu thích.
            </p>
            <p>
              Dùng ô chọn bên trái để chọn nhiều tin, sau đó bấm
              <br />
              <strong>“Xoá mục đã chọn”</strong> để xoá nhanh.
            </p>
          </div>
        </aside>
      </section>
    </div>
  )
}
