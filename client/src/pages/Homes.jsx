import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/axios' 
import '@/assets/style/pages/Homes.css'

import { 
  HousePlus, Phone, Home, FileText, 
  MapPin, ArrowRight, CheckCircle, Star, TrendingUp, Users, Eye, Info,
  ClipboardList, UserRoundCheck 
} from 'lucide-react'

// Đếm số từ 0 đến giá trị mục tiêu
export function useCountUp(value, duration = 800) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    let timer;

    // chưa có data → hiệu ứng loading giả
    if (!value || value === "0") {
      let fake = 0;
      timer = setInterval(() => {
        fake = (fake + Math.floor(Math.random() * 5)) % 20;
        setDisplay(fake.toString());
      }, 120);

      return () => clearInterval(timer);
    }

    // có data thật
    const hasPlus = value.toString().includes("+");
    const number = parseInt(value.toString().replace(/\D/g, ""), 10);

    if (isNaN(number)) return;

    let current = 0;
    const step = Math.max(1, Math.floor(number / 40));
    const interval = Math.max(20, duration / 40);

    timer = setInterval(() => {
      current += step;

      if (current >= number) {
        setDisplay(number + (hasPlus ? "+" : ""));
        clearInterval(timer);
      } else {
        setDisplay(current.toString());
      }
    }, interval);

    return () => clearInterval(timer);
  }, [value, duration]);

  return display;
}

