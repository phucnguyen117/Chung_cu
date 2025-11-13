// src/pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import '../assets/style/pages/login.css'

export default function Login() {
  const nav = useNavigate()
  const location = useLocation()

  const [account, setAccount] = useState('')      // email / sđt / username
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from || '/'

  const handleSubmit = e => {
    e.preventDefault()
    setError('')

    // validate đơn giản
    if (!account.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.')
      return
    }

    // TODO: gọi API đăng nhập ở đây (Laravel, Node,...)
    // Ví dụ:
    // const res = await axios.post('/api/login', { account, password })
    // nếu ok -> lưu token, chuyển trang:
    // nav(from, { replace: true })

    console.log('LOGIN DATA:', { account, password, remember })
    // tạm thời: fake login thành công, điều hướng về trang chủ
    nav(from, { replace: true })
  }

  return (
    <div className="auth">
      <div className="container auth__wrap">
        {/* Bên trái: text + mô tả */}
        <div className="auth__left">
          <h1 className="auth-title">Đăng nhập</h1>
          <p className="auth-sub">
            Quản lý tin đăng, lưu phòng yêu thích và đặt lịch xem phòng dễ dàng hơn.
          </p>

          <ul className="auth-benefits">
            <li>✔ Lưu phòng trọ/căn hộ yêu thích</li>
            <li>✔ Quản lý tin đăng cho thuê của bạn</li>
            <li>✔ Nhận gợi ý phù hợp với khu vực & ngân sách</li>
          </ul>
        </div>

        {/* Bên phải: form */}
        <div className="auth-card">
          <h2 className="auth-card__title">Chào mừng bạn trở lại 👋</h2>
          <p className="auth-card__subtitle">
            Đăng nhập để tiếp tục trải nghiệm Apartments & Condominiums.
          </p>

          {error && <div className="auth-alert">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Email / Số điện thoại</label>
              <div className="auth-input">
                <span className="auth-input__icon">📧</span>
                <input
                  type="text"
                  placeholder="vd: tenban@gmail.com"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-input">
                <span className="auth-input__icon">🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-input__toggle"
                  onClick={() => setShowPass(s => !s)}
                >
                  {showPass ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <div className="auth-row auth-row--between">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <Link to="/forgot-password" className="auth-link">
                Quên mật khẩu?
              </Link>
            </div>

            <button type="submit" className="auth-btn auth-btn--primary">
              Đăng nhập
            </button>

            <div className="auth-divider">
              <span>hoặc</span>
            </div>

            <button
              type="button"
              className="auth-btn auth-btn--ghost"
              onClick={() => alert('Sau này gắn Google/Facebook login vào đây')}
            >
              Đăng nhập với Google
            </button>

            <p className="auth-bottom-text">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="auth-link u-underline">
                Đăng ký ngay
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
