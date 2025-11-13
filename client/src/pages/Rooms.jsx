// src/pages/RoomsExplore.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../assets/style/style.css'

/** Bộ lọc giá & diện tích cho Phòng trọ */
const PRICE = [
  { v: '', t: 'Mức giá' },
  { v: '0-1500000', t: '< 1.5 triệu' },
  { v: '1500000-3000000', t: '1.5–3 triệu' },
  { v: '3000000-5000000', t: '3–5 triệu' },
  { v: '5000000-8000000', t: '5–8 triệu' },
  { v: '8000000-999999999', t: '> 8 triệu' },
]

const AREA = [
  { v: '', t: 'Diện tích' },
  { v: '0-15', t: '< 15 m²' },
  { v: '15-25', t: '15–25 m²' },
  { v: '25-40', t: '25–40 m²' },
  { v: '40-60', t: '40–60 m²' },
  { v: '60-999', t: '> 60 m²' },
]

const AMENITIES = [
  { k: 'co-gac', t: 'Có gác' },
  { k: 'wc-rieng', t: 'WC riêng' },
  { k: 'khu-bep', t: 'Có khu bếp' },
  { k: 'may-lanh', t: 'Máy lạnh' },
  { k: 'ban-cong', t: 'Ban công/cửa sổ' },
  { k: 'giu-xe', t: 'Giữ xe' },
]

const environment = [
  { k: 'gan-truong', t: 'Gần trường học' },
  { k: 'gan-cho', t: 'Gần chợ' },
  { k: 'gan-bv', t: 'Gần bệnh viện' },
  { k: 'ben-xe-bus', t: 'Bến xe bus' },
  { k: 'sieu-thi', t: 'Siêu thị / TTTM' },
  { k: 'khu-an-ninh', t: 'Khu an ninh' },
]

const member = [
  { k: 'sinh-vien', t: 'Sinh viên' },
  { k: 'nhan-vien-vp', t: 'Nhân viên văn phòng' },
  { k: 'gia-dinh-nho', t: 'Gia đình nhỏ' },
  { k: 'o-ghep', t: 'Ở ghép' },
]

const policy = [
  { k: 'gio-giac-tu-do', t: 'Giờ giấc tự do' },
  { k: 'nuoi-thu-cung', t: 'Nuôi thú cưng' },
  { k: 'khong-chung-chu', t: 'Không ở chung chủ' },
]

/** Mock data Phòng trọ (sau này thay bằng API) */
const MOCK_ROOMS = Array.from({ length: 36 }).map((_, i) => ({
  id: i + 1,
  title: `Phòng trọ full nội thất, gần trung tâm #${i + 1}`,
  price: [1200000, 1500000, 2000000, 2500000, 3000000, 3500000][i % 6],
  area: [12, 15, 18, 20, 25, 30, 35][i % 7],
  addr: ['Q.7, TP.HCM', 'Q.1, TP.HCM', 'Bình Thạnh, TP.HCM', 'TP. Thủ Đức'][i % 4],
  img: `https://picsum.photos/seed/room${i + 1}/1200/800`,
  vip: i % 4 === 0,
  time: i % 2 === 0 ? 'Hôm nay' : 'Hôm qua',
}))

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

