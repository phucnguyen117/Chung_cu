import { useEffect, useState } from 'react'
import { api } from '../../api/axios.js'
import { useNavigate } from 'react-router-dom'

export default function LessorPost(){
  const navigate = useNavigate()
  const [title,setTitle]=useState('')
  const [price,setPrice]=useState(1500000)
  const [area,setArea]=useState(20)
  const [address,setAddress]=useState('')
  const [categoryId,setCategoryId]=useState('')
  const [images,setImages]=useState(null)
  const [categories,setCategories]=useState([])

  useEffect(()=>{ (async()=>{
    const cats = await api.get('/categories') // cần route này ở backend
    setCategories(cats.data || [])
  })()},[])

  const submit = async (e) => {
    e.preventDefault(); if(!categoryId) return
    const token = localStorage.getItem('access_token') || localStorage.getItem('token')
    const fd = new FormData()
    fd.append('title', title)
    fd.append('price', String(price))
    fd.append('area', String(area))
    fd.append('address', address)
    fd.append('category_id', String(categoryId))
    if(images) Array.from(images).forEach(f=>fd.append('images[]', f))

    try {
      await api.post('/posts', fd, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'multipart/form-data' }
      })
      alert('Đăng bài thành công')
      navigate('/lessor/posts')
    } catch (err) {
      alert('Có lỗi khi đăng bài: ' + (err.message || 'Lỗi không xác định'))
    }
  }

  return (
    <section className="lessor-page">
      <header className="lessor-page__head">
        <div>
          <h1 className="lessor-page__title">Đăng nhà trọ</h1>
          <p className="lessor-page__desc">Tạo bài đăng cho thuê mới</p>
        </div>
      </header>

      <div className="lessor-section--card">
        <form className="lessor-form" onSubmit={submit}>
          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <label className="lessor-label">
                Tiêu đề
                <input 
                  className="lessor-input" 
                  placeholder="Tiêu đề" 
                  value={title} 
                  onChange={e=>setTitle(e.target.value)} 
                />
              </label>
            </div>
          </div>

          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <label className="lessor-label">
                Giá (VND)
                <input 
                  className="lessor-input" 
                  type="number" 
                  placeholder="Giá (VND)" 
                  value={price} 
                  onChange={e=>setPrice(+e.target.value)} 
                />
              </label>
            </div>
            <div className="lessor-form__col">
              <label className="lessor-label">
                Diện tích (m²)
                <input 
                  className="lessor-input" 
                  type="number" 
                  placeholder="Diện tích (m²)" 
                  value={area} 
                  onChange={e=>setArea(+e.target.value)} 
                />
              </label>
            </div>
          </div>

          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <label className="lessor-label">
                Địa chỉ
                <input 
                  className="lessor-input" 
                  placeholder="Địa chỉ" 
                  value={address} 
                  onChange={e=>setAddress(e.target.value)} 
                />
              </label>
            </div>
          </div>

          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <label className="lessor-label">
                Danh mục
                <select 
                  className="lessor-input" 
                  value={categoryId} 
                  onChange={e=>setCategoryId(e.target.value)}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="lessor-form__row">
            <div className="lessor-form__col">
              <label className="lessor-label">
                Ảnh
                <input 
                  className="lessor-input" 
                  type="file" 
                  multiple 
                  onChange={e=>setImages(e.target.files)} 
                />
              </label>
            </div>
          </div>

          <div className="lessor-form__actions">
            <button 
              type="button"
              className="lessor-btn lessor-btn--ghost"
              onClick={() => navigate('/lessor/posts')}
            >
              Hủy
            </button>
            <button 
              className="lessor-btn lessor-btn--primary" 
              type="submit"
            >
              Đăng bài
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

