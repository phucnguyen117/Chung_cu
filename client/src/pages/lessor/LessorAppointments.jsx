 // src/pages/lessor/LessorAppointments.jsx
import { useEffect, useState } from 'react'

export default function LessorAppointments() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    loadAppointments()
  }, [])

  async function loadAppointments() {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('Bạn chưa đăng nhập.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/appointments/owner', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = data?.error || data?.message || 'Không tải được danh sách lịch hẹn'
        throw new Error(msg)
      }

      setAppointments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (id) => {
    const note = window.prompt('Nhập ghi chú khi chấp nhận lịch hẹn:')
    if (!note || !note.trim()) {
      alert('Vui lòng nhập ghi chú.')
      return
    }

    try {
      setActionLoading(id)
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/appointments/${id}/accept`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lessor_note: note }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Không thể chấp nhận lịch hẹn')
      }

      alert('Đã chấp nhận lịch hẹn thành công.')
      loadAppointments()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Có lỗi khi chấp nhận lịch hẹn')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (id) => {
    const reason = window.prompt('Nhập lý do từ chối lịch hẹn:')
    if (!reason || !reason.trim()) {
      alert('Vui lòng nhập lý do từ chối.')
      return
    }

    try {
      setActionLoading(id)
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/appointments/${id}/decline`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lessor_note: reason }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Không thể từ chối lịch hẹn')
      }

      alert('Đã từ chối lịch hẹn.')
      loadAppointments()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Có lỗi khi từ chối lịch hẹn')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('vi-VN')
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'lessor-badge--pending',
      accepted: 'lessor-badge--published',
      declined: 'lessor-badge--danger',
      cancelled: 'lessor-badge--draft',
      completed: 'lessor-badge--published',
    }
    return badges[status] || ''
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Chờ xử lý',
      accepted: 'Đã chấp nhận',
      declined: 'Đã từ chối',
      cancelled: 'Đã hủy',
      completed: 'Hoàn thành',
    }
    return labels[status] || status
  }

  return (
    <section className="lessor-page">
      <header className="lessor-page__head">
        <div>
          <h2 className="lessor-page__title">Quản lý lịch hẹn</h2>
          <p className="lessor-page__desc">
            Xem và xử lý các yêu cầu đặt lịch hẹn xem phòng từ người thuê.
          </p>
        </div>
      </header>

      {loading && <p className="lessor-loading">Đang tải...</p>}
      {error && <p className="lessor-error">{error}</p>}

      {!loading && !error && (
        <div className="lessor-card" style={{ marginTop: 10 }}>
          <table className="lessor-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Bài đăng</th>
                <th>Người đặt</th>
                <th>Thời gian hẹn</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th>Ghi chú của bạn</th>
                <th style={{ width: 200 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 && (
                <tr>
                  <td colSpan="8" className="lessor-empty">
                    Chưa có lịch hẹn nào.
                  </td>
                </tr>
              )}

              {appointments.map((apt) => (
                <tr key={apt.id}>
                  <td>#{apt.id}</td>
                  <td>
                    <div>
                      <strong>{apt.post?.title || `Bài đăng #${apt.post_id}`}</strong>
                    </div>
                  </td>
                  <td>
                    <div>{apt.renter?.name || `User #${apt.renter_id}`}</div>
                    {apt.renter?.email && (
                      <div className="lessor-td-sub">{apt.renter.email}</div>
                    )}
                  </td>
                  <td>{formatDate(apt.appointment_time)}</td>
                  <td>{apt.note || '—'}</td>
                  <td>
                    <span className={`lessor-badge ${getStatusBadge(apt.status)}`}>
                      {getStatusLabel(apt.status)}
                    </span>
                  </td>
                  <td>{apt.lessor_note || '—'}</td>
                  <td>
                    {apt.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="lessor-btn lessor-btn--sm lessor-btn--primary"
                          onClick={() => handleAccept(apt.id)}
                          disabled={actionLoading === apt.id}
                        >
                          {actionLoading === apt.id ? 'Đang xử lý...' : 'Chấp nhận'}
                        </button>
                        <button
                          type="button"
                          className="lessor-btn lessor-btn--sm lessor-btn--danger"
                          onClick={() => handleDecline(apt.id)}
                          disabled={actionLoading === apt.id}
                        >
                          {actionLoading === apt.id ? 'Đang xử lý...' : 'Từ chối'}
                        </button>
                      </div>
                    )}
                    {apt.status !== 'pending' && <span className="lessor-td-sub">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

