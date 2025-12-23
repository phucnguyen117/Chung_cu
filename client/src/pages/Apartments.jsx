// src/pages/ApartmentsExplore.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../assets/style/style.css'

// ==== DÙNG CHUNG: Chuẩn hoá mọi kiểu object ảnh thành URL string ====
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

// ===== CẤU HÌNH API =====
const API_BASE_URL =
  (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api'

/** Bộ lọc giá & diện tích cho Căn hộ */
const PRICE = [
  { v: '', t: 'Mức giá' },
  { v: '0-3000000', t: '< 3 triệu' },
  { v: '3000000-6000000', t: '3–6 triệu' },
  { v: '6000000-10000000', t: '6–10 triệu' },
  { v: '10000000-15000000', t: '10–15 triệu' },
  { v: '15000000-999999999', t: '> 15 triệu' },
]

const AREA = [
  { v: '', t: 'Diện tích' },
  { v: '0-25', t: '< 25 m²' },
  { v: '25-40', t: '25–40 m²' },
  { v: '40-60', t: '40–60 m²' },
  { v: '60-90', t: '60–90 m²' },
  { v: '90-999', t: '> 90 m²' },
]

// Các nhóm “đối tượng” + “chính sách” – để cứng
const member = [
  { k: 'gia-dinh', t: 'Gia đình' },
  { k: 'cap-doi', t: 'Cặp đôi' },
  { k: 'nhan-vien-vp', t: 'Nhân viên văn phòng' },
  { k: 'chuyen-gia', t: 'Chuyên gia / người nước ngoài' },
]

const policy = [
  { k: 'gio-giac-tu-do', t: 'Giờ giấc tự do' },
  { k: 'nuoi-thu-cung', t: 'Nuôi thú cưng' },
]

/** Helper: danh sách trang có “…” */
function pageList(totalPages, current) {
  const delta = 1
  const range = []
  const left = Math.max(2, current - delta)
  const right = Math.min(totalPages - 1, current + delta)
  range.push(1)
  if (left > 2) range.push('...')
  for (let i = left; i <= right; i++) range.push(i)
  if (right < totalPages - 1) range.push('...')
  if (totalPages > 1) range.push(totalPages)
  return range
}

// category_id = 3 cho Căn hộ
const CATEGORY_ID = 3

export default function ApartmentsExplore() {
  const nav = useNavigate()
  const { search } = useLocation()
  const qs = new URLSearchParams(search)

  // ==== LOCATION STATE (TỈNH / QUẬN) ====
  const [provinceList, setProvinceList] = useState([])
  const [districtList, setDistrictList] = useState([])

  // ==== FILTER STATE (dùng để LỌC THỰC TẾ) ====
  const [q, setQ] = useState(qs.get('q') || '')
  const [province, setProvince] = useState(qs.get('province') || '')
  const [district, setDistrict] = useState(qs.get('district') || '')
  const [price, setPrice] = useState(qs.get('price') || '')
  const [area, setArea] = useState(qs.get('area') || '')
  const [amen, setAmen] = useState(
    (qs.get('amen') || '').split(',').filter(Boolean),
  )
  const [sort, setSort] = useState(qs.get('sort') || 'new')
  const [page, setPage] = useState(Number(qs.get('page') || 1))

  // version filter đã APPLY – chỉ khi tăng version mới lọc lại
  const [appliedVersion, setAppliedVersion] = useState(0)

  const PAGE_SIZE = 8

  // ==== DATA STATE ====
  const [rawItems, setRawItems] = useState([]) // tất cả apartments từ API
  const [items, setItems] = useState([]) // sau khi lọc + phân trang
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ==== OPTIONS TỪ BACKEND (amenities + environment) ====
  const [amenityOptions, setAmenityOptions] = useState([])
  const [envOptions, setEnvOptions] = useState([])

  // ==== STICKY BAR ====
  const barRef = useRef(null)
  useEffect(() => {
    const onScroll = () => {
      if (!barRef.current) return
      barRef.current.classList.toggle('rebar--scrolled', window.scrollY > 140)
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ==== MOBILE FILTER OVERLAY ====
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  // ===== LẤY DANH SÁCH TỈNH / THÀNH =====
  useEffect(() => {
    async function loadProvinces() {
      try {
        const res = await axios.get(`${API_BASE_URL}/provinces`)
        const data = res.data.data || res.data
        setProvinceList(data)
      } catch (err) {
        console.error('Lỗi load provinces', err)
      }
    }
    loadProvinces()
  }, [])

  // ===== LẤY DANH SÁCH QUẬN / HUYỆN KHI ĐỔI TỈNH =====
  useEffect(() => {
    if (!province) {
      setDistrictList([])
      setDistrict('')
      return
    }

    async function loadDistricts() {
      try {
        const res = await axios.get(`${API_BASE_URL}/districts`, {
          params: { province_id: province }, // province đang là id tỉnh
        })
        const data = res.data.data || res.data
        setDistrictList(data)
      } catch (err) {
        console.error('Lỗi load districts', err)
      }
    }

    loadDistricts()
  }, [province])

  // ===== LẤY LIST TIỆN ÍCH & ĐẶC ĐIỂM MÔI TRƯỜNG TỪ API =====
  useEffect(() => {
    const normalizeOptions = raw =>
      (raw || []).map(item => ({
        k: item.slug || item.key || String(item.id),
        t: item.name || item.label || item.title || '',
      }))

    async function loadOptions() {
      try {
        const [amenRes, envRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/amenities`),
          axios.get(`${API_BASE_URL}/environment-features`),
        ])

        const amenData = amenRes.data.data || amenRes.data
        const envData = envRes.data.data || envRes.data

        setAmenityOptions(normalizeOptions(amenData))
        setEnvOptions(normalizeOptions(envData))
      } catch (err) {
        console.error('Lỗi load amenities / environment-features', err)
      }
    }

    loadOptions()
  }, [])

  // ===== LẤY DANH SÁCH CĂN HỘ (CATEGORY_ID = 3) =====
  useEffect(() => {
    async function loadApartments() {
      try {
        setLoading(true)
        setError('')

        const res = await axios.get(
          `${API_BASE_URL}/categories/${CATEGORY_ID}/posts`,
        )

        const posts = res.data.posts || res.data.data || res.data || []

        const mapped = posts
          .filter(p => p.status === 'published')
          .map(p => {
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

            const rawAmenities = Array.isArray(p.amenities)
              ? p.amenities
              : Array.isArray(p.post_amenities)
              ? p.post_amenities
              : []

            const normalizedAmenities = rawAmenities.map(a => ({
              id: a.id,
              name:
                a.name ||
                a.label ||
                a.title ||
                a.slug ||
                a.key ||
                '',
            }))

            const rawEnv = Array.isArray(p.environment_features)
              ? p.environment_features
              : Array.isArray(p.env_features)
              ? p.env_features
              : []

            const normalizedEnv = rawEnv.map(e => ({
              id: e.id,
              name:
                e.name ||
                e.label ||
                e.title ||
                e.slug ||
                e.key ||
                '',
            }))

            return {
              id: p.id,
              title: p.title,
              price: Number(p.price) || 0,
              area: Number(p.area) || 0,
              addr: p.address || p.full_address || '',
              img: firstImg,
              vip: p.is_vip === 1 || p.vip === 1,
              time: new Date(
                p.created_at || Date.now(),
              ).toLocaleDateString('vi-VN'),
              province_id: p.province_id || null,
              district_id: p.district_id || null,
              amenities: normalizedAmenities,
              env_features: normalizedEnv,
            }
          })

        setRawItems(mapped)
      } catch (e) {
        console.error(e)
        setError('Không tải được danh sách căn hộ cho thuê.')
      } finally {
        setLoading(false)
      }
    }

    loadApartments()
  }, [])

  // ===== FILTER + SORT + PAGINATE =====
  useEffect(() => {
    let data = [...rawItems]

    if (q) {
      const qLower = q.toLowerCase()
      data = data.filter(d => d.title.toLowerCase().includes(qLower))
    }

    if (province) {
      data = data.filter(d => String(d.province_id) === String(province))
    }
    if (district) {
      data = data.filter(d => String(d.district_id) === String(district))
    }

    if (price) {
      const [mi, ma] = price.split('-').map(Number)
      data = data.filter(d => d.price >= mi && d.price <= ma)
    }
    if (area) {
      const [mi, ma] = area.split('-').map(Number)
      data = data.filter(d => d.area >= mi && d.area <= ma)
    }

    if (sort === 'price_asc') data.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') data.sort((a, b) => b.price - a.price)
    else if (sort === 'area_desc') data.sort((a, b) => b.area - a.area)
    // sort === 'new' giữ order mặc định từ API

    setTotal(data.length)
    const start = (page - 1) * PAGE_SIZE
    setItems(data.slice(start, start + PAGE_SIZE))
  }, [rawItems, appliedVersion, page])

  // ===== SYNC QUERY LÊN URL =====
  useEffect(() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (province) p.set('province', province)
    if (district) p.set('district', district)
    if (price) p.set('price', price)
    if (area) p.set('area', area)
    if (amen.length) p.set('amen', amen.join(','))
    if (sort !== 'new') p.set('sort', sort)
    if (page > 1) p.set('page', String(page))
    nav({ search: p.toString() })
  }, [appliedVersion, page, nav])

  const toggleAmen = k => {
    setAmen(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]))
  }

  const chips = useMemo(() => {
    const arr = []
    if (q) arr.push({ k: 'q', t: `"${q}"` })

    if (province) {
      const pObj = provinceList.find(p => String(p.id) === String(province))
      arr.push({ k: 'province', t: pObj?.name || 'Tỉnh/Thành' })
    }
    if (district) {
      const dObj = districtList.find(d => String(d.id) === String(district))
      arr.push({ k: 'district', t: dObj?.name || 'Quận/Huyện' })
    }
    if (price) arr.push({ k: 'price', t: PRICE.find(x => x.v === price)?.t })
    if (area) arr.push({ k: 'area', t: AREA.find(x => x.v === area)?.t })

    const amenLabelPool = [...amenityOptions, ...envOptions, ...member, ...policy]
    amen.forEach(a => {
      const label = amenLabelPool.find(x => x.k === a)?.t || a
      arr.push({ k: 'amen', v: a, t: label })
    })

    return arr
  }, [
    appliedVersion,
    provinceList,
    districtList,
    q,
    province,
    district,
    price,
    area,
    amen,
    amenityOptions,
    envOptions,
  ])

  const clearChip = (k, v) => {
    if (k === 'q') setQ('')
    if (k === 'province') setProvince('')
    if (k === 'district') setDistrict('')
    if (k === 'price') setPrice('')
    if (k === 'area') setArea('')
    if (k === 'amen') setAmen(s => s.filter(x => x !== v))
    setPage(1)
    setAppliedVersion(ver => ver + 1)
  }

  const clearAll = () => {
    setQ('')
    setProvince('')
    setDistrict('')
    setPrice('')
    setArea('')
    setAmen([])
    setSort('new')
    setPage(1)
    setAppliedVersion(ver => ver + 1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const applyFilters = () => {
    setPage(1)
    setAppliedVersion(ver => ver + 1)
  }

  return (
    <div className="re">
      {/* HERO */}
      <section
        className="re-hero u-fullbleed"
        style={{
          backgroundImage:
            'url("https://noithatthanglongplus.com/wp-content/uploads/2019/07/banner-nha-dep.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="container re-hero__inner">
          <div>
            <h1>Khám phá căn hộ • studio • officetel</h1>
            <p>Lọc chi tiết, gợi ý thông minh &amp; tin xác thực.</p>
          </div>
        </div>
      </section>

      {/* THANH TÌM TRÊN CÙNG */}
      <div className="rebar u-fullbleed" ref={barRef}>
        <div className="container rebar__inner">
          <form
            className="rebar-search rebar-search--compact"
            onSubmit={e => {
              e.preventDefault()
              applyFilters()
            }}
          >
            <div className="re-input re-input--grow">
              <span className="re-ico">🔎</span>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Từ khoá, khu vực, toà nhà..."
              />
            </div>

            <select
              className="re-input"
              value={province}
              onChange={e => {
                setProvince(e.target.value)
                setDistrict('')
              }}
            >
              <option value="">Tỉnh/Thành</option>
              {provinceList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="re-input"
              value={district}
              onChange={e => setDistrict(e.target.value)}
              disabled={!province}
            >
              <option value="">Quận/Huyện</option>
              {districtList.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              className="re-input"
              value={price}
              onChange={e => setPrice(e.target.value)}
            >
              {PRICE.map(o => (
                <option key={o.v} value={o.v}>
                  {o.t}
                </option>
              ))}
            </select>

            <select
              className="re-input"
              value={area}
              onChange={e => setArea(e.target.value)}
            >
              {AREA.map(o => (
                <option key={o.v} value={o.v}>
                  {o.t}
                </option>
              ))}
            </select>

            <select
              className="re-input"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              <option value="new">Tin mới</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="area_desc">Diện tích lớn</option>
            </select>

            <button className="re-btn re-btn--primary" type="submit">
              Tìm
            </button>
          </form>
        </div>
      </div>

      {/* BỐ CỤC 2 CỘT */}
      <section className="container re-layout">
        {/* LEFT: KẾT QUẢ */}
        <div className="re-main">
          {chips.length > 0 && (
            <div className="re-chips">
              {chips.map((c, i) => (
                <button
                  key={i}
                  className="re-chip is-active"
                  onClick={() => clearChip(c.k, c.v)}
                  type="button"
                >
                  {c.t} <span className="x">×</span>
                </button>
              ))}
              <button className="re-linkclear" type="button" onClick={clearAll}>
                Xoá tất cả
              </button>
            </div>
          )}

          <header className="re-results__head">
            <div>
              <h2>Căn hộ</h2>
              {loading ? (
                <p>Đang tải...</p>
              ) : (
                <p>{total.toLocaleString()} tin phù hợp</p>
              )}
            </div>

            {/* nút lọc nhanh – ẩn trên desktop bằng CSS */}
            <button
              type="button"
              className="re-btn re-btn--ghost re-results__filter-btn"
              onClick={() => setShowMobileFilter(true)}
            >
              Bộ lọc nhanh
            </button>
          </header>

          {error && <p className="re-error">{error}</p>}

          <div className="re-grid">
            {items.map(it => {
              const amenToShow =
                (it.amenities && it.amenities.length
                  ? it.amenities
                  : it.env_features || []
                ).slice(0, 3)

              return (
                <article
                  key={it.id}
                  className={'re-card' + (it.vip ? ' is-vip' : '')}
                >
                  <div className="re-card__media">
                    <img src={it.img} alt={it.title} />
                    {it.vip && <span className="re-badge">VIP</span>}
                  </div>
                  <div className="re-card__body">
                    <h3 className="re-card__title" title={it.title}>
                      {it.title}
                    </h3>

                    <div className="re-card__meta">
                      <span className="price">
                        {it.price?.toLocaleString()} ₫/tháng
                      </span>
                      <span className="dot">•</span>
                      <span>{it.area} m²</span>
                      <span className="dot">•</span>
                      <span>{it.addr}</span>
                    </div>

                    {amenToShow.length > 0 && (
                      <div className="re-card__amen">
                        {amenToShow.map(a => (
                          <span
                            key={a.id || a.name}
                            className="re-card__tag"
                          >
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="re-card__foot">
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

          {/* PHÂN TRANG */}
          <nav className="re-paging" aria-label="pagination">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ‹
            </button>
            {pageList(totalPages, page).map((n, idx) =>
              n === '...' ? (
                <span key={`e${idx}`} className="re-paging__ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  className={page === n ? 'is-on' : ''}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ),
            )}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </nav>
        </div>

        {/* RIGHT: ASIDE FILTER – desktop */}
        <aside className="re-aside">
          <div className="re-filtercard">
            <h3>Bộ lọc nhanh</h3>

            <div className="re-field">
              <label>Tiện ích</label>
              <div className="re-checklist">
                {amenityOptions.map(a => (
                  <label key={a.k} className="re-check">
                    <input
                      type="checkbox"
                      checked={amen.includes(a.k)}
                      onChange={() => toggleAmen(a.k)}
                    />
                    <span>{a.t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="re-field">
              <label>Môi trường xung quanh</label>
              <div className="re-checklist">
                {envOptions.map(a => (
                  <label key={a.k} className="re-check">
                    <input
                      type="checkbox"
                      checked={amen.includes(a.k)}
                      onChange={() => toggleAmen(a.k)}
                    />
                    <span>{a.t}</span>
                  </label>
                ))}
              </div>
            </div>



            <div className="re-field">
              <label>Sắp xếp</label>
              <select
                className="re-input"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="new">Tin mới</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="area_desc">Diện tích lớn</option>
              </select>
            </div>

            <div className="re-filtercard__actions">
              <button
                type="button"
                className="re-btn re-btn--primary"
                onClick={applyFilters}
              >
                Áp dụng
              </button>
              <button
                type="button"
                className="re-btn re-btn--ghost"
                onClick={clearAll}
              >
                Xoá bộ lọc
              </button>
            </div>
          </div>
        </aside>

        {/* POPUP BỘ LỌC NHANH MOBILE */}
        {showMobileFilter && (
          <>
            <div
              className="mobile-filter-backdrop"
              onClick={() => setShowMobileFilter(false)}
            />
            <div
              className="mobile-filter-panel"
              onClick={() => setShowMobileFilter(false)}
            >
              <div
                className="mobile-filter-panel__inner"
                onClick={e => e.stopPropagation()}
              >
                <div className="mobile-filter-panel__header">
                  <h3>Bộ lọc nhanh</h3>
                  <button
                    type="button"
                    className="mobile-filter-close"
                    onClick={() => setShowMobileFilter(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="mobile-filter-panel__body">
                  <div className="re-field">
                    <label>Tiện ích</label>
                    <div className="re-checklist">
                      {amenityOptions.map(a => (
                        <label key={a.k} className="re-check">
                          <input
                            type="checkbox"
                            checked={amen.includes(a.k)}
                            onChange={() => toggleAmen(a.k)}
                          />
                          <span>{a.t}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="re-field">
                    <label>Môi trường xung quanh</label>
                    <div className="re-checklist">
                      {envOptions.map(a => (
                        <label key={a.k} className="re-check">
                          <input
                            type="checkbox"
                            checked={amen.includes(a.k)}
                            onChange={() => toggleAmen(a.k)}
                          />
                          <span>{a.t}</span>
                        </label>
                      ))}
                    </div>
                  </div>



                  <div className="re-field">
                    <label>Sắp xếp</label>
                    <select
                      className="re-input"
                      value={sort}
                      onChange={e => setSort(e.target.value)}
                    >
                      <option value="new">Tin mới</option>
                      <option value="price_asc">Giá tăng dần</option>
                      <option value="price_desc">Giá giảm dần</option>
                      <option value="area_desc">Diện tích lớn</option>
                    </select>
                  </div>
                </div>

                <div className="mobile-filter-panel__actions">
                  <button
                    type="button"
                    className="re-btn re-btn--primary"
                    onClick={() => {
                      applyFilters()
                      setShowMobileFilter(false)
                    }}
                  >
                    Áp dụng
                  </button>
                  <button
                    type="button"
                    className="re-btn re-btn--ghost"
                    onClick={clearAll}
                  >
                    Xoá bộ lọc
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
