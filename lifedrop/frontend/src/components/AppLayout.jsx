import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../context/store';
import { useAuthStore } from '../context/store';

const navItems = [
  { path: '/',             icon: '🏠', label: 'Home' },
  { path: '/donors',       icon: '🗺️', label: 'Donors' },
  { path: '/sos',          icon: '🆘', label: 'SOS' },
  { path: '/requests',     icon: '🩸', label: 'Requests' },
  { path: '/profile',      icon: '👤', label: 'Profile' },
];

export default function AppLayout({ children }) {
  const location = useLocation();
  const { unreadCount } = useAppStore();
  const { user } = useAuthStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 480, margin: '0 auto', background: '#FAFAF9' }}>
      {/* Top Bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E8E4DF',
        padding: '0 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, background: '#C0152A',
            borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ transform: 'rotate(45deg)', color: '#fff', fontSize: 13, fontWeight: 700 }}>+</span>
          </div>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: '#1A1A18' }}>LifeDrop</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/notifications" style={{ position: 'relative', textDecoration: 'none' }}>
            <div style={{
              background: '#fff', border: '1px solid #E8E4DF',
              width: 34, height: 34, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>🔔</div>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#C0152A', color: '#fff',
                fontSize: 10, fontWeight: 700,
                width: 16, height: 16, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </Link>
          <Link to="/profile" style={{ textDecoration: 'none' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: '#FFF0F1', color: '#C0152A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
            }}>
              {user?.name?.slice(0,2).toUpperCase() || 'ME'}
            </div>
          </Link>
        </div>
      </div>

      {/* Page Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 72px' }}>
        {children}
      </div>

      {/* Bottom Nav */}
      <div style={{
        background: '#fff', borderTop: '1px solid #E8E4DF',
        display: 'flex', padding: '8px 0 6px',
        position: 'fixed', bottom: 0, width: '100%', maxWidth: 480,
        zIndex: 100,
      }}>
        {navItems.map(({ path, icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, textDecoration: 'none',
              padding: '4px 0',
            }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: active ? '#C0152A' : '#AEACAA',
              }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
