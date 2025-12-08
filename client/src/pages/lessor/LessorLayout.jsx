// src/pages/lessor/LessorLayout.jsx
import { NavLink, Outlet, Link } from 'react-router-dom'
import '@/assets/style/pages/lessor/lessor.css'

export default function LessorLayout() {
  const navClass = ({ isActive }) =>
    'lessor-menu__link' + (isActive ? ' is-active' : '')

  return (
    <div className="lessor-shell">
      {/* SIDEBAR TRÁI */}
      <aside className="lessor-sidebar">
        {/* logo + tên khu vực lessor */}
        <div className="lessor-sidebar__brand">
          <div className="lessor-logo-circle">L</div>
          <div>
            <h1>Lessor panel</h1>
            <p>Apartments &amp; Condominiums</p>
          </div>
        </div>

        {/* nhóm 1: Chung cư / Phòng trọ */}
        <div className="lessor-sidebar__group">
          <p className="lessor-menu__title">Chung cư / Phòng trọ</p>

          <NavLink end to="/lessor" className={navClass}>
            Tổng quan
          </NavLink>

          <NavLink to="/lessor/posts" className={navClass}>
            Bài đăng (posts)
          </NavLink>

          <NavLink to="/lessor/reviews" className={navClass}>
            Đánh giá (reviews)
          </NavLink>

          <NavLink to="/lessor/appointments" className={navClass}>
            Lịch hẹn (appointments)
          </NavLink>
        </div>

        {/* nhóm 2: danh mục hệ thống */}
        <div className="lessor-sidebar__group">
          <p className="lessor-menu__title">Danh mục hệ thống</p>

          <NavLink to="/lessor/categories" className={navClass}>
            Danh mục (categories)
          </NavLink>

          <NavLink to="/lessor/amenities" className={navClass}>
            Tiện ích (amenities)
          </NavLink>
        </div>

        {/* dưới cùng: back + info nhỏ */}
        <div className="lessor-sidebar__bottom">
          <Link to="/" className="lessor-menu__back">
            ← Về trang người dùng
          </Link>
          <p className="lessor-sidebar__meta">
            © 2025 · Lessor · A&amp;C
          </p>
        </div>
      </aside>

      {/* MAIN PHẢI */}
      <section className="lessor-main">
        {/* thanh top nhỏ cho khu lessor, có thể dùng cho thông tin user / nút logout sau này */}
        <header className="lessor-main__topbar">
          <div>
            <h2>Khu vực người cho thuê</h2>
            <p>Quản lý bài đăng và đánh giá của bạn.</p>
          </div>
         
        </header>

        {/* TẤT CẢ CÁC TRANG: LessorDashboard, LessorPosts... sẽ hiển thị ở đây */}
        <Outlet />
      </section>
    </div>
  )
}

