import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
    BotMessageSquare, X, Send, MapPin, Sparkles, 
    Lightbulb, ChevronRight
} from 'lucide-react';
import '../assets/style/Chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false); // Toggle gợi ý
    const [messages, setMessages] = useState([
        { 
            text: "Xin chào! Mình là trợ lý ảo hỗ trợ tìm bài viết cho thuê, hướng dẫn sử dụng, giải quyết thắc mắc. Mình có thể giúp gì cho bạn hôm nay?", 
            sender: 'bot',
            type: 'text' 
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Danh sách câu hỏi mẫu
    const quickQuestions = [
        "Tìm phòng trọ giá dưới 3 triệu",
        "Nhà nguyên căn ở Thuận hóa",
        "Cách đăng bài cho thuê phòng trọ?",
        "Bạn hỗ trợ được những gì cho tôi?"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        // Focus vào input khi mở chat
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [messages, isOpen, isLoading]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleSendMessage = async (text = inputValue) => {
        if (!text.trim()) return;

        // Đóng gợi ý nếu đang mở
        setShowSuggestions(false);

        const userMsg = { text: text, sender: 'user', type: 'text' };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Giả lập API call (Thay thế bằng URL thật của bạn)
            const response = await axios.post('http://localhost:8000/api/chatbot', {
                message: userMsg.text
            });

            const { reply, posts } = response.data;

            const botMsg = {
                text: reply,
                sender: 'bot',
                type: 'response',
                posts: posts || []
            };

            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error("Chatbot Error:", error);
            setMessages(prev => [...prev, { 
                text: "Xin lỗi, kết nối đến server đang gặp sự cố. Bạn vui lòng thử lại sau nhé!", 
                sender: 'bot', 
                type: 'text' 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const handleSuggestionClick = (question) => {
        handleSendMessage(question);
    };

    return (
        <div className={`chatbot-wrapper ${isOpen ? 'active' : ''}`}>
            
            {/* 1. Nút Mở Chat (Floating Button) */}
            <button 
                className={`chatbot-toggler ${isOpen ? 'hidden' : ''}`} 
                onClick={() => setIsOpen(true)}
            >
                <BotMessageSquare size={28} />
                <span className="pulse-ring"></span>
            </button>

            {/* 2. Cửa sổ Chat Chính */}
            <div className={`chatbot-container ${isOpen ? 'show' : ''}`}>
                
                {/* Header */}
                <div className="chat-header">
                    <div className="header-info">
                        <div className="avatar-wrapper">
                            <Sparkles size={20} className="avatar-icon" />
                            <span className="status-indicator"></span>
                        </div>
                        <div className="header-text">
                            <h3>Trợ lý AI</h3>
                            <p>Luôn sẵn sàng hỗ trợ</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={() => setIsOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="chat-body">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message-row ${msg.sender}`}>
                            {msg.sender === 'bot' && (
                                <div className="bot-avatar-small">
                                    <Sparkles size={14} />
                                </div>
                            )}
                            
                            <div className="message-content-wrapper">
                                <div className="msg-bubble">
                                    {msg.text}
                                </div>

                                {/* Hiển thị danh sách bài đăng (Slider ngang) */}
                                {msg.sender === 'bot' && msg.posts && msg.posts.length > 0 && (
                                    <div className="posts-slider-container">
                                        <div className="posts-track">
                                            {msg.posts.map(post => (
                                                <div key={post.id} className="post-card">
                                                    <div className="card-image">
                                                        <img 
                                                            src={post.images?.[0]?.file?.url || post.images?.[0]?.url || 'https://via.placeholder.com/300x200?text=No+Image'} 
                                                            alt={post.title} 
                                                        />
                                                        <span className="card-price">{formatCurrency(post.price)}</span>
                                                    </div>
                                                    <div className="card-details">
                                                        <h4 className="card-title" title={post.title}>{post.title}</h4>
                                                        <div className="card-location">
                                                            <MapPin size={12} />
                                                            <span>{post.district?.name}, {post.province?.name}</span>
                                                        </div>
                                                        <a href={`/post/${post.id}`} target="_blank" rel="noreferrer" className="card-btn">
                                                            Xem chi tiết <ChevronRight size={14} />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="message-row bot">
                            <div className="bot-avatar-small"><Sparkles size={14} /></div>
                            <div className="msg-bubble loading">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Footer Input Area */}
                <div className="chat-footer">
                    {/* Pop-up Gợi ý */}
                    {showSuggestions && (
                        <div className="suggestions-popup">
                            <div className="suggestions-header">
                                <span>Gợi ý câu hỏi</span>
                                <button onClick={() => setShowSuggestions(false)}><X size={14}/></button>
                            </div>
                            <div className="suggestions-list">
                                {quickQuestions.map((q, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => !isLoading && handleSuggestionClick(q)}
                                        disabled={isLoading}   // khi chatbot đang trả lời → không bấm được
                                        className={isLoading ? "disabled" : ""}>
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Thanh nhập liệu */}
                    <div className="input-group">
                        <button 
                            className={`icon-btn hint-btn ${showSuggestions ? 'active' : ''}`}
                            onClick={() => setShowSuggestions(!showSuggestions)}
                            title="Gợi ý câu hỏi"
                        >
                            <Lightbulb size={22} />
                        </button>
                        
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Nhập yêu cầu hỗ trợ..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                        />
                        
                        <button 
                            className="icon-btn send-btn" 
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isLoading}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;