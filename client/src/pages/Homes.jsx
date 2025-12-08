// src/pages/Homes.jsx
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../assets/style/style.css'
import { api } from '@/api/axios'

// meta cho section "Khám theo loại chỗ ở"
const CATEGORY_META = {
  'phong-tro': {
    href: '/phong-tro',
    img: 'https://via.placeholder.com/400x400?text=Ph%C3%B2ng+tr%E1%BB%8D',
    desc: 'Giá mềm, phù hợp sinh viên & người đi làm.',
  },
  'can-ho': {
    href: '/can-ho',
    img: 'https://via.placeholder.com/400x400?text=C%C4%83n+h%E1%BB%99',
    desc: 'Không gian riêng, tiện nghi, an ninh tốt.',
  },
  'nha-nguyen-can': {
    href: '/nha-nguyen-can',
    img: 'https://via.placeholder.com/400x400?text=Nh%C3%A0+nguy%C3%AAn+c%C4%83n',
    desc: 'Thoải mái cho gia đình hoặc nhóm bạn.',
  },
  'ky-tuc-xa': {
    href: '/ky-tuc-xa',
    img: 'https://via.placeholder.com/400x400?text=K%C3%BD+t%C3%BAc+x%C3%A1',
    desc: 'Tiết kiệm, nhiều bạn bè, không lo cô đơn.',
  },
}

