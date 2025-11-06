import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../assets/style/style.css'
 

/** Bộ lọc giá & diện tích */
const PRICE = [
  {v:'', t:'Mức giá'},
  {v:'0-1500000', t:'< 1.5 triệu'},
  {v:'1500000-3000000', t:'1.5–3 triệu'},
  {v:'3000000-5000000', t:'3–5 triệu'},
  {v:'5000000-8000000', t:'5–8 triệu'},
  {v:'8000000-999999999', t:'> 8 triệu'},
]
const AREA = [
  {v:'', t:'Diện tích'},
  {v:'0-15', t:'< 15 m²'},
  {v:'15-25', t:'15–25 m²'},
  {v:'25-40', t:'25–40 m²'},
  {v:'40-70', t:'40–70 m²'},
  {v:'70-999', t:'> 70 m²'},
]
const AMENITIES = [
  {k:'wc-rieng', t:'WC riêng'},
  {k:'may-lanh', t:'Máy lạnh'},
  {k:'noi-that', t:'Nội thất'},
  {k:'ban-cong', t:'Ban công'},
  {k:'bep', t:'Bếp riêng'},
  {k:'giu-xe', t:'Giữ xe'},
  {k:'tu-do', t:'Giờ tự do'},
]

/** Mock items cho UI (thay bằng API khi sẵn sàng) */
const MOCK = Array.from({length:35}).map((_,i)=>({
  id:i+1,
  title:`Phòng mới, có gác & ánh sáng tự nhiên #${i+1}`,
  price:[1800000,2300000,2900000,3900000,5200000,6900000][i%6],
  area:[14,16,18,22,26,32,40][i%7],
  addr:['Q.7, TP.HCM','Q.10, TP.HCM','Gò Vấp, TP.HCM','Tân Bình, TP.HCM'][i%4],
  img:`https://picsum.photos/seed/roomexp${i+21}/1000/700`,
  vip: i%4===0,
  time: i%3===0 ? 'Hôm nay' : 'Hôm qua'
}))

/** Helper: tạo danh sách trang có “…” */
function pageList(totalPages, current){
  const delta = 1; // số trang kề hiện tại sẽ hiển thị
  const range = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(totalPages - 1, current + delta);

  range.push(1);
  if (left > 2) range.push('...');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push('...');
  if (totalPages > 1) range.push(totalPages);

  return range;
}

