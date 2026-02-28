'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';

const navItems = [
    { href: '/', icon: '📊', label: 'Dashboard' },
    { href: '/accidents', icon: '🔴', label: 'Accidents & Incidents' },
    { href: '/trades', icon: '💼', label: 'Aviation Trades' },
    { href: '/regulations', icon: '📜', label: 'Regulations' },
    { href: '/wiki-news', icon: '🌍', label: 'Wikipedia News' },
    { href: '/aircraft', icon: '✈️', label: 'Aircraft Encyclopedia' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">✈️</div>
                <div>
                    <div className="logo-text">AviationIQ</div>
                    <div className="logo-sub">Intelligence Platform</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-label">Navigation</div>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}

                <div className="nav-section-label" style={{ marginTop: '24px' }}>Data Sources</div>
                <div className="nav-link" style={{ cursor: 'default' }}>
                    <span className="nav-icon">📡</span>
                    <span>RSS Feeds</span>
                    <span className="nav-badge">8</span>
                </div>
                <div className="nav-link" style={{ cursor: 'default' }}>
                    <span className="nav-icon">🌐</span>
                    <span>News APIs</span>
                    <span className="nav-badge">2</span>
                </div>
                <div className="nav-link" style={{ cursor: 'default' }}>
                    <span className="nav-icon">🤖</span>
                    <span>AI Classifier</span>
                    <span className="nav-badge" style={{ color: 'var(--accent-green)' }}>Active</span>
                </div>

                <div className="nav-section-label" style={{ marginTop: '24px' }}>Appearance</div>
                <button
                    type="button"
                    className="nav-link"
                    onClick={toggleTheme}
                    style={{ width: '100%', border: 'none', background: 'transparent' }}
                >
                    <span className="nav-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
                    <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                    <span className="nav-badge">{theme === 'dark' ? 'On' : 'On'}</span>
                </button>
            </nav>

            <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Aviation Intelligence Platform v1.0
                </div>
            </div>
        </aside>
    );
}