export default function RoomsExplore() {
  const nav = useNavigate()
  const { search } = useLocation()
  const qs = new URLSearchParams(search)

  // ===== state =====
  const [q, setQ] = useState(qs.get('q') || '')
  const [province, setProvince] = useState(qs.get('province') || '')
  const [district, setDistrict] = useState(qs.get('district') || '')
  const [price, setPrice] = useState(qs.get('price') || '')
  const [area, setArea] = useState(qs.get('area') || '')
  const [amen, setAmen] = useState((qs.get('amen') || '').split(',').filter(Boolean))
  const [sort, setSort] = useState(qs.get('sort') || 'new')
  const [page, setPage] = useState(Number(qs.get('page') || 1))

  /** 8 tin mỗi trang */
  const PAGE_SIZE = 8

  // data
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)

  // sticky shadow cho thanh filter-top
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

  // Lọc + sắp xếp + chia trang (mock)
  useEffect(() => {
    let data = [...MOCK_ROOMS]

    if (q) data = data.filter(d => d.title.toLowerCase().includes(q.toLowerCase()))
    if (price) {
      const [mi, ma] = price.split('-').map(Number)
      data = data.filter(d => d.price >= mi && d.price <= ma)
    }
    if (area) {
      const [mi, ma] = area.split('-').map(Number)
      data = data.filter(d => d.area >= mi && d.area <= ma)
    }
    // amen / environment / member / policy: khi có API thật thì lọc phía server

    if (sort === 'price_asc') data.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') data.sort((a, b) => b.price - a.price)
    else if (sort === 'area_desc') data.sort((a, b) => b.area - a.area)

    setTotal(data.length)
    const start = (page - 1) * PAGE_SIZE
    setItems(data.slice(start, start + PAGE_SIZE))
  }, [q, province, district, price, area, amen, sort, page])

  // sync URL query
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

    nav({ search: p.toString() }) // chỉ đổi query, không đổi path
  }, [q, province, district, price, area, amen, sort, page, nav])

  const toggleAmen = k => {
    setAmen(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]))
    setPage(1)
  }

  const chips = useMemo(() => {
    const arr = []
    if (q) arr.push({ k: 'q', t: `"${q}"` })
    if (province) arr.push({ k: 'province', t: province })
    if (district) arr.push({ k: 'district', t: district })
    if (price) arr.push({ k: 'price', t: PRICE.find(x => x.v === price)?.t })
    if (area) arr.push({ k: 'area', t: AREA.find(x => x.v === area)?.t })

    // gom label cho tất cả amen/environment/member/policy
    const amenLabelPool = [...AMENITIES, ...environment, ...member, ...policy]

    amen.forEach(a => {
      const label = amenLabelPool.find(x => x.k === a)?.t || a
      arr.push({ k: 'amen', v: a, t: label })
    })

    return arr
  }, [q, province, district, price, area, amen])

  const clearChip = (k, v) => {
    if (k === 'q') setQ('')
    if (k === 'province') setProvince('')
    if (k === 'district') setDistrict('')
    if (k === 'price') setPrice('')
    if (k === 'area') setArea('')
    if (k === 'amen') setAmen(s => s.filter(x => x !== v))
    setPage(1)
  }

  const clearAll = () => {
    setQ('')
    setProvince('')
    setDistrict('')
    setPrice('')
    setArea('')
    setAmen([])
    setPage(1)
    setSort('new')
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="re">
      {/* HERO */}
      <section className="re-hero u-fullbleed">
        <div className="container re-hero__inner">
          <div>
            <h1>Khám phá phòng trọ • phòng cho thuê</h1>
            <p>Nhiều mức giá, phù hợp sinh viên & người đi làm.</p>
          </div>
          <img
            className="re-hero__art"
            src="https://picsum.photos/seed/hero-rooms/680/380"
            alt="Phòng trọ cho thuê"
          />
        </div>
      </section>

      {/* THANH TÌM TRÊN CÙNG */}
      <div className="rebar u-fullbleed" ref={barRef}>
        <div className="container rebar__inner">
          <form
            className="rebar-search"
            onSubmit={e => {
              e.preventDefault()
              setPage(1)
            }}
          >
            <div className="re-input re-input--grow">
              <span className="re-ico">🔎</span>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Từ khoá, khu vực, gần trường, gần chợ..."
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
              <option>TP. Hồ Chí Minh</option>
              <option>Hà Nội</option>
              <option>Đà Nẵng</option>
            </select>
            <select
              className="re-input"
              value={district}
              onChange={e => setDistrict(e.target.value)}
            >
              <option value="">Quận/Huyện</option>
              <option>Quận 1</option>
              <option>Quận 7</option>
              <option>Bình Thạnh</option>
              <option>TP. Thủ Đức</option>
            </select>
            <select
              className="re-input"
              value={price}
              onChange={e => {
                setPrice(e.target.value)
                setPage(1)
              }}
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
              onChange={e => {
                setArea(e.target.value)
                setPage(1)
              }}
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
              onChange={e => {
                setSort(e.target.value)
                setPage(1)
              }}
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
              <h2>Phòng trọ</h2>
              <p>{total.toLocaleString()} tin phù hợp</p>
            </div>
          </header>

          <div className="re-grid">
            {items.map(it => (
              <article key={it.id} className={'re-card' + (it.vip ? ' is-vip' : '')}>
                <div className="re-card__media">
                  <img src={it.img} alt={it.title} />
                  {it.vip && <span className="re-badge">VIP</span>}
                </div>
                <div className="re-card__body">
                  <h3 className="re-card__title" title={it.title}>
                    {it.title}
                  </h3>
                  <div className="re-card__meta">
                    <span className="price">{it.price.toLocaleString()} ₫/tháng</span>
                    <span className="dot">•</span>
                    <span>{it.area} m²</span>
                    <span className="dot">•</span>
                    <span>{it.addr}</span>
                  </div>
                  <div className="re-card__foot">
                    <span className="time">{it.time}</span>
                    <Link to={`/post/${it.id}`} className="re-btn re-btn--line">
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </article>
            ))}
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
              )
            )}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </nav>
        </div>

        {/* RIGHT: ASIDE FILTER (sticky) */}
        <aside className="re-aside">
          <div className="re-filtercard">
            <h3>Bộ lọc nhanh</h3>

            <div className="re-field">
              <label>Tỉnh/Thành</label>
              <select
                value={province}
                onChange={e => {
                  setProvince(e.target.value)
                  setDistrict('')
                  setPage(1)
                }}
              >
                <option value="">Tất cả</option>
                <option>TP. Hồ Chí Minh</option>
                <option>Hà Nội</option>
                <option>Đà Nẵng</option>
              </select>
            </div>

            <div className="re-field">
              <label>Quận/Huyện</label>
              <select
                value={district}
                onChange={e => {
                  setDistrict(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Tất cả</option>
                <option>Quận 1</option>
                <option>Quận 7</option>
                <option>Bình Thạnh</option>
                <option>TP. Thủ Đức</option>
              </select>
            </div>

            <div className="re-field">
              <label>Mức giá</label>
              <select
                value={price}
                onChange={e => {
                  setPrice(e.target.value)
                  setPage(1)
                }}
              >
                {PRICE.map(o => (
                  <option key={o.v} value={o.v}>
                    {o.t}
                  </option>
                ))}
              </select>
            </div>

            <div className="re-field">
              <label>Diện tích</label>
              <select
                value={area}
                onChange={e => {
                  setArea(e.target.value)
                  setPage(1)
                }}
              >
                {AREA.map(o => (
                  <option key={o.v} value={o.v}>
                    {o.t}
                  </option>
                ))}
              </select>
            </div>

            <div className="re-field">
              <label>Tiện ích</label>
              <div className="re-checklist">
                {AMENITIES.map(a => (
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
                {environment.map(a => (
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
              <label>Đối tượng</label>
              <div className="re-checklist">
                {member.map(a => (
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
              <label>Chính sách</label>
              <div className="re-checklist">
                {policy.map(a => (
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
                value={sort}
                onChange={e => {
                  setSort(e.target.value)
                  setPage(1)
                }}
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
                onClick={() => setPage(1)}
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
      </section>
    </div>
  )
}
