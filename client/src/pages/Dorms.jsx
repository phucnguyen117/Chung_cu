// src/pages/DormsExplore.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../assets/style/style.css'

/** Bộ lọc giá & diện tích cho KTX */
const PRICE = [
  {v:'', t:'Mức giá (giường/tháng)'},
  {v:'0-700000', t:'< 700k'},
  {v:'700000-1200000', t:'700k–1.2m'},
  {v:'1200000-1800000', t:'1.2–1.8m'},
  {v:'1800000-2500000', t:'1.8–2.5m'},
  {v:'2500000-999999999', t:'> 2.5m'},
]
const AREA = [
  {v:'', t:'Diện tích (m²)'},
  {v:'0-12', t:'< 12 m²'},
  {v:'12-18', t:'12–18 m²'},
  {v:'18-25', t:'18–25 m²'},
  {v:'25-999', t:'> 25 m²'},
]
const AMENITIES = [
  {k:'wifi', t:'Wi-Fi'},
  {k:'may-giat', t:'Máy giặt'},
  {k:'giu-xe', t:'Giữ xe'},
  {k:'bep-chung', t:'Bếp chung'},
  {k:'wc-chung', t:'WC chung'},
  {k:'wc-rieng', t:'WC riêng'},
  {k:'bao-ve', t:'Bảo vệ 24/7'},
  {k:'thang-may', t:'Thang máy'},
  {k:'gio-tu-do', t:'Giờ tự do'},
]
const GENDER = [
  {v:'', t:'Giới tính'},
  {v:'nam', t:'Nam'},
  {v:'nu', t:'Nữ'},
  {v:'coed', t:'Nam & Nữ'},
]
const DTYPE = [
  {v:'', t:'Loại KTX'},
  {v:'truong', t:'KTX trường'},
  {v:'tu-nhan', t:'KTX tư nhân'},
]
const OCC = [
  {v:'', t:'Số người/phòng'},
  {v:'1-4', t:'1–4 người'},
  {v:'5-8', t:'5–8 người'},
  {v:'9-12', t:'9–12 người'},
  {v:'13-999', t:'> 12 người'},
]

/** Mock data KTX (thay bằng API sau) */
const MOCK_DORMS = Array.from({length:40}).map((_,i)=>({
  id:i+1,
  title:`KTX giường tầng, có quản lý, gần trường #${i+1}`,
  price:[600000,850000,1100000,1400000,1800000,2200000,2600000][i%7],
  area:[10,12,14,16,18,22,28][i%7],
  addr:['Q.7, TP.HCM','Q.10, TP.HCM','Gò Vấp, TP.HCM','Thủ Đức, TP.HCM'][i%4],
  img:`https://picsum.photos/seed/dorm${i+301}/1200/800`,
  vip: i%5===0,
  time: i%2===0 ? 'Hôm nay' : 'Hôm qua',
  gender: ['nam','nu','coed'][i%3],
  dtype: i%2===0 ? 'truong' : 'tu-nhan',
  occ: [4,6,8,10,12,14][i%6],                // số người/phòng
  amens: ['wifi','giu-xe','may-giat','bep-chung','wc-chung','bao-ve','gio-tu-do','thang-may','wc-rieng']
           .filter((_,k)=> (k+i)%2===0)       // rải ngẫu nhiên tiện ích
}))

/** Helper: danh sách trang có “…” */
function pageList(totalPages, current){
  const delta = 1
  const range = []
  const left = Math.max(2, current - delta)
  const right = Math.min(totalPages - 1, current + delta)
  range.push(1)
  if (left > 2) range.push('...')
  for (let i = left; i <= right; i++) range.push(i)
  if (right < totalPages - 1) range.push('...')
  if (totalPages > 1) range.push(totalPages)
  return range
}

