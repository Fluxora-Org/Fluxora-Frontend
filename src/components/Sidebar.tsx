import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <aside style={{
      ...styles.sidebar,
      width: collapsed ? '80px' : '255.99px',
    }}>
      <div style={styles.content}>
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          style={styles.logoButton}
          aria-label="Go to home"
        >
          <div style={styles.logoIcon}>F</div>
          {!collapsed && <span style={styles.logoText}>Fluxora</span>}
        </button>

        <div style={styles.divider} />

        {/* Main Navigation */}
        <nav style={styles.nav}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive && styles.activeLink),
            })}
            onMouseEnter={(e) => !e.currentTarget.classList.contains('active') && (e.currentTarget.style.color = '#0ea5e9')}
            onMouseLeave={(e) => !e.currentTarget.classList.contains('active') && (e.currentTarget.style.color = '#6b7280')}
          >
            {({ isActive }) => (
              <>
                {isActive && <div style={styles.activeBar} />}
                <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
                  <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
                  <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
                  <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
                </svg>
                {!collapsed && <span>Dashboard</span>}
              </>
            )}
          </NavLink>

          <NavLink
            to="/streams"
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive && styles.activeLink),
            })}
            onMouseEnter={(e) => !e.currentTarget.classList.contains('active') && (e.currentTarget.style.color = '#0ea5e9')}
            onMouseLeave={(e) => !e.currentTarget.classList.contains('active') && (e.currentTarget.style.color = '#6b7280')}
          >
            {({ isActive }) => (
              <>
                {isActive && <div style={styles.activeBar} />}
                <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="8" y1="6" x2="21" y2="6" strokeWidth="2" />
                  <line x1="8" y1="12" x2="21" y2="12" strokeWidth="2" />
                  <line x1="8" y1="18" x2="21" y2="18" strokeWidth="2" />
                  <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="2" />
                  <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="2" />
                  <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="2" />
                </svg>
                {!collapsed && <span>Streams</span>}
              </>
            )}
          </NavLink>

          <NavLink
            to="/recipient"
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive && styles.activeLink),
            })}
            onMouseEnter={(e) => !e.currentTarget.classList.contains('active') && (e.currentTarget.style.color = '#0ea5e9')}
            onMouseLeave={(e) => !e.currentTarget.classList.contains('active') && (e.currentTarget.style.color = '#6b7280')}
          >
            {({ isActive }) => (
              <>
                {isActive && <div style={styles.activeBar} />}
                <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="8" r="4" strokeWidth="2" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" strokeWidth="2" />
                </svg>
                {!collapsed && <span>Recipient</span>}
              </>
            )}
          </NavLink>
        </nav>

        {/* Utility Links */}
        <div style={styles.utility}>
          <a 
            href="#" 
            style={styles.utilityLink}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0ea5e9'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            <svg style={styles.icon} viewBox="0 0 20 20" fill="none">
              <g clipPath="url(#clip0_1_1594)">
                <path d="M12.497 1.66626H4.99879C4.55687 1.66626 4.13305 1.84181 3.82056 2.1543C3.50807 2.46679 3.33252 2.89061 3.33252 3.33253V16.6627C3.33252 17.1046 3.50807 17.5284 3.82056 17.8409C4.13305 18.1534 4.55687 18.329 4.99879 18.329H14.9964C15.4383 18.329 15.8622 18.1534 16.1746 17.8409C16.4871 17.5284 16.6627 17.1046 16.6627 16.6627V5.83194L12.497 1.66626Z" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.6641 1.66626V4.9988C11.6641 5.44072 11.8396 5.86455 12.1521 6.17703C12.4646 6.48952 12.8884 6.66507 13.3303 6.66507H16.6629" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.33131 7.49823H6.66504" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.3301 10.8307H6.66504" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.3301 14.1633H6.66504" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
            {!collapsed && <span>Documentation</span>}
          </a>

          <a 
            href="#" 
            style={styles.utilityLink}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0ea5e9'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            <svg style={styles.icon} viewBox="0 0 20 20" fill="none">
              <g clipPath="url(#clip0_1_1603)">
                <path d="M13.3301 13.3302L15.8295 6.6651L18.3289 13.3302C17.6041 13.8717 16.7293 14.1633 15.8295 14.1633C14.9297 14.1633 14.0549 13.8717 13.3301 13.3302Z" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1.6665 13.3302L4.16591 6.6651L6.66532 13.3302C5.94049 13.8717 5.0657 14.1633 4.16591 14.1633C3.26612 14.1633 2.39133 13.8717 1.6665 13.3302Z" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.83203 17.4958H14.1634" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.99756 2.49939V17.4958" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.49951 5.83192H4.16578C5.83205 5.83192 8.33146 4.99878 9.99773 4.16565C11.664 4.99878 14.1634 5.83192 15.8297 5.83192H17.4959" stroke="currentColor" strokeWidth="1.66627" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
            {!collapsed && <span>Legal</span>}
          </a>

          <div style={styles.divider} />

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={styles.collapseButton}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0ea5e9'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            <svg
              style={{
                ...styles.icon,
                transform: collapsed ? 'rotate(180deg)' : 'none',
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline points="15,18 9,12 15,6" strokeWidth="2" />
            </svg>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '255.99px',
    height: '100vh',
    backgroundColor: '#FFFFFF',
    borderRight: '0.69px solid #E5E7EB',
    transition: 'width 0.3s ease',
    zIndex: 100,
    opacity: 1,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '16px 0',
  },
  logoButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 24px',
    marginBottom: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(180deg, #00B8D4 0%, #0097A7 100%)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 'bold',
    flexShrink: 0,
    opacity: 1,
    boxShadow: '0px 4px 6px -4px rgba(0, 184, 212, 0.3), 0px 10px 15px -3px rgba(0, 184, 212, 0.3)',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    whiteSpace: 'nowrap',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  navLink: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 24px',
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  navLinkHover: {
    color: '#0ea5e9',
  },
  activeLink: {
    backgroundColor: '#dbeafe',
    color: '#0ea5e9',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '3px',
    backgroundColor: '#0ea5e9',
  },
  icon: {
    width: '20px',
    height: '20px',
    flexShrink: 0,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  utility: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingTop: '24px',
    paddingBottom: '16px',
    borderTop: '1px solid #e5e7eb',
    marginTop: 'auto',
  },
  utilityLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 24px',
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'color 0.2s',
    cursor: 'pointer',
  },
  collapseButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 24px',
    color: '#6b7280',
    fontSize: '15px',
    fontWeight: '500',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'color 0.2s',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '8px 0',
  },
};
