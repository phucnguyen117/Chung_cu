// src/components/Login.jsx
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../assets/style/pages/login.css'

export default function Login({ onClose, onSwitchToRegister }) {
  const location = useLocation()
  const from = location.pathname + location.search

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = old
    }
  }, [])

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('login-overlay')) {
      onClose && onClose()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.')
      return
    }

    try {
      setLoading(true)

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const text = await res.text()
      let data = null
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }

      if (!res.ok || data?.status === false) {
        if (res.status === 422 && data?.errors) {
          const firstError =
            Object.values(data.errors)[0]?.[0] || 'Lỗi xác thực dữ liệu.'
          throw new Error(firstError)
        }
        throw new Error(
          data?.message || 'Đăng nhập thất bại, vui lòng kiểm tra lại.'
        )
      }

      const token =
        data?.access_token ||
        data?.token ||
        data?.data?.access_token ||
        data?.data?.token

      const user =
        data?.user ||
        data?.data?.user ||
        data?.data ||
        null

      if (token) localStorage.setItem('access_token', token)
      if (user) localStorage.setItem('auth_user', JSON.stringify(user))

      window.dispatchEvent(new Event('auth:changed'))
      localStorage.removeItem('user')

      onClose && onClose()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay" onClick={handleOverlayClick}>
      <div className="login-overlay__inner">
        <section className="login-card">
          <button
            type="button"
            className="login-close"
            onClick={onClose}
          >
            ×
          </button>

          <h2>Đăng nhập</h2>
          <p className="login-sub">
            Truy cập nhanh vào phòng đã lưu, lịch sử xem và đánh giá của bạn.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <input
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span>Email</span>
            </label>

            <label className="login-field">
              <input
                type="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span>Mật khẩu</span>
            </label>

            <div className="login-row">
              <label className="login-remember">
                <input type="checkbox" />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <Link
                to="/forgot-password"
                state={{ from }}
                className="login-link"
                onClick={onClose}
              >
                Quên mật khẩu?
              </Link>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="login-bottom">
            Chưa có tài khoản?{' '}
            {/* ⚠️ KHÔNG ĐI TỚI /register NỮA */}
            <button
              type="button"
              className="login-link login-link--button"
              onClick={() => {
                onClose && onClose()
                onSwitchToRegister && onSwitchToRegister()
              }}
            >
              Đăng ký ngay
            </button>
          </p>
        </section>
      </div>
    </div>
  )
}