// src/components/Header.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import logo from '@/assets/images/logo.png'
import Login from '../pages/Login'
import Register from '../pages/Register'
import UserSettingsModal from '../components/UserSettingsModal'
import NotificationsBell from './NotificationsBell'
import { Heart } from 'lucide-react';
import { X } from 'lucide-react'

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api'

// Safe JSON
async function safeJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.warn('Header: phản hồi không phải JSON:', res.url, text.slice(0, 120))
    return null
  }
}

export default function Header() {
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [user, setUser] = useState(null)
  const [wishlistCount, setWishlistCount] = useState(0)

  // 🔥 COUNT NOTIFICATION
  const [unreadAdmin, setUnreadAdmin] = useState(0)

  // 🔥 STAGE BADGE (avatar → menu → sidebar)
  const [notiStage, setNotiStage] = useState("avatar")

  const [navCategories, setNavCategories] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [indicatorStyle, setIndicatorStyle] = useState({})

  const navRef = useRef(null)
  const userMenuRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  const navClass = ({ isActive }) =>
    'nav__link' + (isActive ? ' is-active' : '')

  const drawerNavClass = ({ isActive }) =>
    'header-drawer__link' + (isActive ? ' active' : '')

  // ================= NAV indicator =================
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

  useEffect(() => setDrawerOpen(false), [location.pathname])

  // ================= LOAD CATEGORIES =================
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`)
        const data = await safeJson(res)

        if (!res.ok) return

        let list = data?.data || data || []
        list = Array.isArray(list) ? list : []

        list = list.sort((a, b) => Number(a.id) - Number(b.id))
        setNavCategories(list.slice(0, 4))
      } catch {}
    })()
  }, [])

  // ================= LOAD USER =================
  const fetchUserFromApi = async token => {
    try {
      const res = await fetch(`${API_BASE_URL}/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      const u = data.user || data.data || data

      setUser(u)
      localStorage.setItem('auth_user', JSON.stringify(u))
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    const initAuth = () => {
      const raw = localStorage.getItem('auth_user')
      const token = localStorage.getItem('access_token')

      if (raw) {
        try {
          let parsed = JSON.parse(raw)
          if (parsed?.user) parsed = parsed.user
          setUser(parsed)
          return
        } catch {}
      }
      if (token) fetchUserFromApi(token)
      else setUser(null)
    }

    initAuth()
    window.addEventListener('auth:changed', initAuth)
    return () => window.removeEventListener('auth:changed', initAuth)
  }, [])

  // ================= LOAD WISHLIST =================
  useEffect(() => {
    const initWishlist = () => {
      try {
        const token = localStorage.getItem('access_token')

        if (token && user) {
          const loadFromAPI = async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/saved-posts/ids`, {
                headers: { Authorization: `Bearer ${token}` }
              })
              const data = await res.json()

              if (data.status && Array.isArray(data.data)) {
                setWishlistCount(data.data.length)
                return
              }
            } catch {}

            setWishlistCount(0)
          }

          loadFromAPI()
          return
        }

        const raw = localStorage.getItem('wishlist_posts')
        const parsed = raw ? JSON.parse(raw) : []
        setWishlistCount(Array.isArray(parsed) ? parsed.length : 0)
      } catch {
        setWishlistCount(0)
      }
    }

    initWishlist()
    window.addEventListener('wishlist:changed', initWishlist)
    return () => window.removeEventListener('wishlist:changed', initWishlist)
  }, [user])

  // ================= LOAD ADMIN NOTIFICATION =================
  useEffect(() => {
    const loadUnread = async () => {
      if (!user || user.role !== 'admin') {
        setUnreadAdmin(0)
        return
      }

      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await safeJson(res)

        if (data?.status) setUnreadAdmin(data.unread)
      } catch {
        setUnreadAdmin(0)
      }
    }

    loadUnread()
    const interval = setInterval(loadUnread, 8000)
    return () => clearInterval(interval)
  }, [user])

  // ================= BADGE LOGIC =================

  // 1. Bấm avatar → badge chuyển sang menu
  const handleOpenMenu = () => {
    setMenuOpen(prev => !prev)
    if (unreadAdmin > 0) setNotiStage("menu")
  }

  // 2. Bấm "Khu vực quản trị"
  const handleGoAdmin = () => {
    if (unreadAdmin > 0) setNotiStage("sidebar")
    navigate('/admin')
    setMenuOpen(false)
  }

  // 3. Nếu rời admin mà chưa đọc → quay về avatar
  useEffect(() => {
    if (!location.pathname.startsWith("/admin") && notiStage === "sidebar") {
      setNotiStage("avatar")
    }
  }, [location.pathname])

  // ================= CLICK OUTSIDE =================
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

  // ================= LOGOUT =================
  const handleLogout = async () => {
    const token = localStorage.getItem('access_token')

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch {}

    localStorage.removeItem('access_token')
    localStorage.removeItem('auth_user')
    setWishlistCount(0)
    setUser(null)
    window.dispatchEvent(new Event('auth:changed'))

    if (location.pathname.startsWith('/admin')) navigate('/')
  }

  // ================= AVATAR =================
  const avatarUrl =
    user?.avatar_url ||
    user?.avatar ||
    user?.avatarPath ||
    user?.profile_photo_url ||
    null

  const avatarChar = user?.name?.charAt(0)?.toUpperCase() || 'U'

  // ================= RENDER =================
  const categoryLinks = navCategories.length > 0
    ? navCategories.map(cat => (
        <NavLink key={cat.id} to={`/${cat.slug}`} className={navClass}>
          {cat.name}
        </NavLink>
      ))
    : (
      <>
        <NavLink to="/phong-tro" className={navClass}>Phòng trọ</NavLink>
        <NavLink to="/nha-nguyen-can" className={navClass}>Nhà nguyên căn</NavLink>
        <NavLink to="/can-ho" className={navClass}>Căn hộ</NavLink>
        <NavLink to="/ky-tuc-xa" className={navClass}>Ký túc xá</NavLink>
      </>
    )

  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">

          {/* Logo */}
          <Link to="/" className="brand">
            <img src={logo} alt="Logo" />
          </Link>

          {/* NAV */}
          <nav className="nav" ref={navRef}>
            <span className="nav__indicator" style={indicatorStyle} />
            {categoryLinks}
            <NavLink to="/reviews" className={navClass}>Review</NavLink>
            <NavLink to="/blog" className={navClass}>Blog</NavLink>
          </nav>

          {/* ACTIONS */}
          <div className="site-header__actions">

            {/* Chưa đăng nhập */}
            {!user && (
              <>
                <button className="btn btn--ghost" onClick={() => setShowLogin(true)}>Đăng nhập</button>
                <button className="btn btn--ghost" onClick={() => setShowRegister(true)}>Đăng ký</button>
              </>
            )}

            {/* ĐÃ LOGIN */}
            {user && (
              <div className="header-auth-user" ref={userMenuRef}>

              {/* Wishlist */}
              <button
                className="header-heart"
                onClick={() => navigate('/wishlist')}
              >
                <span className="header-heart__icon"><Heart /></span>
                {wishlistCount > 0 && (
                  <span className="header-heart__badge">{wishlistCount}</span>
                )}
              </button>

                {/* Notifications bell */}
              <div style={{display: 'inline-block', marginRight: 8}}>
                <NotificationsBell />
              </div>

              {/* Avatar */}
                <button type="button" className="header-avatar-btn" onClick={handleOpenMenu}>
                  <div className="header-avatar">
                    {avatarUrl ? <img src={avatarUrl} alt={user.name} /> : avatarChar}
                  </div>


                </button>

                {/* DROPDOWN */}
                {menuOpen && (
                  <div className="header-menu">
                    <div className="header-menu__top">
                      <div className="header-menu__avatar">
                        {avatarUrl ? <img src={avatarUrl} /> : avatarChar}
                      </div>
                      <div>
                        <p className="header-menu__name">{user.name}</p>
                        <p className="header-menu__role">
                          {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                        </p>
                      </div>
                    </div>

                    <div className="header-menu__list">

                      {/* CÀI ĐẶT */}
                      <button
                        className="header-menu__item"
                        onClick={() => {
                          setShowSettings(true)
                          setMenuOpen(false)
                        }}
                      >
                        Cài đặt tài khoản
                      </button>

                      {/* ADMIN */}
                      {user.role === 'admin' && (
                        <button className="header-menu__item" onClick={handleGoAdmin}>
                          Khu vực quản trị

                          {unreadAdmin > 0 && notiStage === "menu" && (
                            <span className="menu-badge-dot"></span>
                          )}
                        </button>
                      )}

                      {/* LESSOR */}
                      {user.role === 'lessor' && (
                        <button className="header-menu__item" onClick={() => {
                          navigate('/lessor')
                          setMenuOpen(false)
                        }}>
                          Trung tâm quản lý
                        </button>
                      )}

                      {/* Đăng xuất */}
                      <button
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

            {/* BURGER MENU */}
            <button
              className={'header-burger' + (drawerOpen ? ' is-active' : '')}
              onClick={() => setDrawerOpen(prev => !prev)}
              aria-label="Mở menu"
            >
              <span />
              <span />
              <span />
            </button>

            {/* MOBILE DRAWER */}
            {drawerOpen && (
              <>
                <div className={'header-drawer__backdrop' + (drawerOpen ? ' is-open' : '')} onClick={() => setDrawerOpen(false)} />

                <aside className={'header-drawer' + (drawerOpen ? ' is-open' : '')} role="dialog" aria-label="Menu">
                  <div className="header-drawer__inner">
<button
  className="header-drawer__close"
  aria-label="Đóng menu"
  onClick={() => setDrawerOpen(false)}
>
  ✕
</button>
                    {user ? (
                      <div className="header-drawer__user">
                        <div className="header-drawer__avatar">
                          {avatarUrl ? <img src={avatarUrl} alt={user.name} /> : <span>{avatarChar}</span>}
                        </div>
                        <div>
                          <p className="header-drawer__name">{user.name}</p>
                          <p className="header-drawer__role">{user.role === 'admin' ? 'Quản trị viên' : (user.role === 'lessor' ? 'Chủ trọ' : 'Người dùng')}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="header-drawer__auth">
                        <button className="header-drawer__btn" onClick={() => { setShowLogin(true); setDrawerOpen(false) }}>Đăng nhập</button>
                        <button className="header-drawer__btn" onClick={() => { setShowRegister(true); setDrawerOpen(false) }}>Đăng ký</button>
                      </div>
                    )}

                    <nav className="header-drawer__nav">
                      {navCategories.map(cat => (
                        <Link key={cat.id} to={`/${cat.slug}`} className="header-drawer__link" onClick={() => setDrawerOpen(false)}>
                          {cat.name}
                        </Link>
                      ))}

                      <Link to="/phong-tro" className="header-drawer__link" onClick={() => setDrawerOpen(false)}>Phòng trọ</Link>
                      <Link to="/nha-nguyen-can" className="header-drawer__link" onClick={() => setDrawerOpen(false)}>Nhà nguyên căn</Link>
                      <Link to="/can-ho" className="header-drawer__link" onClick={() => setDrawerOpen(false)}>Căn hộ</Link>
                      <Link to="/ky-tuc-xa" className="header-drawer__link" onClick={() => setDrawerOpen(false)}>Ký túc xá</Link>

                      <Link to="/reviews" className="header-drawer__link" onClick={() => setDrawerOpen(false)}>Review</Link>
                      <Link to="/blog" className="header-drawer__link" onClick={() => setDrawerOpen(false)}>Blog</Link>

                      {user && (
                        <>
                          <button className="header-drawer__btn" onClick={() => { setShowSettings(true); setDrawerOpen(false) }}>Cài đặt tài khoản</button>
                          {user.role === 'admin' && (
                            <button className="header-drawer__btn" onClick={() => { handleGoAdmin(); setDrawerOpen(false) }}>Khu vực quản trị</button>
                          )}
                          {user.role === 'lessor' && (
                            <button className="header-drawer__btn" onClick={() => { navigate('/lessor'); setDrawerOpen(false) }}>Trung tâm quản lý</button>
                          )}
                          <button className="header-drawer__btn header-drawer__btn--danger" onClick={() => { handleLogout(); setDrawerOpen(false) }}>Đăng xuất</button>
                        </>
                      )}

                    </nav>

                  </div>
                </aside>
              </>
            )}

          </div>
        </div>
      </header>

      {/* ⚡ POPUP LOGIN */}
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false)
            setShowRegister(true)
          }}
        />
      )}

      {/* ⚡ POPUP REGISTER */}
      {showRegister && (
        <Register
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false)
            setShowLogin(true)
          }}
        />
      )}

      {/* ⚡ POPUP SETTINGS — BƯỚC QUAN TRỌNG */}
      {showSettings && user && (
        <UserSettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onUpdated={u => {
            setUser(u)
            localStorage.setItem("auth_user", JSON.stringify(u))
            window.dispatchEvent(new Event("auth:changed"))
          }}
        />
      )}
    </>
  )
}
