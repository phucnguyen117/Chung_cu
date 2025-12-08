// src/components/Header.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import logo from '@/assets/images/logo.png'
import Login from '../pages/Login'
import Register from '../pages/Register'
import UserSettingsModal from '../components/UserSettingsModal'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

async function safeJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.warn(
      'Header: phản hồi không phải JSON',
      res.url,
      text.slice(0, 120),
    )
    return null
  }
}

export default function Header() {
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [user, setUser] = useState(null)
  const [indicatorStyle, setIndicatorStyle] = useState({})
  const [menuOpen, setMenuOpen] = useState(false) // dropdown avatar (desktop)
  const [drawerOpen, setDrawerOpen] = useState(false) // menu mobile

  // ====== WISHLIST ======
  const [wishlistCount, setWishlistCount] = useState(0)

  // ====== ADMIN NOTIFICATIONS ======
  const [hasAdminNotifications, setHasAdminNotifications] = useState(false)

  // danh sách 4 category hiển thị trên menu
  const [navCategories, setNavCategories] = useState([])

  const navRef = useRef(null)
  const userMenuRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  const navClass = ({ isActive }) =>
    'nav__link' + (isActive ? ' is-active' : '')

  const drawerNavClass = ({ isActive }) =>
    'header-drawer__link' + (isActive ? ' active' : '')

  // ===== Hiệu ứng viên thuốc nav (desktop) =====
  useEffect(() => {
    const navEl = navRef.current
    if (!navEl) return

    const active = navEl.querySelector('.nav__link.is-active')
    if (!active) {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }))
      return
    }

    const navRect = navEl.getBoundingClientRect()
    const itemRect = active.getBoundingClientRect()

    const left = itemRect.left - navRect.left - 6
    const width = itemRect.width + 12

    setIndicatorStyle({
      '--nav-indicator-left': `${left}px`,
      '--nav-indicator-width': `${width}px`,
      opacity: 1,
    })
  }, [location.pathname])

  // đóng drawer mỗi khi đổi route
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // ===== Lấy categories cho menu =====
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`, {
          headers: { Accept: 'application/json' },
        })
        const data = await safeJson(res)
        if (!res.ok) return

        let list = data?.data || data || []
        if (!Array.isArray(list)) list = []

        list = [...list].sort((a, b) => Number(a.id) - Number(b.id))
        setNavCategories(list.slice(0, 4))
      } catch (e) {
        console.error('Header: lỗi load categories cho menu:', e)
      }
    })()
  }, [])

  // ===== Hàm lấy user từ API khi chỉ có token =====
  const fetchUserFromApi = async token => {
    try {
      const res = await fetch('/api/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (!res.ok) throw new Error('Không lấy được thông tin user')

      const data = await res.json()
      const u = data.user || data.data || data

      setUser(u)
      localStorage.setItem('auth_user', JSON.stringify(u))
    } catch (e) {
      console.error('Lỗi fetch user từ /api/user:', e)
      setUser(null)
    }
  }

  // ===== Đọc user từ localStorage + fallback gọi /api/user =====
  useEffect(() => {
    const initAuth = () => {
      const raw = localStorage.getItem('auth_user')
      const token = localStorage.getItem('access_token')

      if (raw) {
        try {
          let parsed = JSON.parse(raw)
          if (parsed && parsed.user) parsed = parsed.user
          setUser(parsed || null)
          return
        } catch (e) {
          console.error('parse auth_user error', e)
        }
      }

      if (token) {
        fetchUserFromApi(token)
      } else {
        setUser(null)
      }
    }

    initAuth()
    window.addEventListener('auth:changed', initAuth)
    return () => window.removeEventListener('auth:changed', initAuth)
  }, [])

  // ====== INIT WISHLIST (localStorage + event) ======
  useEffect(() => {
    const initWishlist = () => {
      try {
        const raw = localStorage.getItem('wishlist_posts')
        if (!raw) {
          setWishlistCount(0)
          return
        }
        const parsed = JSON.parse(raw)
        setWishlistCount(Array.isArray(parsed) ? parsed.length : 0)
      } catch (e) {
        console.error('parse wishlist_posts error', e)
        setWishlistCount(0)
      }
    }

    initWishlist()
    window.addEventListener('wishlist:changed', initWishlist)
    return () =>
      window.removeEventListener('wishlist:changed', initWishlist)
  }, [])

  // ====== LOAD ADMIN NOTIFICATIONS ======
  useEffect(() => {
    const loadAdminNotifications = async () => {
      if (!user || user.role !== 'admin') {
        setHasAdminNotifications(false)
        return
      }

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        // Kiểm tra yêu cầu đăng bài
        const postsRes = await fetch(`${API_BASE_URL}/admin/pending-posts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })
        const postsData = postsRes.ok ? await safeJson(postsRes) : null
        const pendingPosts = Array.isArray(postsData?.data) ? postsData.data.length : 0

        // Kiểm tra yêu cầu cấp quyền lessor
        const lessorRes = await fetch(`${API_BASE_URL}/admin/pending-lessor`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })
        const lessorData = lessorRes.ok ? await safeJson(lessorRes) : null
        const pendingLessor = Array.isArray(lessorData?.data) ? lessorData.data.length : 0

        // Có notification nếu có yêu cầu nào
        setHasAdminNotifications(pendingPosts > 0 || pendingLessor > 0)
      } catch (e) {
        console.error('Header: lỗi load admin notifications:', e)
        setHasAdminNotifications(false)
      }
    }

    loadAdminNotifications()

    // Refresh mỗi 30 giây
    const interval = setInterval(loadAdminNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])


  // ===== Đóng dropdown khi click ngoài (desktop) =====
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = e => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // ===== Logout =====
  const handleLogout = async () => {
    const token = localStorage.getItem('access_token')

    try {
      if (token) {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('auth_user')
      // tuỳ anh: có thể clear luôn wishlist khi logout
      // localStorage.removeItem('wishlist_posts')
      setWishlistCount(0)
      setUser(null)
      window.dispatchEvent(new Event('auth:changed'))
      setMenuOpen(false)
      setDrawerOpen(false)

      if (location.pathname.startsWith('/admin')) {
        navigate('/')
      }
    }
  }

  const openLogin = () => {
    setDrawerOpen(false)
    setShowRegister(false)
    setShowLogin(true)
  }

  const openRegister = () => {
    setDrawerOpen(false)
    setShowLogin(false)
    setShowRegister(true)
  }

  // ===== Mở trang yêu thích =====
  const handleWishlistClick = () => {
    if (!user) {
      // chưa login -> bắt login trước
      openLogin()
      return
    }
    navigate('/wishlist')
    setMenuOpen(false)
    setDrawerOpen(false)
  }

  // ===== Avatar =====
  const avatarUrl =
    user?.avatar_url ||
    user?.avatar ||
    user?.avatarPath ||
    user?.profile_photo_url ||
    null

  const avatarChar = user?.name?.charAt(0)?.toUpperCase() || 'U'

  const categoryLinks = (
    <>
      {navCategories.length > 0 ? (
        navCategories.map(cat => (
          <NavLink key={cat.id} to={`/${cat.slug}`} className={navClass}>
            {cat.name}
          </NavLink>
        ))
      ) : (
        <>
          <NavLink to="/phong-tro" className={navClass}>
            Phòng trọ
          </NavLink>
          <NavLink to="/nha-nguyen-can" className={navClass}>
            Nhà nguyên căn
          </NavLink>
          <NavLink to="/can-ho" className={navClass}>
            Căn hộ
          </NavLink>
          <NavLink to="/ky-tuc-xa" className={navClass}>
            Ký túc xá
          </NavLink>
        </>
      )}
    </>
  )

  const drawerCategoryLinks = (
    <>
      {navCategories.length > 0 ? (
        navCategories.map(cat => (
          <NavLink
            key={cat.id}
            to={`/${cat.slug}`}
            className={drawerNavClass}
            onClick={() => setDrawerOpen(false)}
          >
            {cat.name}
          </NavLink>
        ))
      ) : (
        <>
          <NavLink
            to="/phong-tro"
            className={drawerNavClass}
            onClick={() => setDrawerOpen(false)}
          >
            Phòng trọ
          </NavLink>
          <NavLink
            to="/nha-nguyen-can"
            className={drawerNavClass}
            onClick={() => setDrawerOpen(false)}
          >
            Nhà nguyên căn
          </NavLink>
          <NavLink
            to="/can-ho"
            className={drawerNavClass}
            onClick={() => setDrawerOpen(false)}
          >
            Căn hộ
          </NavLink>
          <NavLink
            to="/ky-tuc-xa"
            className={drawerNavClass}
            onClick={() => setDrawerOpen(false)}
          >
            Ký túc xá
          </NavLink>
        </>
      )}
    </>
  )

  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">
          {/* logo luôn ở bên trái */}
          <Link to="/" className="brand">
            <img src={logo} alt="Logo" />
          </Link>

          {/* NAV DESKTOP (hidden trên mobile bằng CSS) */}
          <nav className="nav" ref={navRef}>
            <span className="nav__indicator" style={indicatorStyle} />
            {categoryLinks}
            <NavLink to="/reviews" className={navClass}>
              Review
            </NavLink>
            <NavLink to="/blog" className={navClass}>
              Blog
            </NavLink>
          </nav>

          {/* ACTIONS + BURGER */}
          <div className="site-header__actions">
            {/* NÚT YÊU THÍCH (TRÁI TIM) – BÊN TRÁI AVATAR */}
            <button
              type="button"
              className="header-heart"
              onClick={handleWishlistClick}
              aria-label="Danh sách yêu thích"
            >
              <span className="header-heart__icon">♥</span>
              {wishlistCount > 0 && (
                <span className="header-heart__badge">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* CHƯA ĐĂNG NHẬP -> 2 nút + (mobile sẽ ẩn bằng CSS) */}
            {!user && (
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setShowLogin(true)}
                >
                  Đăng nhập
                </button>

                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setShowRegister(true)}
                >
                  Đăng ký
                </button>
              </>
            )}

            {/* ĐÃ ĐĂNG NHẬP -> avatar + dropdown (desktop) */}
            {user && (
              <div className="header-auth-user" ref={userMenuRef}>
                <button
                  type="button"
                  className="header-avatar-btn"
                  onClick={() => setMenuOpen(prev => !prev)}
                >
                  <div className="header-avatar">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user.name} />
                    ) : (
                      avatarChar
                    )}
                  </div>
                  {/* Admin notification badge */}
                  {user.role === 'admin' && hasAdminNotifications && (
                    <span className="header-avatar__notification" />
                  )}
                </button>

                {menuOpen && (
                  <div className="header-menu">
                    <div className="header-menu__top">
                      <div className="header-menu__avatar">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={user.name} />
                        ) : (
                          avatarChar
                        )}
                      </div>
                      <div>
                        <p className="header-menu__name">{user.name}</p>
                        <p className="header-menu__role">
                          {user.role === 'admin'
                            ? 'Quản trị viên'
                            : 'Người dùng'}
                        </p>
                      </div>
                    </div>

                    <div className="header-menu__list">
                      <button
                        type="button"
                        className="header-menu__item"
                        onClick={() => {
                          setShowSettings(true)
                          setMenuOpen(false)
                        }}
                      >
                        Cài đặt tài khoản
                      </button>

                      {user.role === 'admin' && (
                        <button
                          type="button"
                          className="header-menu__item"
                          onClick={() => {
                            navigate('/admin')
                            setMenuOpen(false)
                          }}
                        >
                          Khu vực quản trị
                        </button>
                      )}

                      <button
                        type="button"
                        className="header-menu__item header-menu__item--danger"
                        onClick={handleLogout}
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NÚT 3 GẠCH (HIỆN TRÊN MOBILE, CSS handle) */}
            <button
              type="button"
              className={'header-burger' + (drawerOpen ? ' is-active' : '')}
              onClick={() => setDrawerOpen(prev => !prev)}
              aria-label="Mở menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* BACKDROP & DRAWER MOBILE MENU */}
      <div
        className={
          'header-drawer__backdrop' + (drawerOpen ? ' is-open' : '')
        }
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={'header-drawer' + (drawerOpen ? ' is-open' : '')}>
        <div className="header-drawer__inner">
          {user ? (
            <>
              {/* user block */}
              <div className="header-drawer__user">
                <div className="header-drawer__avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user.name} />
                  ) : (
                    <span>{avatarChar}</span>
                  )}
                </div>
                <div>
                  <p className="header-drawer__name">{user.name}</p>
                  <p className="header-drawer__role">
                    {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                  </p>
                </div>
              </div>

              {/* nav links */}
              <nav className="header-drawer__nav">
                {drawerCategoryLinks}
                <NavLink
                  to="/reviews"
                  className={drawerNavClass}
                  onClick={() => setDrawerOpen(false)}
                >
                  Review
                </NavLink>
                <NavLink
                  to="/blog"
                  className={drawerNavClass}
                  onClick={() => setDrawerOpen(false)}
                >
                  Blog
                </NavLink>
              </nav>

              {/* Nút wishlist trên mobile */}
              <button
                type="button"
                className="header-drawer__btn"
                onClick={handleWishlistClick}
              >
                ❤️ Danh sách yêu thích
                {wishlistCount > 0 && ` (${wishlistCount})`}
              </button>

              {/* actions giống avatar menu */}
              <button
                type="button"
                className="header-drawer__btn"
                onClick={() => {
                  setShowSettings(true)
                  setDrawerOpen(false)
                }}
              >
                Cài đặt tài khoản
              </button>

              {user.role === 'admin' && (
                <button
                  type="button"
                  className="header-drawer__btn"
                  onClick={() => {
                    navigate('/admin')
                    setDrawerOpen(false)
                  }}
                >
                  Khu vực quản trị
                </button>
              )}

              <button
                type="button"
                className="header-drawer__btn header-drawer__btn--danger"
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              {/* chưa login: nav + nút login/register */}
              <nav className="header-drawer__nav">
                {drawerCategoryLinks}
                <NavLink
                  to="/reviews"
                  className={drawerNavClass}
                  onClick={() => setDrawerOpen(false)}
                >
                  Review
                </NavLink>
                <NavLink
                  to="/blog"
                  className={drawerNavClass}
                  onClick={() => setDrawerOpen(false)}
                >
                  Blog
                </NavLink>
              </nav>

              <div className="header-drawer__auth">
                <button
                  type="button"
                  className="header-drawer__btn"
                  onClick={openLogin}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  className="header-drawer__btn"
                  onClick={openRegister}
                >
                  Đăng ký
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Popup login / register */}
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false)
            setShowRegister(true)
          }}
        />
      )}

      {showRegister && (
        <Register
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false)
            setShowLogin(true)
          }}
        />
      )}

      {/* Popup cài đặt tài khoản */}
      {showSettings && user && (
        <UserSettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onUpdated={u => {
            setUser(u)
            localStorage.setItem('auth_user', JSON.stringify(u))
            window.dispatchEvent(new Event('auth:changed'))
          }}
        />
      )}
    </>
  )
}