export default function RoomsExplore(){
  const nav = useNavigate()
  const { search } = useLocation()
  const qs = new URLSearchParams(search)

  // ===== state =====
  const [tab, setTab] = useState(qs.get('cat') || 'phong-tro')
  const [q, setQ] = useState(qs.get('q') || '')
  const [province, setProvince] = useState(qs.get('province') || '')
  const [district, setDistrict] = useState(qs.get('district') || '')
  const [price, setPrice] = useState(qs.get('price') || '')
  const [area, setArea] = useState(qs.get('area') || '')
  const [amen, setAmen] = useState((qs.get('amen')||'').split(',').filter(Boolean))
  const [sort, setSort] = useState(qs.get('sort') || 'new')
  const [page, setPage] = useState(Number(qs.get('page') || 1))

  /** Chỉ 8 tin mỗi trang */
  const PAGE_SIZE = 8

  // data
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)

  // sticky shadow cho thanh filter
  const barRef = useRef(null)
  useEffect(()=>{
    const onScroll=()=>{
      if(!barRef.current) return
      barRef.current.classList.toggle('rebar--scrolled', window.scrollY>140)
    }
    onScroll(); window.addEventListener('scroll', onScroll)
    return ()=>window.removeEventListener('scroll', onScroll)
  },[])

  useEffect(()=>{
    // API: fetch provinces/districts/amenities nếu muốn
  },[])

  // Lọc + sắp xếp + chia trang (mock)
  useEffect(()=>{
    // API: thay phần này bằng gọi backend theo filter & page, ví dụ:
    // GET /posts?category=${tab}&q=${q}&province=${province}&district=${district}&price=${price}&area=${area}&amen=${amen.join(',')}&sort=${sort}&page=${page}&limit=${PAGE_SIZE}

    let data=[...MOCK]

    if(q) data=data.filter(d=>d.title.toLowerCase().includes(q.toLowerCase()))
    if(price){ const [mi,ma]=price.split('-').map(Number); data=data.filter(d=>d.price>=mi&&d.price<=ma) }
    if(area){ const [mi,ma]=area.split('-').map(Number); data=data.filter(d=>d.area>=mi&&d.area<=ma) }
    // amen: demo bỏ qua; API nên lọc phía server

    if(sort==='price_asc') data.sort((a,b)=>a.price-b.price)
    else if(sort==='price_desc') data.sort((a,b)=>b.price-a.price)
    else if(sort==='area_desc') data.sort((a,b)=>b.area-a.area)
    // 'new' giữ mặc định

    setTotal(data.length)

    const start=(page-1)*PAGE_SIZE
    setItems(data.slice(start,start+PAGE_SIZE))
  },[tab,q,province,district,price,area,amen,sort,page])

  // sync URL
  useEffect(()=>{
    const p=new URLSearchParams()
    if(tab!=='phong-tro') p.set('cat',tab)
    if(q) p.set('q',q)
    if(province) p.set('province',province)
    if(district) p.set('district',district)
    if(price) p.set('price',price)
    if(area) p.set('area',area)
    if(amen.length) p.set('amen',amen.join(','))
    if(sort!=='new') p.set('sort',sort)
    if(page>1) p.set('page',String(page))
    nav(`/phong-tro?${p.toString()}`)
  },[tab,q,province,district,price,area,amen,sort,page,nav])

  const toggleAmen=k=>{ setAmen(s=> s.includes(k)? s.filter(x=>x!==k) : [...s,k]); setPage(1) }

  const chips = useMemo(()=>{
    const arr=[]
    if(q) arr.push({k:'q', t:`"${q}"`})
    if(province) arr.push({k:'province', t:province})
    if(district) arr.push({k:'district', t:district})
    if(price) arr.push({k:'price', t: PRICE.find(x=>x.v===price)?.t })
    if(area) arr.push({k:'area', t: AREA.find(x=>x.v===area)?.t })
    amen.forEach(a=>arr.push({k:'amen', v:a, t: AMENITIES.find(x=>x.k===a)?.t }))
    return arr
  },[q,province,district,price,area,amen])

  const clearChip=(k,v)=>{
    if(k==='q') setQ('')
    if(k==='province') setProvince('')
    if(k==='district') setDistrict('')
    if(k==='price') setPrice('')
    if(k==='area') setArea('')
    if(k==='amen') setAmen(s=>s.filter(x=>x!==v))
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="re">
      {/* HERO */}
      <section className="re-hero u-fullbleed">
        <div className="container re-hero__inner">
          <div>
            <h1>Khám phá phòng trọ đẹp • giá đúng • gần bạn</h1>
            <p>Hệ thống gợi ý thông minh, lọc chi tiết & tin xác thực.</p>
          </div>
          <img className="re-hero__art" src="https://picsum.photos/seed/hero-room/680/380" alt="" />
        </div>
      </section>
 
      <div className="rebar u-fullbleed" ref={barRef}>
        <div className="container rebar__inner">
        

          <form className="rebar-search" onSubmit={e=>{e.preventDefault(); setPage(1)}}>
            <div className="re-input re-input--grow">
              <span className="re-ico">🔎</span>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Từ khoá, khu vực, trường học..." />
            </div>
            <select className="re-input" value={province} onChange={e=>{setProvince(e.target.value); setDistrict('')}}>
              {/* API: /geo/provinces */}
              <option value="">Tỉnh/Thành</option>
              <option>TP. Hồ Chí Minh</option>
              <option>Hà Nội</option>
              <option>Đà Nẵng</option>
            </select>
            <select className="re-input" value={district} onChange={e=>setDistrict(e.target.value)}>
              {/* API: /geo/districts?province=... */}
              <option value="">Quận/Huyện</option>
              <option>Quận 1</option>
              <option>Quận 7</option>
              <option>TP. Thủ Đức</option>
            </select>
            <select className="re-input" value={price} onChange={e=>{setPrice(e.target.value); setPage(1)}}>
              {PRICE.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
            <select className="re-input" value={area} onChange={e=>{setArea(e.target.value); setPage(1)}}>
              {AREA.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
            <button className="re-btn re-btn--primary" type="submit">Tìm</button>
          </form>
        </div>
      </div>

      {/* AMENITIES + SORT */}
      <section className="container re-tools">
        <div className="re-amen">
          {AMENITIES.map(a=>(
            <button key={a.k} className={'re-chip'+(amen.includes(a.k)?' is-on':'')} onClick={()=>toggleAmen(a.k)} type="button">
              {a.t}
            </button>
          ))}
        </div>

        <div className="re-sort">
          <label>Sắp xếp</label>
          <select value={sort} onChange={e=>{setSort(e.target.value); setPage(1)}}>
            <option value="new">Tin mới</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="area_desc">Diện tích lớn</option>
          </select>
        </div>
      </section>

      {/* CHIP FILTER ĐANG ÁP DỤNG */}
      {chips.length>0 && (
        <section className="container re-chips">
          {chips.map((c,i)=>(
            <button key={i} className="re-chip is-active" onClick={()=>clearChip(c.k,c.v)} type="button">
              {c.t} <span className="x">×</span>
            </button>
          ))}
          <button className="re-linkclear" type="button" onClick={()=>{setQ('');setProvince('');setDistrict('');setPrice('');setArea('');setAmen([]);setPage(1)}}>Xoá tất cả</button>
        </section>
      )}

      {/* KẾT QUẢ */}
      <section className="container re-results"> 
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
                  <span className="price">{it.price.toLocaleString()} ₫/tháng</span>
                  <span className="dot">•</span><span>{it.area} m²</span>
                  <span className="dot">•</span><span>{it.addr}</span>
                </div>
                <div className="re-card__foot">
                  <span className="time">{it.time}</span>
                  <Link to={`/post/${it.id}`} className="re-btn re-btn--line">Xem chi tiết</Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* PHÂN TRANG (8 tin/trang + …) */}
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
      </section>

      {/* bản đồ thêm sau */}
       
    </div>
  )
}
