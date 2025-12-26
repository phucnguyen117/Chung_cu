import { 
  Facebook, Instagram, Twitter , Youtube, ChevronUp, ChevronDown
} from 'lucide-react';
import { useState } from 'react';

export default function Footer(){
  const [officeOpen, setOfficeOpen] = useState(true);

  return (
 <footer className="site-footer">
  <div className="container footer-main">
    <div className="footer-col">
      <h4>Về Apartments</h4>
      <a href="/">Giới thiệu</a>
      <a href="/">Báo chí nói về Apartments</a>
      <a href="/">Tuyển dụng</a>
    </div>

    <div className="footer-col">
      <h4>Tài khoản</h4>
      <a href="/">Phòng yêu thích</a>
      <a href="/register">Đăng ký</a>
      <a href="/login">Đăng nhập</a>
      <a href="/">Ký gửi phòng cho thuê</a>
    </div>

    <div className="footer-col">
      <h4>Hỗ trợ</h4>
      <p>Số điện thoại: 0888.022.821</p>
      <p>Email: lienhe@apartments.vn</p>
      <a href="/">Sitemap</a>
    </div>

          <div className="footer-col footer-col--social">
            <h4>Kết nối với chúng tôi</h4>
            <div className="footer-social">
            <button aria-label="Facebook" className="footer-social__icon"
              onClick={() => window.open('https://facebook.com', '_blank')}
            >
              <Facebook size={20} />
            </button>

            <button aria-label="Instagram" className="footer-social__icon"
              onClick={() => window.open('https://instagram.com', '_blank')}
            >
              <Instagram size={20} />
            </button>

            <button aria-label="YouTube" className="footer-social__icon"
              onClick={() => window.open('https://youtube.com', '_blank')}
            >
              <Youtube size={20} />
            </button>

            <button aria-label="Twitter" className="footer-social__icon"
              onClick={() => window.open('https://twitter.com', '_blank')}
            >
              <Twitter size={20} />
            </button>
            </div>
          </div>
        </div>

        <div className="footer-offices container">
          <details className="footer-office" 
            open={officeOpen}
            onClick={() => setOfficeOpen(prev => !prev)}
          >
            <summary>
              <span className="footer-office__arrow">
                {officeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
              <span>Xem văn phòng tại TP Huế</span>
            </summary>
            <p className="footer-office__title">Văn phòng số 8</p>
            <p>70 nguyễn huệ, thành phố huế</p>
            <p>Điện thoại: 0888.999.888</p>
          </details>
        </div>

        <div className="footer-bottom">
          <div className="container footer-bottom__inner">
            <p>
              © 2023–2025. Bản quyền thuộc Apartments and Condominiums – Địa chỉ:
              
              – Điện thoại: 0888.999.888.
            </p>
          </div>
        </div>
      </footer>
  )
}