export default function Homes() {
  const nav = useNavigate()

  // ===== Form tìm kiếm nhanh =====
  const [keyword, setKeyword] = useState('')
  const [province, setProvince] = useState('')
  const [price, setPrice] = useState('')
  const [area, setArea] = useState('')

  // ===== Dữ liệu từ API =====
  const [featured, setFeatured] = useState([]) // tin nổi bật
  const [blogs, setBlogs] = useState([]) // bài blog mới nhất
  const [stats, setStats] = useState({ posts: 0, landlords: 0, views: 0 })
  const [provincesList, setProvincesList] = useState([])
  const [categories, setCategories] = useState([])
  const [loadingHome, setLoadingHome] = useState(true)
  const [homeError, setHomeError] = useState('')
  const [loadingBlogs, setLoadingBlogs] = useState(false)

  const guideRef = useRef(null)
  const scrollGuide = (dir) => {
    const el = guideRef.current
    if (!el) return
    const delta = el.clientWidth * 0.9
    el.scrollBy({ left: dir === 'left' ? -delta : delta, behavior: 'smooth' })
  }

  // ===== LOAD DATA TỪ BACKEND =====
  useEffect(() => {
    let mounted = true
    async function loadHome() {
      setLoadingHome(true)
      setHomeError('')
      try {
        const [postsRes, statsRes, provRes, catRes, blogsRes] = await Promise.all([
          api.get('/home/featured-posts'),
          api.get('/home/stats'),
          api.get('/provinces'),
          api.get('/categories'),
          api.get('/blogs').catch(() => ({ data: { data: [] } })), // fallback nếu không có blog endpoint
        ])

        if (!mounted) return

        // Tin nổi bật
        const postsData = postsRes?.data?.data || postsRes?.data || []
        const mapped = (postsData || []).map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          area: p.area,
          address: [p.address, p.ward?.name, p.district?.name, p.province?.name]
            .filter(Boolean)
            .join(', '),
          img:
            p.cover_image_url || p.cover_image || (p.images && p.images[0]?.url) ||
            'https://via.placeholder.com/1200x800?text=Apartment',
        }))
        setFeatured(mapped)

        // Stats
        const statsData = statsRes?.data || {}
        setStats({
          posts: statsData.total_posts || 0,
          landlords: statsData.total_users || 0,
          views: statsData.total_views || 0,
        })

        // Provinces
        const provData = provRes?.data?.data || provRes?.data || []
        setProvincesList(provData)

        // Categories
        const catData = catRes?.data?.data || catRes?.data || []
        setCategories(catData)

        // Blogs – lấy mới nhất, sắp xếp theo ngày
        const blogData = blogsRes?.data?.data || blogsRes?.data || []
        const sortedBlogs = (blogData || [])
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 4)
          .map((b) => ({
            id: b.id,
            title: b.title,
            excerpt: b.excerpt || b.description || 'Bài viết thú vị từ Homes.',
            img: b.featured_image || b.cover_image || 'https://via.placeholder.com/600x400?text=Blog',
            date: b.created_at ? new Date(b.created_at).toLocaleDateString('vi-VN') : '',
          }))
        setBlogs(sortedBlogs)
      } catch (err) {
        console.error('Lỗi load trang home:', err)
        setHomeError('Không tải được dữ liệu. Vui lòng thử lại sau.')
      } finally {
        if (mounted) setLoadingHome(false)
      }
    }

    loadHome()
    return () => {
      mounted = false
    }
  }, [])

  const submitSearch = (e) => {
    e.preventDefault()
    const qs = new URLSearchParams()
    if (keyword) qs.set('q', keyword)
    if (province) qs.set('province', province)
    if (price) qs.set('price', price)
    if (area) qs.set('area', area)
    nav('/' + (qs.toString() ? `?${qs.toString()}` : ''))
  }

  const mainFeatured = featured[0]
  const otherFeatured = featured.slice(1)

  // demo khu vực quanh trường / tiện ích – có thể giữ tĩnh
  const uniList_room = [
    { id: 1, name: 'Trường Đại học Kinh Tế Huế', logo: 'https://picsum.photos/seed/uni1/90/90' },
    { id: 2, name: 'Trường Đại học Sư phạm', logo: 'https://picsum.photos/seed/uni2/90/90' },
    { id: 3, name: 'Trường Đại học Khoa Học', logo: 'https://picsum.photos/seed/uni3/90/90' },
    { id: 4, name: 'Trường Đại học Y Tế Huế', logo: 'https://picsum.photos/seed/uni4/90/90' },
    { id: 5, name: 'Cao Đẳng Công Nghiệp Huế', logo: 'https://picsum.photos/seed/uni5/90/90' },
    { id: 6, name: 'xem thêm', more: true },
  ]

  const uniList_house = [
    { id: 1, name: 'bệnh viện', logo: 'https://picsum.photos/seed/uni6/90/90' },
    { id: 2, name: 'trường học', logo: 'https://picsum.photos/seed/uni7/90/90' },
    { id: 3, name: 'chợ', logo: 'https://picsum.photos/seed/uni8/90/90' },
    { id: 4, name: 'siêu thị', logo: 'https://picsum.photos/seed/uni9/90/90' },
    { id: 5, name: 'sông', logo: 'https://picsum.photos/seed/uni10/90/90' },
    { id: 6, name: 'hồ', more: true },
  ]

  const displayedCategories = categories.slice(0, 4)

  return (
    <div className="pthome">
      {/* ===== HERO ===== */}
      <section className="u-fullbleed homes-hero">
        <div className="container">
          <div className="homes-hero-grid">
            <div className="homes-hero-main">
              <span className="homes-hero-pill">Tìm phòng dễ – sống thoải mái</span>
              <h1>Homes – Tìm chỗ ở phù hợp với ngân sách & lối sống của bạn</h1>
              <p>
                Bộ lọc thông minh giúp bạn tìm phòng trọ, căn hộ, nhà nguyên căn, ký túc xá
                chỉ trong vài phút. Cập nhật liên tục, hình thật – thông tin rõ ràng.
              </p>

              <form className="homes-search" onSubmit={submitSearch}>
                <div className="homes-search-row">
                  <div className="homes-search-input">
                    <span className="icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Nhập khu vực, tên đường, trường học..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="homes-btn homes-btn--primary">
                    Tìm kiếm
                  </button>
                </div>

                <div className="homes-search-filters">
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  >
                    <option value="">Tỉnh / thành phố</option>
                    {provincesList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  >
                    <option value="">Khoảng giá</option>
                    <option value="0-2000000">&lt; 2 triệu</option>
                    <option value="2000000-5000000">2 – 5 triệu</option>
                    <option value="5000000-8000000">5 – 8 triệu</option>
                    <option value="8000000-999999999">&gt; 8 triệu</option>
                  </select>

                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    <option value="">Diện tích</option>
                    <option value="0-20">&lt; 20 m²</option>
                    <option value="20-35">20 – 35 m²</option>
                    <option value="35-60">35 – 60 m²</option>
                    <option value="60-999">Trên 60 m²</option>
                  </select>
                </div>
              </form>

              <div className="homes-hero-tags">
                <span>Gợi ý nhanh:</span>
                <button type="button">Gần trường</button>
                <button type="button">Căn hộ mini</button>
                <button type="button">Ở ghép</button>
                <button type="button">Nhà nguyên căn</button>
              </div>

              <ul className="homes-hero-stats">
                <li>
                  <strong>{stats.posts.toLocaleString('vi-VN')}</strong>
                  <span>Tin đang hiển thị</span>
                </li>
                <li>
                  <strong>{stats.landlords.toLocaleString('vi-VN')}</strong>
                  <span>Chủ trọ uy tín</span>
                </li>
                <li>
                  <strong>{stats.views.toLocaleString('vi-VN')}</strong>
                  <span>Lượt xem mỗi tháng</span>
                </li>
              </ul>
            </div>

            <div className="homes-hero-side">
              <div className="hero-card hero-card--map">
                <div className="hero-card__header">
                  <span>Bản đồ phòng trọ</span>
                  <span className="hero-status-dot">Đang hoạt động</span>
                </div>
                <div className="hero-map">
                  <div className="hero-map-pin pin-1"></div>
                  <div className="hero-map-pin pin-2"></div>
                  <div className="hero-map-pin pin-3"></div>
                  <div className="hero-map-pin pin-4"></div>
                </div>
              </div>

              <div className="hero-card hero-card--list">
                <div className="hero-list-row">
                  <div>
                    <p className="hero-list-title">Phòng trọ gần ĐH Kinh Tế</p>
                    <p className="hero-list-sub">Đi bộ 7 phút • full nội thất</p>
                  </div>
                  <span className="hero-list-price">2.8tr</span>
                </div>
                <div className="hero-list-row">
                  <div>
                    <p className="hero-list-title">Căn hộ mini Q.7</p>
                    <p className="hero-list-sub">Ban công thoáng • có thang máy</p>
                  </div>
                  <span className="hero-list-price">5.5tr</span>
                </div>
                <div className="hero-list-row">
                  <div>
                    <p className="hero-list-title">Ký túc xá máy lạnh</p>
                    <p className="hero-list-sub">Ở ghép 4 người • trung tâm</p>
                  </div>
                  <span className="hero-list-price">1.2tr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DANH MỤC THEO LOẠI CHỖ Ở ===== */}
      <section className="container homes-categories">
        <div className="homes-section-head">
          <div>
            <h2>Khám theo loại chỗ ở</h2>
            <p>Chọn đúng loại chỗ ở để lọc kết quả phù hợp hơn.</p>
          </div>
          <Link to="/" className="homes-link">Xem tất cả loại hình</Link>
        </div>

        <div className="homes-categories__list">
          {loadingHome ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 200,
                    background: '#111827',
                    borderRadius: 12,
                  }}
                />
              ))}
            </>
          ) : categories.length === 0 ? (
            <p className="homes-note">Chưa có danh mục nào.</p>
          ) : (
            categories.slice(0, 4).map((cat) => {
              const meta = CATEGORY_META[cat.slug] || {}
              const href = meta.href || `/category/${cat.id}`
              const img =
                meta.img ||
                'https://via.placeholder.com/400x400?text=Category'
              const desc = meta.desc || 'Danh mục phòng cho thuê.'
              return (
                <Link key={cat.id} to={href} className="homes-cat">
                  <div className="homes-cat__thumb">
                    <img src={img} alt={cat.name} />
                  </div>
                  <div className="homes-cat__info">
                    <h3>{cat.name}</h3>
                    <p>{desc}</p>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </section>

      {/* ===== TIN NỔI BẬT ===== */}
      <section className="container homes-featured">
        <div className="homes-section-head">
          <div>
            <h2>Tin nổi bật hôm nay</h2>
            <p>Các tin được xem nhiều, hình thật – thông tin rõ ràng.</p>
          </div>
          <Link to="/" className="homes-link">Xem tất cả tin</Link>
        </div>

        <div className="homes-featured__grid">
          {loadingHome ? (
            <>
              <div className="homes-featured__main" style={{minHeight:200,background:'#0b1220',borderRadius:12}}>
                <div style={{height:180,background:'#111827',borderRadius:8}} />
              </div>
              <div className="homes-featured__list">
                {[1,2,3].map((i)=> (
                  <div key={i} className="homes-featured__item" style={{display:'flex',gap:12,alignItems:'center'}}>
                    <div style={{width:120,height:80,background:'#111827',borderRadius:8}} />
                    <div style={{flex:1}}>
                      <div style={{height:12,background:'#0f1724',marginBottom:6,borderRadius:6}} />
                      <div style={{height:10,background:'#0f1724',width:'60%',borderRadius:6}} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {mainFeatured ? (
                <article className="homes-featured__main">
                  <div className="main-image">
                    <img src={mainFeatured.img} alt={mainFeatured.title} />
                    <span className="featured-chip">Nổi bật</span>
                  </div>
                  <div className="main-body">
                    <h3 title={mainFeatured.title}>{mainFeatured.title}</h3>
                    <div className="main-meta">
                      <span className="price">
                        {Number(mainFeatured.price || 0).toLocaleString('vi-VN')} ₫/tháng
                      </span>
                      <span>•</span>
                      <span>{mainFeatured.area} m²</span>
                      <span>•</span>
                      <span>{mainFeatured.address}</span>
                    </div>
                    <p>
                      Phòng rộng, ánh sáng tốt, nội thất cơ bản. Phù hợp bạn trẻ làm việc văn phòng
                      hoặc sinh viên muốn không gian riêng tư.
                    </p>
                    <div className="main-actions">
                      <Link
                        to={`/post/${mainFeatured.id}`}
                        className="homes-btn homes-btn--primary"
                      >
                        Xem chi tiết
                      </Link>
                      <button className="homes-btn homes-btn--ghost">Lưu tin</button>
                    </div>
                  </div>
                </article>
              ) : (
                <p className="homes-note">Chưa có tin nổi bật.</p>
              )}

              <div className="homes-featured__list">
                {otherFeatured.length === 0 && <p className="homes-note">Không có tin phụ.</p>}
                {otherFeatured.map((item) => (
                  <article key={item.id} className="homes-featured__item">
                    <div className="item-thumb">
                      <img src={item.img} alt={item.title} />
                    </div>
                    <div className="item-body">
                      <h4 title={item.title}>{item.title}</h4>
                      <div className="item-meta">
                        <span className="price">
                          {Number(item.price || 0).toLocaleString('vi-VN')} ₫/tháng
                        </span>
                        <span>•</span>
                        <span>{item.area} m²</span>
                      </div>
                      <p className="item-addr">{item.address}</p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===== PHÒNG TRỌ QUANH CÁC TRƯỜNG ===== */}
      <section className="container homes-uni">
        <div className="homes-uni__inner">
          <div className="homes-uni__intro">
            <h2>Phòng trọ quanh các trường</h2>
            <p>
              Dành riêng cho sinh viên: lọc nhanh phòng trọ theo từng trường, hạn chế di chuyển xa
              và tối ưu chi phí đi lại.
            </p>
            <ul className="homes-uni__bullet">
              <li>Khoảng cách rõ ràng, ước tính thời gian di chuyển.</li>
              <li>Ưu tiên khu vực an ninh, gần tiện ích thiết yếu.</li>
              <li>Lọc theo giá & hình thức ở (ở ghép, phòng riêng...).</li>
            </ul>
          </div>

          <div className="homes-uni__list">
            {uniList_room.map((u) => (
              <a
                key={u.id}
                href={u.more ? '/schools' : '/?q=' + encodeURIComponent(u.name)}
                className={'homes-uni__item' + (u.more ? ' is-more' : '')}
              >
                <div className="homes-uni__logo">
                  {!u.more ? (
                    <img src={u.logo} alt={u.name} />
                  ) : (
                    <span className="homes-uni__plus">+</span>
                  )}
                </div>
                <div className="homes-uni__info">
                  <p className="name">{u.more ? 'Xem thêm trường khác' : u.name}</p>
                  {!u.more && (
                    <p className="desc">Nhiều phòng trọ được sinh viên đánh giá tốt.</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CẨM NANG THUÊ PHÒNG (CAROUSEL) ===== */}
      {blogs.length > 0 && (
        <section className="container homes-guide">
          <div className="homes-section-head">
            <div>
              <h2>Cẩm nang thuê phòng</h2>
              <p>Kinh nghiệm thực tế khi đi xem trọ, thương lượng hợp đồng và dọn vào ở.</p>
            </div>
            <a className="homes-link" href="/blog">
              Xem tất cả bài viết
            </a>
          </div>

          <div className="homes-guide__wrap">
            <button
              className="homes-guide__nav is-left"
              onClick={() => scrollGuide('left')}
              aria-label="Prev"
            >
              ‹
            </button>

            <div className="homes-guide__track" ref={guideRef}>
              {blogs.map((b) => (
                <article className="homes-guide__card" key={b.id}>
                  <div className="homes-guide__media">
                    <img src={b.img} alt={b.title} />
                    <span className="homes-guide__date">{b.date}</span>
                  </div>
                  <div className="homes-guide__body">
                    <h3 className="homes-guide__title">{b.title}</h3>
                    <p className="homes-guide__excerpt">{b.excerpt}</p>
                    <a href="/blog" className="homes-link">
                      Đọc chi tiết
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <button
              className="homes-guide__nav is-right"
              onClick={() => scrollGuide('right')}
              aria-label="Next"
            >
              ›
            </button>
          </div>
        </section>
      )}

      {/* ===== CĂN HỘ GẦN KHU VỰC TIỆN LỢI ===== */}
      <section className="container homes-uni">
        <div className="homes-uni__inner">
          <div className="homes-uni__intro">
            <h2>Căn hộ gần các khu vực tiện lợi</h2>
            <p>Dành riêng cho gia đình hoặc cặp đôi tiện lợi đi lại</p>
            <ul className="homes-uni__bullet">
              <li>Khoảng cách rõ ràng, ước tính thời gian di chuyển.</li>
              <li>Ưu tiên khu vực an ninh, gần tiện ích thiết yếu.</li>
              <li>
                Lọc theo giá &amp; hình thức ở (chỉ 1 hoặc nhiều phòng ngủ, diện tích).
              </li>
            </ul>
          </div>

          <div className="homes-uni__list">
            {uniList_house.map((u) => (
              <a
                key={u.id}
                href={u.more ? '/schools' : '/?q=' + encodeURIComponent(u.name)}
                className={'homes-uni__item' + (u.more ? ' is-more' : '')}
              >
                <div className="homes-uni__logo">
                  {!u.more ? (
                    <img src={u.logo} alt={u.name} />
                  ) : (
                    <span className="homes-uni__plus">+</span>
                  )}
                </div>
                <div className="homes-uni__info">
                  <p className="name">{u.more ? 'Xem thêm trường khác' : u.name}</p>
                  {!u.more && (
                    <p className="desc">Nhiều phòng trọ được sinh viên đánh giá tốt.</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BLOG MỚI – chỉ hiện khi có blog ===== */}
      {blogs.length > 0 && (
        <section className="container homes-blog">
          <div className="homes-section-head">
            <div>
              <h2>Blog mới</h2>
              <p>Cập nhật kiến thức &amp; tips nhỏ giúp cuộc sống trọ dễ chịu hơn.</p>
            </div>
            <Link to="/blog" className="homes-link">
              Xem thêm bài viết
            </Link>
          </div>

          <div className="homes-blog__grid">
            {blogs.slice(0, 3).map((b) => (
              <article key={b.id} className="homes-blog__item">
                <div className="thumb">
                  <img src={b.img} alt={b.title} />
                </div>
                <div className="body">
                  <h3>{b.title}</h3>
                  <p>{b.excerpt}</p>
                  <Link to="/blog" className="homes-link">
                    Đọc bài
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
