import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const socket = io(SERVER_URL);

const getColor = (name) => {
    const colors = ['#5865F2', '#ED4245', '#FEE75C', '#57F287', '#EB459E', '#FF7043', '#00BCD4', '#9C27B0'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
};
const initials = (n) => n.slice(0, 2).toUpperCase();

function App() {
    const [username, setUsername] = useState('');
    const [joined, setJoined] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUser, setTypingUser] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const endRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        socket.on('new_message', (msg) => setMessages((p) => [...p, msg]));
        socket.on('user_joined', (d) => {
            setOnlineUsers(d.users);
            setMessages((p) => [...p, { id: Date.now(), type: 'system', text: `${d.username} joined the server` }]);
        });
        socket.on('user_left', (d) => {
            setOnlineUsers(d.users);
            if (d.username) setMessages((p) => [...p, { id: Date.now(), type: 'system', text: `${d.username} left` }]);
        });
        socket.on('user_typing', ({ username: u, isTyping }) => setTypingUser(isTyping ? u : null));
        return () => { socket.off('new_message'); socket.off('user_joined'); socket.off('user_left'); socket.off('user_typing'); };
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim()) { socket.emit('join', username.trim()); setJoined(true); }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (input.trim()) { socket.emit('send_message', { text: input.trim() }); setInput(''); socket.emit('typing', false); }
    };

    const handleTyping = (e) => {
        setInput(e.target.value);
        socket.emit('typing', true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => socket.emit('typing', false), 1000);
    };

    const fmt = (ts) => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const channels = [
        { id: 'general', label: '# general', desc: 'Kênh chung' },
        { id: 'random', label: '# random', desc: 'Linh tinh' },
        { id: 'showcase', label: '# showcase', desc: 'Khoe thành phẩm' },
    ];

    if (!joined) {
        return (
            <div className="login-screen">
                <div className="login-bg-blur" />
                <form className="login-box" onSubmit={handleLogin}>
                    <div className="login-icon">⚡</div>
                    <h1>Chào mừng trở lại!</h1>
                    <p>Rất vui khi gặp lại bạn</p>
                    <label>TÊN NGƯỜI DÙNG</label>
                    <input className="login-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập tên..." autoFocus />
                    <button type="submit" className="login-btn">Đăng nhập</button>
                    <span className="login-register">Chưa có tài khoản? <b>Đăng ký ngay</b></span>
                </form>
            </div>
        );
    }

    return (
        <div className="app">
            {/* Server Icons Column */}
            <nav className="nav-servers">
                <div className="server-btn active" title="WebChat">⚡</div>
                <div className="nav-divider" />
                <div className="server-btn" title="Music">🎵</div>
                <div className="server-btn" title="Gaming">🎮</div>
                <div className="server-btn" title="Art">🎨</div>
                <div className="nav-divider" />
                <div className="server-btn add" title="Add Server">＋</div>
            </nav>

            {/* Channels Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <span>WebSocket Chat</span>
                    <span className="chevron">▾</span>
                </div>
                <div className="channel-group">
                    <div className="channel-label">▸ TEXT CHANNELS</div>
                    {channels.map(ch => (
                        <div
                            key={ch.id}
                            className={`channel-item ${activeTab === ch.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(ch.id)}
                        >
                            {ch.label}
                        </div>
                    ))}
                </div>
                <div className="channel-group">
                    <div className="channel-label">▸ VOICE CHANNELS</div>
                    <div className="channel-item">🔊 Lounge</div>
                    <div className="channel-item">🔊 Gaming</div>
                </div>
                <div className="user-bar">
                    <div className="user-avatar" style={{ background: getColor(username) }}>{initials(username)}</div>
                    <div className="user-bar-info">
                        <div className="user-bar-name">{username}</div>
                        <div className="user-bar-status">🟢 Online</div>
                    </div>
                    <div className="user-bar-icons">🎤 🔇 ⚙️</div>
                </div>
            </aside>

            {/* Main Chat */}
            <main className="chat">
                <header className="chat-header">
                    <div className="header-left">
                        <span className="header-channel">{channels.find(c => c.id === activeTab)?.label}</span>
                        <span className="header-divider">|</span>
                        <span className="header-desc">{channels.find(c => c.id === activeTab)?.desc}</span>
                    </div>
                    <div className="header-right">
                        <span className="header-icon" title="Members">👥 {onlineUsers.length}</span>
                        <span className="header-icon">🔔</span>
                        <span className="header-icon">📌</span>
                        <input className="header-search" placeholder="Tìm kiếm..." />
                    </div>
                </header>

                <div className="messages">
                    <div className="messages-welcome">
                        <div className="welcome-hash">#</div>
                        <h2>Chào mừng đến #{channels.find(c => c.id === activeTab)?.id}!</h2>
                        <p>Đây là điểm bắt đầu của kênh #{channels.find(c => c.id === activeTab)?.id}</p>
                    </div>

                    {messages.map(msg => {
                        if (msg.type === 'system') return (
                            <div key={msg.id} className="sys-msg">
                                <div className="sys-line" /><span>{msg.text}</span><div className="sys-line" />
                            </div>
                        );
                        return (
                            <div key={msg.id} className="msg">
                                <div className="msg-avatar" style={{ background: getColor(msg.username) }}>{initials(msg.username)}</div>
                                <div className="msg-body">
                                    <div className="msg-meta">
                                        <span className="msg-name" style={{ color: getColor(msg.username) }}>{msg.username}</span>
                                        <span className="msg-time">{fmt(msg.timestamp)}</span>
                                    </div>
                                    <div className="msg-text">{msg.text}</div>
                                </div>
                            </div>
                        );
                    })}

                    {typingUser && typingUser !== username && (
                        <div className="typing">
                            <div className="typing-dots"><span /><span /><span /></div>
                            <span><b>{typingUser}</b> đang nhập...</span>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                <form className="input-bar" onSubmit={handleSend}>
                    <button type="button" className="input-add">＋</button>
                    <input
                        className="input-field"
                        placeholder={`Nhắn tin tới #${activeTab}`}
                        value={input}
                        onChange={handleTyping}
                    />
                    <div className="input-icons">
                        <button type="button" className="input-icon-btn">😊</button>
                        <button type="button" className="input-icon-btn">🎁</button>
                        <button type="submit" className="input-send" disabled={!input.trim()}>➤</button>
                    </div>
                </form>
            </main>

            {/* Members Sidebar */}
            <aside className="members-sidebar">
                <div className="members-header">THÀNH VIÊN — {onlineUsers.length}</div>
                <div className="members-section">ONLINE — {onlineUsers.length}</div>
                {onlineUsers.map((u, i) => (
                    <div key={i} className="member">
                        <div className="member-avatar" style={{ background: getColor(u) }}>{initials(u)}</div>
                        <div className="member-name">{u === username ? `${u} (bạn)` : u}</div>
                        <div className="member-dot" />
                    </div>
                ))}
            </aside>
        </div>
    );
}

export default App;