export default function Homes() {
  const nav = useNavigate()
  
  // --- DATA STATE ---
  const [featured, setFeatured] = useState([])
  const [latestPosts, setLatestPosts] = useState([]) // State chứa bài viết mới nhất
  const [stats, setStats] = useState({ 
    rooms: "0",
    landlords: "0",
    posts: "0",
    reviews: "0",
   })
    const animatedRooms = useCountUp(stats.rooms)
    const animatedLandlords = useCountUp(stats.landlords)
    const animatedPosts = useCountUp(stats.posts)
    const animatedReviews = useCountUp(stats.reviews)

  const [loadingHome, setLoadingHome] = useState(true)

  // --- API CALL ---
  useEffect(() => {
    // Dùng AbortController để hủy request nếu user chuyển trang nhanh
    const controller = new AbortController(); 

    async function loadData() {
      setLoadingHome(true)
      try {
        // Gọi song song các API (bao gồm API Posts để lấy bài mới nhất)
        const results = await Promise.allSettled([
            api.get('/posts', { signal: controller.signal, withCredentials: false}),      // 0: Posts
            api.get('/home-stats', { signal: controller.signal, withCredentials: false})  // 2: Stats
        ])

        const [postsRes, statsRes] = results;

        // 1. Xử lý Posts (Lấy bài mới nhất)
        if (postsRes.status === 'fulfilled') {
            const rawPosts = postsRes.value.data?.data || []
            
            const mappedPosts = rawPosts.map((p) => ({
                id: p.id,
                title: p.title,
                price: p.price,
                area: p.area,
                created_at: p.created_at,
                city: p.province?.name || p.province_name || 'Chưa xác định',
                // Nối chuỗi địa chỉ
                address: [
                  p.address, 
                  p.ward?.name || p.ward_name, 
                  p.district?.name || p.district_name, 
                  p.province?.name || p.province_name
                ].filter(Boolean).join(', '),
                // Logic ảnh: Main -> Thumbnail -> Ảnh đầu -> Placeholder
                img: p.main_image_url || p.thumbnail_url || (p.images?.[0]?.url) || 'https://via.placeholder.com/1000',
            }))

            // Sắp xếp bài mới nhất lên đầu
            const sorted = mappedPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            
            // Cập nhật state (đoạn JSX bên dưới sẽ tự slice lấy 3 bài)
            setLatestPosts(sorted)
            setFeatured(sorted.slice(0, 3)) // (Tùy chọn) Nếu bạn dùng featured ở đâu đó
        }


        // 2. Xử lý Stats
        if (statsRes.status === 'fulfilled') {
            const resData = statsRes.value.data; 
            const statsData = resData?.data || {};
            
            setStats({
                rooms: statsData.rooms || '0',
                landlords: statsData.landlords || '0',
                posts: statsData.posts || '0',
                reviews: statsData.reviews || '0',
            });
        }

      } catch (err) {
        if (err.name !== 'CanceledError') {
            console.error("Lỗi tải trang chủ:", err)
        }
      } finally {
        setLoadingHome(false)
      }
    }

    loadData()
    return () => controller.abort()
  }, [])

  // Hàm xử lý khi click vào địa điểm (Bento Grid)
  const handleLocationClick = (locationName) => {
    nav(`/phong-tro?q=${encodeURIComponent(locationName)}`);
  };

  if (loadingHome) {
    return (
        <div className="loading-screen">
            <div className="spinner"></div>
        </div>
    )
  }

  return (
    <div className="home-wrapper">
      
      {/* 1. HERO SECTION */}
      <header className="hero-section">
        <div className="container">
            <div className="hero-grid">
                {/* Left Content */}
                <div className="hero-left animate-fade-in">
                    <div className="hero-badge">
                        <Star size={14} fill="currentColor" /> 
                        <span>Nền tảng số 1 tại Huế</span>
                    </div>

                    <h1 className="hero-title">
                        Tìm Kiếm <span className="text-gradient">Không Gian Sống </span>
                        Riêng
                    </h1>
                    
                    <p className="hero-desc">
                        Kết nối trực tiếp hàng nghìn chủ nhà và người thuê. Thông tin minh bạch, hình ảnh xác thực.
                    </p>

                    <div className="hero-actions">
                        <button onClick={() => nav('/phong-tro')} className="btn-primary">
                            Tìm Ngay <ArrowRight size={20}/>
                        </button>
                        <button className="btn-outline" onClick={() => nav('/blog')}>
                            <div className="icon-circle">
                                 <Info size={14} />
                            </div>
                            <span>Về Chúng Tôi</span>
                        </button>
                    </div>
                </div>

                {/* Right Image */}
                <div className="hero-right animate-fade-in">
                    <div className="hero-image-wrapper">
                        <img 
                            src="https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=1200" 
                            alt="Hero Apartment" 
                            className="hero-img"
                        />
                        <div className="hero-overlay"></div>
                        
                        <div className="hero-floating-card">
                            <div className="check-icon">
                                <CheckCircle size={24} strokeWidth={3} />
                            </div>
                            <div style={{textAlign: 'left'}}>
                                <small style={{display: 'block', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px'}}>Hệ thống an toàn</small>
                                <strong style={{color: '#fff', fontSize: '16px'}}>Đã xác thực 100%</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </header>

      {/* 2. STATS BAR */}
      <section className="stats-section">
        <div className="container">
            <div className="stats-card">
                    <div className="stats-grid">
    {/* 1. Đang cho thuê */}
    <div className="stat-item">
        <div className="stat-icon" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa'}}>
            <HousePlus size={24} />
        </div>
        <h3 className="stat-value animate-fade-in">
            {animatedRooms}
        </h3>
        <p className="stat-label">Đang cho thuê</p>
    </div>

    {/* 2. Tổng Chủ Cho thuê */}
    <div className="stat-item">
        <div className="stat-icon" style={{background: 'rgba(52, 211, 153, 0.1)', color: '#34d399'}}>
            <UserRoundCheck size={24} />
        </div>
        <h3 className="stat-value animate-fade-in">
            {animatedLandlords}
        </h3>
        <p className="stat-label">Chủ Cho thuê</p>
    </div>

    {/* 3. Tổng Bài đăng */}
    <div className="stat-item">
        <div className="stat-icon" style={{background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa'}}>
            <ClipboardList size={24} />
        </div>
        <h3 className="stat-value animate-fade-in">
            {animatedPosts}
        </h3>
        <p className="stat-label">Bài đăng</p>
    </div>

    {/* 4. Tổng Đánh giá tích cực */}
    <div className="stat-item">
        <div className="stat-icon" style={{background: 'rgba(251, 146, 60, 0.1)', color: '#fb923c'}}>
            <Star size={24} />
        </div>
        <h3 className="stat-value animate-fade-in">
            {animatedReviews}
        </h3>
        <p className="stat-label">Bài đánh giá tích cực</p>
    </div>
</div>
            </div>
        </div>
      </section>

      {/* 3. STEPS SECTION */}
      <section className="section">
        <div className="container">
            <div className="section-header">
                <span className="section-subtitle">Quy trình đơn giản</span>
                <h3 className="section-title">Thuê phòng chỉ với 3 bước</h3>
            </div>

            <div className="grid-3">
                {[
                    { icon: Phone, title: "Liên hệ tư vấn", desc: "Kết nối trực tiếp chủ nhà.", step: "1" },
                    { icon: Home, title: "Xem phòng thực tế", desc: "Hình ảnh cam kết giống 100%.", step: "2" },
                    { icon: FileText, title: "Ký hợp đồng", desc: "Thủ tục pháp lý minh bạch.", step: "3" }
                ].map((item, idx) => (
                    <div key={idx} className="step-card">
                        <div className="step-number">{item.step}</div>
                        <div className="step-icon-box">
                            <item.icon size={36} strokeWidth={1.5} />
                        </div>
                        <h4>{item.title}</h4>
                        <p>{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>
      
      {/* 4. LATEST LISTINGS (ĐÃ KẾT NỐI API) */}
      <section className="section">
        <div className="container">
            <div className="section-top">
                <div>
                    <h2 className="section-title" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <TrendingUp size={32} color="#3b82f6"/> Phòng mới nhất
                    </h2>
                    <p className="hero-desc" style={{marginBottom: 0, marginTop: '8px'}}>Cập nhật liên tục các phòng trọ vừa được đăng tải.</p>
                </div>
                <Link to="/phong-tro" className="btn-outline">
                    Xem tất cả <ArrowRight size={18}/>
                </Link>
            </div>
            
            <div className="grid-3">
                {latestPosts.length > 0 ? (
                    latestPosts.slice(0, 3).map((item) => (
                    <div key={item.id} className="home-card">
                        <div className="home-card__img">
                            <img src={item.img} alt={item.title} />
                            <span className="card-badge-new">Mới</span>
                            <div className="card-price-tag">{Number(item.price).toLocaleString('vi-VN')} đ</div>
                        </div>
                        
                        <div className="home-card__body">
                            <h3 className="home-card__title" title={item.title}>{item.title}</h3>
                            <div className="home-card__addr">
                                <MapPin size={16} style={{marginTop: '2px', flexShrink: 0}} />
                                <span style={{display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{item.address}</span>
                            </div>
                            
                            <div className="home-card__footer">
                                <div className="card-specs">
                                    <span>{item.area} m²</span>
                                    <span>{item.city}</span>
                                </div>
                                <Link to={`/post/${item.id}`} className="btn-circle">
                                    <ArrowRight size={18}/>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))
                ) : (
                    <p style={{color: '#94a3b8', textAlign: 'center', gridColumn: '1/-1'}}>Đang cập nhật bài viết...</p>
                )}
            </div>
        </div>
      </section>

      {/* 5. POPULAR LOCATIONS (ĐÃ THÊM SỰ KIỆN CLICK) */}
      <section className="section">
        <div className="container">
            <div className="section-header">
                <h3 className="section-title">Khám phá theo khu vực</h3>
                <p className="hero-desc" style={{marginBottom: 0}}>Các khu vực hot nhất tại Huế</p>
            </div>
            
            <div className="bento-grid">
                <div 
                    className="bento-item bento-large" 
                    onClick={() => handleLocationClick("Vỹ Dạ")}
                    style={{cursor: 'pointer'}}
                >
                    <img src="https://images.unsplash.com/photo-1641460213122-336c96f558b0?auto=format&fit=crop&q=80&w=1000" className="bento-img" alt="Vỹ Dạ"/>
                    <div className="bento-overlay"></div>
                    <div className="bento-content">
                        <h4 className="bento-title">Vỹ Dạ</h4>
                        <p className="bento-subtitle">120+ Phòng</p>
                    </div>
                </div>

                <div 
                    className="bento-item"
                    onClick={() => handleLocationClick("Phú Xuân")}
                    style={{cursor: 'pointer'}}
                >
                    <img src="https://images.unsplash.com/photo-1664333039578-28ad613ee536?auto=format&fit=crop&q=80&w=500" className="bento-img" alt="Phú Xuân"/>
                    <div className="bento-overlay"></div>
                    <div className="bento-content">
                        <h4 className="bento-title">Phú Xuân</h4>
                        <p className="bento-subtitle">85+ Phòng</p>
                    </div>
                </div>

                <div 
                    className="bento-item"
                    onClick={() => handleLocationClick("An Cựu")}
                    style={{cursor: 'pointer'}}
                >
                    <img src="https://images.unsplash.com/photo-1493606371202-6275828f90f3?auto=format&fit=crop&q=80&w=500" className="bento-img" alt="An Cựu"/>
                    <div className="bento-overlay"></div>
                    <div className="bento-content">
                        <h4 className="bento-title">An Cựu</h4>
                        <p className="bento-subtitle">60+ Phòng</p>
                    </div>
                </div>

                <div 
                    className="bento-item bento-wide"
                    onClick={() => handleLocationClick("Huế")}
                    style={{cursor: 'pointer'}}
                >
                    <img src="https://images.unsplash.com/photo-1496588152823-86ff7695e68f?q=80&w=1740?auto=format&fit=crop&q=80&w=800" className="bento-img" alt="Trung tâm"/>
                    <div className="bento-overlay"></div>
                    <div className="bento-content">
                        <h4 className="bento-title">Trung tâm TP</h4>
                        <p className="bento-subtitle">200+ Căn hộ</p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="section bg-darker" style={{backgroundColor: 'rgba(15, 22, 35, 0.5)'}}>
        <div className="container">
            <div className="section-header">
                <span className="section-subtitle">Đánh giá</span>
                <h3 className="section-title">Khách hàng nói gì?</h3>
            </div>

            <div className="grid-3">
                {[
                    { name: "Nguyễn Văn Việt", role: "Sinh viên Y Dược", text: "Tìm phòng trọ ở Huế chưa bao giờ dễ dàng thế. Hình ảnh trên web rất thực tế.", img: "https://i.pravatar.cc/150?img=59" },
                    { name: "Trần Thị Lan", role: "NV Văn phòng", text: "Giao diện đẹp, dễ sử dụng. Thích nhất là tính năng lọc theo khu vực.", img: "https://i.pravatar.cc/150?img=5" },
                    { name: "Lê Hoàng Huy", role: "Chủ nhà trọ", text: "Tôi đăng tin trên Apartments rất hiệu quả, khách gọi liên tục.", img: "https://i.pravatar.cc/150?img=56" }
                ].map((item, idx) => (
                    <div key={idx} className="testimonial-card">
                        <div className="stars">
                            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                        </div>
                        <p className="review-text">"{item.text}"</p>
                        <div className="user-info">
                            <img src={item.img} alt={item.name} className="user-avatar"/>
                            <div>
                                <h4 style={{margin: 0, fontSize: '14px', color: '#fff'}}>{item.name}</h4>
                                <small style={{color: '#64748b'}}>{item.role}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* 7. CTA LANDLORD */}
      <section className="section">
        <div className="container">
            <div className="cta-box">
                <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=2000" alt="bg" className="cta-bg"/>
                <div className="hero-overlay" style={{background: 'linear-gradient(to right, #0f172a, transparent)', opacity: 0.9}}></div>
                
                <div className="cta-content">
                    <div className="cta-text">
                        <h2 className="cta-title">
                            Bạn có phòng trống? <br/>
                            <span className="text-highlight">Đăng tin ngay!</span>
                        </h2>
                        <p className="hero-desc">Tiếp cận hàng nghìn khách thuê tiềm năng tại Huế. Miễn phí trọn đời.</p>
                        <div className="hero-actions" style={{justifyContent: 'flex-start'}}>
                            <button className="btn-primary" style={{background: '#fff', color: '#0f172a'}}>
                                Đăng Tin Ngay <ArrowRight size={20}/>
                            </button>
                        </div>
                    </div>
                    
                    <div className="hidden-mobile" style={{display: 'flex', justifyContent: 'flex-end'}}>
                        <div className="cta-card-3d">
                            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                                <div className="icon-circle" style={{background: '#22c55e', color: '#fff'}}><CheckCircle size={20}/></div>
                                <div>
                                    <small style={{color: '#cbd5e1', textTransform: 'uppercase'}}>Hiệu quả</small>
                                    <div style={{color: '#fff', fontWeight: 'bold', fontSize: '18px'}}>Tiếp cận nhanh</div>
                                </div>
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                <div className="icon-circle" style={{background: '#3b82f6', color: '#fff'}}><Users size={20}/></div>
                                <div>
                                    <small style={{color: '#cbd5e1', textTransform: 'uppercase'}}>Cộng đồng</small>
                                    <div style={{color: '#fff', fontWeight: 'bold', fontSize: '18px'}}>5000+ Khách</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

    </div>
  )
}