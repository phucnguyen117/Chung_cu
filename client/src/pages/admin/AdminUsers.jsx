// src/pages/admin/AdminUsers.jsx
import { useEffect, useState } from 'react'
import { API_URL } from '@/config/api.js';
import avatar from '@/assets/images/default-avatar.png';

// ========================
// FIX AVATAR FUNCTION
// ========================
function getAvatar(u) {
  return (
    u?.avatar_url ||
    u?.avatar ||
    u?.profile?.avatar_url ||
    avatar  // Ảnh mặc định khi không có avatar
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)

  const [selectedUser, setSelectedUser] = useState(null);
  const [lessorData, setLessorData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ================== LOAD USER LIST ==================
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')

        const token = localStorage.getItem('access_token')
        if (!token) throw new Error('Bạn chưa đăng nhập admin.')

        const res = await fetch(`${API_URL}/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (!res.ok) throw new Error('Không tải được danh sách người dùng')

        const data = await res.json()
        setUsers(data.data || data)
      } catch (err) {
        console.error(err)
        setError(err.message || 'Có lỗi xảy ra')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // ================== ĐỔI ROLE ==================
  const changeRole = async (userId, newRole) => {
    try {
      setSavingId(userId)
      setError('')

      const token = localStorage.getItem('access_token')
      if (!token) throw new Error('Bạn chưa đăng nhập admin.')

      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Phản hồi máy chủ không hợp lệ.')
      }

      if (!res.ok || data.status === false) {
        throw new Error(data.message || 'Không cập nhật được vai trò.')
      }

      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)),
      )
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi xảy ra khi cập nhật vai trò.')
    } finally {
      setSavingId(null)
    }
  }

  // ================== LẤY CHI TIẾT USER ==================
  const loadUserDetail = async (user) => {
    setSelectedUser(user);
    setLessorData(null);
    setLoadingDetail(true);

    try {
      const token = localStorage.getItem("access_token");

      // Nếu user là lessor → tải yêu cầu lessor
      if (user.role === "lessor") {
        const res = await fetch(`${API_URL}/admin/lessor-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        const req = data.data.find(r => r.user_id === user.id);

        if (req) setLessorData(req);
      }

    } catch (err) {
      console.error(err);
    }

    setLoadingDetail(false);
  };

  // ================== UI ==================
  return (
    <div>
      <h2>Quản lý người dùng</h2>
      {loading && <p>Đang tải...</p>}
      {error && <p style={{ color: '#fecaca', marginTop: 8 }}>{error}</p>}

      <div className="admin-card" style={{ marginTop: 10 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Người dùng</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Ngày tạo</th>
              <th style={{ textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {users.map(u => {
              const createdAt = u.created_at
                ? new Date(u.created_at).toLocaleString('vi-VN')
                : ""

              const isUser = u.role === 'user'
              const isLessor = u.role === 'lessor'

              return (
                <tr key={u.id}>
                  {/* ID */}
                  <td>#{u.id}</td>

                  {/* Avatar + Tên */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={getAvatar(u)}
                        alt=""
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid #ffffff30",
                        }}
                      />
                      <span>{u.name}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td>{u.email}</td>

                  {/* Role */}
                  <td>{u.role}</td>

                  {/* Created At */}
                  <td>{createdAt}</td>

                  {/* Actions */}
                  <td style={{ whiteSpace: 'nowrap' }}>

                    {/* Cấp quyền */}
                    {isUser && (
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        disabled={savingId === u.id}
                        onClick={() => changeRole(u.id, "lessor")}
                        style={{ padding: '8px 16px', minWidth: '140px' }} // Cân đối kích thước
                      >
                        {savingId === u.id ? "Đang cấp quyền..." : "Cấp quyền lessor"}
                      </button>
                    )}

                    {isLessor && (
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        disabled={savingId === u.id}
                        onClick={() => changeRole(u.id, "user")}
                        style={{ marginLeft: 8, padding: '8px 16px', minWidth: '140px' }}
                      >
                        {savingId === u.id ? "Đang cập nhật..." : "Hạ xuống user"}
                      </button>
                    )}

                    {/* Nút xem chi tiết */}
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      style={{ marginLeft: 8, padding: '8px 16px', minWidth: '120px' }}
                      onClick={() => loadUserDetail(u)}
                    >
                      Xem chi tiết
                    </button>

                  </td>
                </tr>
              )
            })}

            {!loading && !users.length && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>
                  Chưa có người dùng.
                </td>
              </tr>
            )}

          </tbody>
        </table>
      </div>

      {/* ================== MODAL CHI TIẾT USER ================== */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-box">

            <h2>Thông tin người dùng #{selectedUser.id}</h2>

            {loadingDetail && <p>Đang tải...</p>}

            {!loadingDetail && (
              <div>
                {/* USER THƯỜNG */}
                {selectedUser.role === "user" && (
                  <>
                    <p><b>Họ tên:</b> {selectedUser.name}</p>
                    <p><b>Email:</b> {selectedUser.email}</p>
                    <p><b>Số điện thoại:</b> {selectedUser.phone_number || "—"}</p>
                    <p><b>Ngày tạo:</b> {new Date(selectedUser.created_at).toLocaleString("vi-VN")}</p>
                    <p><b>Quyền:</b> {selectedUser.role}</p>

                    <div style={{ marginTop: 10 }}>
                      <b>Avatar:</b><br />
                      <img
                        src={getAvatar(selectedUser)}
                        style={{ width: 120, height: 120, borderRadius: "50%", marginTop: 8 }}
                      />
                    </div>
                  </>
                )}

                {/* ADMIN */}
                {selectedUser.role === "admin" && (
                  <>
                    <p><b>Họ tên:</b> {selectedUser.name}</p>
                    <p><b>Email:</b> {selectedUser.email}</p>
                    <p><b>Số điện thoại:</b> {selectedUser.phone_number || "—"}</p>
                    <p><b>Ngày tạo:</b> {new Date(selectedUser.created_at).toLocaleString("vi-VN")}</p>
                    <p><b>Quyền:</b> <span style={{fontWeight: 'bold', color: '#ff0000ff' }}>{selectedUser.role}</span></p>

                    <div style={{ marginTop: 10 }}>
                      <b>Avatar:</b><br />
                      <img
                        src={getAvatar(selectedUser)}
                        style={{ width: 120, height: 120, borderRadius: "50%", marginTop: 8 }}
                      />
                    </div>
                  </>
                )}

                {/* LESSOR */}
                {selectedUser.role === "lessor" && lessorData && (
                  <>
                    <p><b>Họ tên:</b> {lessorData.full_name}</p>
                    <p><b>Email:</b> {lessorData.email}</p>
                    <p><b>Số điện thoại:</b> {lessorData.phone_number}</p>
                    <p><b>Ngày tạo:</b> {new Date(selectedUser.created_at).toLocaleString("vi-VN")}</p>
                    <p><b>Quyền:</b> {selectedUser.role}</p>                    
                    <p><b>Ngày sinh:</b> {new Date(lessorData.date_of_birth).toLocaleDateString('vi-VN')}</p>
                    <p><b>Trạng thái:</b> {lessorData.status}</p>

                    <div style={{ marginTop: 10 }}>
                      <b>Avatar:</b><br />
                      <img
                        src={getAvatar(selectedUser)}
                        style={{ width: 120, height: 120, borderRadius: "50%", marginTop: 8 }}
                      />
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 20 }}>
                      <div>
                        <p><b>CCCD mặt trước</b></p>
                        <img
                          src={lessorData.cccd_front_url}
                          style={{
                            width: 300,     // NGANG
                            height: 180,    // DỌC
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid #ddd"
                          }}
                        />
                      </div>

                      <div>
                        <p><b>CCCD mặt sau</b></p>
                        <img
                          src={lessorData.cccd_back_url}
                          style={{
                            width: 300,
                            height: 180,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid #ddd"
                          }}
                        />
                      </div>
                    </div>

                  </>
                )}

                {/* LESSOR nhưng chưa có yêu cầu xác minh */}
                {selectedUser.role === "lessor" && !lessorData && (
                  <>
                    <p><b>Họ tên:</b> {selectedUser.name}</p>
                    <p><b>Email:</b> {selectedUser.email}</p>
                    <p><b>Số điện thoại:</b> {selectedUser.phone_number || "—"}</p>
                    <p><b>Ngày tạo:</b> {new Date(selectedUser.created_at).toLocaleString("vi-VN")}</p>
                    <p><b>Trạng thái:</b> Chưa nộp xác minh CCCD / chưa có yêu cầu</p>

                    <div style={{ marginTop: 10 }}>
                      <b>Avatar:</b><br />
                      <img
                        src={getAvatar(selectedUser)}
                        style={{ width: 120, height: 120, borderRadius: "50%", marginTop: 8 }}
                      />
                    </div>
                  </>
                )}

                <button
                  className="admin-btn admin-btn--primary"
                  style={{ marginTop: 20 }}
                  onClick={() => setSelectedUser(null)}
                >
                  Đóng
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
