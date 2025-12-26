import { NavLink, Outlet, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import '@/assets/style/pages/lessor/lessor.css'
import { API_URL } from '@/config/api.js';

// ===== helper build avatar url =====
function buildAvatarUrl(avatar) {
  if (!avatar) return null
  if (avatar.startsWith('http')) return avatar

  const base =
    import.meta.env.VITE_API_URL ||
    'http://127.0.0.1:8000'

  return `${base}/storage/${avatar}`
}

export default function LessorLayout() {
  const navClass = ({ isActive }) =>
    'lessor-menu__link' + (isActive ? ' is-active' : '')

  // ===== USER STATE =====
  const [user, setUser] = useState(null)
  const [avatarError, setAvatarError] = useState(false)

  // ===== LOAD USER PROFILE =====
  useEffect(() => {
    ;(async () => {
      const token = localStorage.getItem('access_token')
      if (!token) return

      try {
        const res = await fetch(`${API_URL}/user/profile`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await res.json()
        if (res.ok && data?.data) {
          setUser(data.data)
        }
      } catch (err) {
        console.error('Load user profile error:', err)
      }
    })()
  }, [])

  const avatarSrc =
    !avatarError && user?.avatar
      ? buildAvatarUrl(user.avatar)
      : null

  return (
    <div className="lessor-shell">
      {/* ===== SIDEBAR TRÁI ===== */}
      <aside className="lessor-sidebar">
        <div className="lessor-sidebar__brand">
          <div className="lessor-logo-circle">L</div>
          <div>
            <h1>Lessor panel</h1>
            <p>Apartments &amp; Condominiums</p>
          </div>
        </div>

        {/* ===== MENU CHÍNH ===== */}
        <div className="lessor-sidebar__group">
          <p className="lessor-menu__title">Chung cư / Phòng trọ</p>

          <NavLink end to="/lessor" className={navClass}>
            Tổng quan
          </NavLink>
          <NavLink to="/lessor/posts" className={navClass}>
            Bài đăng
          </NavLink>
          <NavLink to="/lessor/reviews" className={navClass}>
            Đánh giá
          </NavLink>
          {/* <NavLink to="/lessor/appointments" className={navClass}>
            Lịch hẹn
          </NavLink> */}
        </div>

        {/* ===== FOOTER SIDEBAR ===== */}
        <div className="lessor-sidebar__bottom">
          <Link to="/" className="lessor-menu__back">
            ← Về trang người dùng
          </Link>
          <p className="lessor-sidebar__meta">© 2025 · Lessor · A&amp;C</p>
        </div>
      </aside>

      {/* ===== MAIN PHẢI ===== */}
      <section className="lessor-main">
        {/* TOPBAR */}
        <header className="lessor-main__topbar lessor-main__topbar--with-avatar">
          <div className="lessor-topbar-left">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="lessor-avatar"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="lessor-avatar fallback">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

            <div className="lessor-user-info">
              <strong className="lessor-user-name">
                {user?.name || 'Người dùng'}
              </strong>
            </div>
          </div>
        </header>

        {/* NỘI DUNG */}
        <Outlet />
      </section>
    </div>
  )
}