export default function DormsExplore(){
  const nav = useNavigate()
  const { search } = useLocation()
  const qs = new URLSearchParams(search)

  // ===== state =====
  const [q, setQ] = useState(qs.get('q') || '')
  const [province, setProvince] = useState(qs.get('province') || '')
  const [district, setDistrict] = useState(qs.get('district') || '')
  const [price, setPrice] = useState(qs.get('price') || '')
  const [area, setArea] = useState(qs.get('area') || '')
  const [amen, setAmen] = useState((qs.get('amen')||'').split(',').filter(Boolean))
  const [gender, setGender] = useState(qs.get('gender') || '')
  const [dtype, setDtype] = useState(qs.get('dtype') || '')
  const [occ, setOcc] = useState(qs.get('occ') || '')
  const [sort, setSort] = useState(qs.get('sort') || 'new')
  const [page, setPage] = useState(Number(qs.get('page') || 1))

  /** 8 tin mỗi trang */
  const PAGE_SIZE = 8

  // data
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)

  // sticky shadow cho thanh filter-top (tuỳ chọn)
  const barRef = useRef(null)
  useEffect(()=>{
    const onScroll=()=>{
      if(!barRef.current) return
      barRef.current.classList.toggle('rebar--scrolled', window.scrollY>140)
    }
    onScroll(); window.addEventListener('scroll', onScroll)
    return ()=>window.removeEventListener('scroll', onScroll)
  },[])

  // Lọc + sắp xếp + chia trang (mock)
  useEffect(()=>{
    let data=[...MOCK_DORMS]

    if(q){
      const qq = q.toLowerCase()
      data = data.filter(d=> (d.title+d.addr).toLowerCase().includes(qq))
    }
    if(price){
      const [mi,ma]=price.split('-').map(Number)
      data = data.filter(d=>d.price>=mi&&d.price<=ma)
    }
    if(area){
      const [mi,ma]=area.split('-').map(Number)
      data = data.filter(d=>d.area>=mi&&d.area<=ma)
    }
    if(gender){
      data = data.filter(d=>d.gender===gender)
    }
    if(dtype){
      data = data.filter(d=>d.dtype===dtype)
    }
    if(occ){
      const [mi,ma]=occ.split('-').map(Number)
      data = data.filter(d=>d.occ>=mi&&d.occ<=ma)
    }
    if(amen.length){
      data = data.filter(d=> amen.every(a=>d.amens.includes(a)))
    }

    if(sort==='price_asc') data.sort((a,b)=>a.price-b.price)
    else if(sort==='price_desc') data.sort((a,b)=>b.price-a.price)
    else if(sort==='area_desc') data.sort((a,b)=>b.area-a.area)
    // 'new' giữ mặc định

    setTotal(data.length)
    const start=(page-1)*PAGE_SIZE
    setItems(data.slice(start,start+PAGE_SIZE))
  },[q,province,district,price,area,amen,gender,dtype,occ,sort,page])

  // sync URL
  useEffect(()=>{
    const p=new URLSearchParams()
    if(q) p.set('q',q)
    if(province) p.set('province',province)
    if(district) p.set('district',district)
    if(price) p.set('price',price)
    if(area) p.set('area',area)
    if(amen.length) p.set('amen',amen.join(','))
    if(gender) p.set('gender',gender)
    if(dtype) p.set('dtype',dtype)
    if(occ) p.set('occ',occ)
    if(sort!=='new') p.set('sort',sort)
    if(page>1) p.set('page',String(page))
    nav(`/ky-tuc-xa?${p.toString()}`)
  },[q,province,district,price,area,amen,gender,dtype,occ,sort,page,nav])

  const toggleAmen=k=>{ setAmen(s=> s.includes(k)? s.filter(x=>x!==k) : [...s,k]); setPage(1) }

  const chips = useMemo(()=>{
    const arr=[]
    if(q) arr.push({k:'q', t:`"${q}"`})
    if(province) arr.push({k:'province', t:province})
    if(district) arr.push({k:'district', t:district})
    if(price) arr.push({k:'price', t: PRICE.find(x=>x.v===price)?.t })
    if(area) arr.push({k:'area', t: AREA.find(x=>x.v===area)?.t })
    if(gender) arr.push({k:'gender', t: GENDER.find(x=>x.v===gender)?.t })
    if(dtype) arr.push({k:'dtype', t: DTYPE.find(x=>x.v===dtype)?.t })
    if(occ) arr.push({k:'occ', t: OCC.find(x=>x.v===occ)?.t })
    amen.forEach(a=>arr.push({k:'amen', v:a, t: AMENITIES.find(x=>x.k===a)?.t }))
    return arr
  },[q,province,district,price,area,amen,gender,dtype,occ])

  const clearChip=(k,v)=>{
    if(k==='q') setQ('')
    if(k==='province') setProvince('')
    if(k==='district') setDistrict('')
    if(k==='price') setPrice('')
    if(k==='area') setArea('')
    if(k==='gender') setGender('')
    if(k==='dtype') setDtype('')
    if(k==='occ') setOcc('')
    if(k==='amen') setAmen(s=>s.filter(x=>x!==v))
    setPage(1)
  }

  const clearAll=()=>{
    setQ('');setProvince('');setDistrict('');
    setPrice('');setArea('');setAmen([]);
    setGender('');setDtype('');setOcc('');
    setPage(1);setSort('new')
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="re">
      {/* HERO */}
      <section className="re-hero u-fullbleed">
        <div className="container re-hero__inner">
          <div>
            <h1>Khám phá ký túc xá • gần trường • an toàn</h1>
            <p>Lọc theo giới tính, loại KTX, số người/phòng & tiện ích thiết yếu.</p>
          </div>
          <img className="re-hero__art" src="https://picsum.photos/seed/hero-dorm/680/380" alt="" />
        </div>
      </section>

      {/* THANH TÌM TRÊN CÙNG (tuỳ chọn giữ/ẩn) */}
      <div className="rebar u-fullbleed" ref={barRef}>
        <div className="container rebar__inner">
          <form className="rebar-search" onSubmit={e=>{e.preventDefault(); setPage(1)}}>
            <div className="re-input re-input--grow">
              <span className="re-ico">🔎</span>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Từ khoá, trường học, khu vực..." />
            </div>
            <select className="re-input" value={province} onChange={e=>{setProvince(e.target.value); setDistrict('')}}>
              <option value="">Tỉnh/Thành</option>
              <option>TP. Hồ Chí Minh</option>
              <option>Hà Nội</option>
              <option>Đà Nẵng</option>
            </select>
            <select className="re-input" value={district} onChange={e=>setDistrict(e.target.value)}>
              <option value="">Quận/Huyện</option>
              <option>Quận 1</option>
              <option>Quận 7</option>
              <option>Gò Vấp</option>
              <option>TP. Thủ Đức</option>
            </select>
            <select className="re-input" value={price} onChange={e=>{setPrice(e.target.value); setPage(1)}}>
              {PRICE.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
            <select className="re-input" value={area} onChange={e=>{setArea(e.target.value); setPage(1)}}>
              {AREA.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
            <select className="re-input" value={sort} onChange={e=>{setSort(e.target.value); setPage(1)}}>
              <option value="new">Tin mới</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="area_desc">Diện tích lớn</option>
            </select>
            <button className="re-btn re-btn--primary" type="submit">Tìm</button>
          </form>
        </div>
      </div>

      {/* BỐ CỤC 2 CỘT: MAIN + ASIDE FILTER (bên phải) */}
      <section className="container re-layout">
        {/* LEFT: KẾT QUẢ */}
        <div className="re-main">
          {chips.length>0 && (
            <div className="re-chips">
              {chips.map((c,i)=>(
                <button key={i} className="re-chip is-active" onClick={()=>clearChip(c.k,c.v)} type="button">
                  {c.t} <span className="x">×</span>
                </button>
              ))}
              <button className="re-linkclear" type="button" onClick={clearAll}>Xoá tất cả</button>
            </div>
          )}

          <header className="re-results__head">
            <div>
              <h2>Ký túc xá</h2>
              <p>{total.toLocaleString()} tin phù hợp</p>
            </div>
          </header>

          <div className="re-grid">
            {items.map(it=>(
              <article key={it.id} className={'re-card'+(it.vip?' is-vip':'')}>
                <div className="re-card__media">
                  <img src={it.img} alt={it.title}/>
                  {it.vip && <span className="re-badge">VIP</span>}
                </div>
                <div className="re-card__body">
                  <h3 className="re-card__title" title={it.title}>{it.title}</h3>
                  <div className="re-card__meta">
                    <span className="price">{it.price.toLocaleString()} ₫/giường</span>
                    <span className="dot">•</span><span>{it.area} m²</span>
                    <span className="dot">•</span><span>{it.addr}</span>
                    <span className="dot">•</span><span>{it.gender==='coed'?'Nam & Nữ': (it.gender==='nam'?'Nam':'Nữ')}</span>
                  </div>
                  <div className="re-card__foot">
                    <span className="time">{it.time}</span>
                    <Link to={`/post/${it.id}`} className="re-btn re-btn--line">Xem chi tiết</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* PHÂN TRANG */}
          <nav className="re-paging" aria-label="pagination">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>
            {pageList(totalPages, page).map((n, idx) =>
              n === '...' ? (
                <span key={`e${idx}`} className="re-paging__ellipsis">…</span>
              ) : (
                <button key={n} className={page===n?'is-on':''} onClick={()=>setPage(n)}>{n}</button>
              )
            )}
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>›</button>
          </nav>
        </div>

        {/* RIGHT: ASIDE FILTER (sticky) */}
        <aside className="re-aside">
          <div className="re-filtercard">
            <h3>Bộ lọc nhanh</h3>

            <div className="re-field">
              <label>Từ khoá</label>
              <div className="re-input re-input--grow">
                <input value={q} onChange={e=>{setQ(e.target.value); setPage(1)}} placeholder="VD: gần ĐH, KTX trường..." />
              </div>
            </div>

            <div className="re-field">
              <label>Tỉnh/Thành</label>
              <select value={province} onChange={e=>{setProvince(e.target.value); setDistrict(''); setPage(1)}}>
                <option value="">Tất cả</option>
                <option>TP. Hồ Chí Minh</option>
                <option>Hà Nội</option>
                <option>Đà Nẵng</option>
              </select>
            </div>

            <div className="re-field">
              <label>Quận/Huyện</label>
              <select value={district} onChange={e=>{setDistrict(e.target.value); setPage(1)}}>
                <option value="">Tất cả</option>
                <option>Quận 1</option>
                <option>Quận 7</option>
                <option>Gò Vấp</option>
                <option>TP. Thủ Đức</option>
              </select>
            </div>

            <div className="re-field">
              <label>Mức giá</label>
              <select value={price} onChange={e=>{setPrice(e.target.value); setPage(1)}}>
                {PRICE.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            </div>

            <div className="re-field">
              <label>Diện tích</label>
              <select value={area} onChange={e=>{setArea(e.target.value); setPage(1)}}>
                {AREA.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            </div>

            <div className="re-field">
              <label>Giới tính</label>
              <select value={gender} onChange={e=>{setGender(e.target.value); setPage(1)}}>
                {GENDER.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            </div>

            <div className="re-field">
              <label>Loại KTX</label>
              <select value={dtype} onChange={e=>{setDtype(e.target.value); setPage(1)}}>
                {DTYPE.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            </div>

            <div className="re-field">
              <label>Số người/phòng</label>
              <select value={occ} onChange={e=>{setOcc(e.target.value); setPage(1)}}>
                {OCC.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            </div>

            <div className="re-field">
              <label>Tiện ích</label>
              <div className="re-checklist">
                {AMENITIES.map(a=>(
                  <label key={a.k} className="re-check">
                    <input
                      type="checkbox"
                      checked={amen.includes(a.k)}
                      onChange={()=>toggleAmen(a.k)}
                    />
                    <span>{a.t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="re-field">
              <label>Sắp xếp</label>
              <select value={sort} onChange={e=>{setSort(e.target.value); setPage(1)}}>
                <option value="new">Tin mới</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="area_desc">Diện tích lớn</option>
              </select>
            </div>

            <div className="re-filtercard__actions">
              <button type="button" className="re-btn re-btn--primary" onClick={()=>setPage(1)}>Áp dụng</button>
              <button type="button" className="re-btn re-btn--ghost" onClick={clearAll}>Xoá bộ lọc</button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
