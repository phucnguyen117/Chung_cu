import { useEffect, useState, useRef } from 'react'
import { Bell, X, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom' 

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api'

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [tab, setTab] = useState('all') // 'all' or 'archive'

  // Map notification type keys to friendly labels
  const TYPE_LABEL = {
    post_created: 'Bài viết',
    lessor_request: 'Yêu cầu Lessor',
    lessor_approved: 'Duyệt Yêu cầu',
    appointment_new: 'Yêu cầu hẹn',
    message_new: 'Tin nhắn',
    review_new: 'Đánh giá',
    default: 'Thông báo',
  };

  const [archivedIds, setArchivedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('noti_archived')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const loadCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.status) setUnread(data.unread || 0)
      } catch (e) {
        setUnread(0)
      }
    }

    loadCount()
    const iv = setInterval(loadCount, 8000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (!open) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        const list = data.data || []
        setNotifications(list)
        setUnread(list.filter(n => !n.is_read).length)
      } catch (e) {
        console.error('Load notifications error', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open])

  // persist archived ids
  useEffect(() => {
    try {
      localStorage.setItem('noti_archived', JSON.stringify(archivedIds))
    } catch {}
  }, [archivedIds])

  // delete notification
  const deleteNotification = async (id) => {
    try {
      setPendingDeleteId(null)
      const token = localStorage.getItem('access_token')
      if (!token) return
      const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.status) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        if (selected && selected.id === id) { setSelected(null); setDetailOpen(false) }
      } else {
        alert(data.message || 'Không thể xoá thông báo')
      }
    } catch (e) {
      console.error('deleteNotification', e)
      alert('Lỗi khi xoá thông báo')
    }
  }

  const toggleArchive = (id) => {
    setArchivedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      return [...prev, id]
    })
    if (selected && selected.id === id) { setSelected(null); setDetailOpen(false) }
  }

  // click outside to close
  useEffect(() => {
    if (!open) return
    const onDoc = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) { setOpen(false); setPendingDeleteId(null); }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return
      await fetch(`${API_BASE_URL}/notifications/read/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error('markAsRead', e)
    }
  }

  const markAll = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnread(0)
    } catch (e) {
      console.error('markAll', e)
    }
  }

  const handleClickItem = async (n) => {
    // cancel pending delete, mark as read if needed, open detail pane in full view
    setPendingDeleteId(null)
    if (!n.is_read) await markAsRead(n.id)
    setSelected(n)
    setDetailOpen(true)
  }

  const filtered = notifications.filter(n => (tab === 'archive') === (archivedIds.includes(n.id)))

  return (
    <div className="header-notifications" ref={menuRef}>
      <button className="header-bell" onClick={() => setOpen(v => { const nv = !v; if (nv) { setSelected(null); setDetailOpen(false); setPendingDeleteId(null); } return nv; })}>
        <span className="header-bell__icon"><Bell /></span>
        {unread > 0 && <span className="header-bell__badge">{unread}</span>}
      </button>

      {open && (
        <div className={`notifications-menu ${!selected ? 'no-selected' : ''} ${detailOpen ? 'detail-open' : ''}`}>
          <div className="notifications-menu__head">
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <h4>Thông báo</h4>
              <div className="notifications-tabs">
                <button className={`btn btn--link ${tab === 'all' ? 'is-on' : ''}`} onClick={() => { setTab('all'); setSelected(null); setPendingDeleteId(null); }}>Tất cả</button>
                <button className={`btn btn--link ${tab === 'archive' ? 'is-on' : ''}`} onClick={() => { setTab('archive'); setSelected(null); setPendingDeleteId(null); }}>Lưu trữ</button>
              </div>
            </div>

            <div>
              <button className="btn btn--link" onClick={markAll} disabled={unread === 0}>Đánh dấu đã đọc hết</button>
             
            </div>
          </div>

          <div className="notifications-menu__body">
            <div className="notifications-menu__list">
              {loading && <div className="notifications-loading">Đang tải...</div>}
              {!loading && filtered.length === 0 && (
                <div className="notifications-empty">{tab === 'all' ? 'Chưa có thông báo' : 'Chưa có thông báo lưu trữ'}</div>
              )}

              {!loading && filtered.map(n => (
                <div key={n.id} className={`notification-item ${n.is_read ? 'is-read' : 'is-unread'}`} onClick={() => handleClickItem(n)}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:12, width:'100%'}}>
                    <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div className="notification-item__title">{n.title || n.body || (n.data && (n.data.title || n.data.message) ) || 'Thông báo'}</div>
                          <span className="notification-item__type">{TYPE_LABEL[n.type] || TYPE_LABEL.default}</span>
                        </div>

                        <div className="notification-item__meta">
                          <small>{new Date(n.created_at).toLocaleString('vi-VN')}</small>
                          {!n.is_read && <span className="notification-item__dot" />}
                        </div>
                      </div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {!pendingDeleteId || pendingDeleteId !== n.id ? (
                        <>
                          <button className="btn notification-action" onClick={e => { e.stopPropagation(); toggleArchive(n.id); }}>{archivedIds.includes(n.id) ? 'Bỏ lưu' : 'Lưu'}</button>
                          <button className="btn notification-action notification-action--danger" onClick={e => { e.stopPropagation(); setPendingDeleteId(n.id); }}>Xóa</button>
                        </>
                      ) : (
                        <div className="delete-confirm" onClick={e => e.stopPropagation()} style={{display:'flex',gap:8}}>
                          <button className="btn notification-action notification-action--danger" onClick={() => deleteNotification(n.id)}>Xác nhận</button>
                          <button className="btn notification-action" onClick={() => setPendingDeleteId(null)}>Hủy</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {n.body && <div className="notification-item__body">{n.body}</div>}
                </div>
              ))}
            </div>

            <div className="notifications-menu__detail">
              {!selected && (
                <div className="notifications-empty">Chọn một thông báo để xem chi tiết</div>
              )}

              {selected && (
                <div className="notification-detail">
                  <div className="notification-detail__head" style={{display:'flex',alignItems:'center',gap:12,width:'100%'}}>
                    <button className="btn notification-action back-btn" onClick={() => { setDetailOpen(false); setSelected(null); }}><ChevronLeft size={16} /></button>
                    <div style={{flex:1}}>
                      <h5 style={{margin:0}}>{selected.title || selected.body || (selected.data && (selected.data.title || selected.data.message)) || 'Thông báo'}</h5>
                      <small>{new Date(selected.created_at).toLocaleString('vi-VN')}</small>
                      <div className="notification-detail__type">{TYPE_LABEL[selected?.type] || TYPE_LABEL.default}</div>
                    </div>
                  </div>
                  <div className="notification-detail__body">
                    {selected.body || selected.content || (selected.data && JSON.stringify(selected.data, null, 2))}
                  </div>

                  <div className="notification-detail__actions">
                    {selected.data && selected.data.url && (
                      <button className="btn btn--primary" onClick={() => { setOpen(false); navigate(selected.data.url) }}>Mở</button>
                    )}
                    <button className="btn notification-action" onClick={() => { setSelected(null); setDetailOpen(false); }}>Đóng</button>
                  </div>
                </div>
              )} 
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
