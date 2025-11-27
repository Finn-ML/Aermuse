import { useState, useEffect } from 'react';

export default function AermuseDashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    )},
    { id: 'contracts', label: 'Contract Manager', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    )},
    { id: 'landing', label: 'Landing Page', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
    )}
  ];

  const stats = [
    { label: 'Active Contracts', value: '12', change: '+2 this month', trend: 'up' },
    { label: 'Fan Subscribers', value: '2,847', change: '+156 this week', trend: 'up' },
    { label: 'Page Views', value: '14.2K', change: '+8.3%', trend: 'up' },
    { label: 'Revenue', value: '$4,280', change: '+$840 this month', trend: 'up' }
  ];

  const recentContracts = [
    { name: 'Publishing Agreement - Universal', status: 'pending', date: 'Nov 24, 2025' },
    { name: 'Sync License - Netflix Series', status: 'signed', date: 'Nov 20, 2025' },
    { name: 'Management Contract Review', status: 'review', date: 'Nov 18, 2025' }
  ];

  const allContracts = [
    { name: 'Publishing Agreement - Universal', status: 'pending', date: 'Nov 24, 2025', type: 'Publishing', value: '$45,000', parties: 'Universal Music Publishing' },
    { name: 'Sync License - Netflix Series', status: 'signed', date: 'Nov 20, 2025', type: 'Sync', value: '$12,500', parties: 'Netflix Entertainment' },
    { name: 'Management Contract Review', status: 'review', date: 'Nov 18, 2025', type: 'Management', value: '15% rev share', parties: 'Stellar Artist Management' },
    { name: 'Distribution Agreement - Spotify', status: 'signed', date: 'Nov 10, 2025', type: 'Distribution', value: '70/30 split', parties: 'Spotify AB' },
    { name: 'Merchandise License', status: 'signed', date: 'Oct 28, 2025', type: 'Merchandise', value: '$8,200', parties: 'MerchWorld Inc.' },
    { name: 'Festival Performance Contract', status: 'pending', date: 'Oct 15, 2025', type: 'Performance', value: '$25,000', parties: 'Coachella Valley Music' }
  ];

  const upcomingEvents = [
    { title: 'Contract Renewal Due', date: 'Dec 1, 2025', type: 'contract' },
    { title: 'Fan Meetup - LA', date: 'Dec 5, 2025', type: 'event' },
    { title: 'Royalty Payment', date: 'Dec 15, 2025', type: 'payment' }
  ];

  const landingPageStats = [
    { label: 'Total Views', value: '14,247' },
    { label: 'Unique Visitors', value: '8,392' },
    { label: 'Avg. Time on Page', value: '2m 34s' },
    { label: 'Click Rate', value: '12.4%' }
  ];

  const landingLinks = [
    { name: 'Spotify', url: 'spotify.com/artist/miravoss', clicks: 2847, enabled: true },
    { name: 'Apple Music', url: 'music.apple.com/miravoss', clicks: 1923, enabled: true },
    { name: 'Instagram', url: 'instagram.com/miravoss', clicks: 3201, enabled: true },
    { name: 'Merch Store', url: 'shop.miravoss.com', clicks: 892, enabled: true },
    { name: 'Tour Dates', url: 'miravoss.com/tour', clicks: 1456, enabled: false }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F7E6CA',
      fontFamily: '"Nunito", sans-serif',
      color: '#660033',
      display: 'flex',
      position: 'relative'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        ::selection {
          background: #660033;
          color: #F7E6CA;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          font-size: 15px;
          color: rgba(102, 0, 51, 0.6);
          text-decoration: none;
        }
        
        .nav-item:hover {
          background: rgba(102, 0, 51, 0.06);
          color: #660033;
        }
        
        .nav-item.active {
          background: #660033;
          color: #F7E6CA;
        }
        
        .stat-card {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 20px;
          padding: 28px;
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          background: rgba(255, 255, 255, 0.8);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(102, 0, 51, 0.08);
        }
        
        .content-card {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 20px;
          padding: 28px;
        }
        
        .contract-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid rgba(102, 0, 51, 0.08);
          transition: all 0.2s ease;
        }
        
        .contract-item:last-child {
          border-bottom: none;
        }
        
        .contract-item:hover {
          padding-left: 8px;
        }
        
        .status-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .status-pending {
          background: rgba(255, 193, 7, 0.15);
          color: #B8860B;
        }
        
        .status-signed {
          background: rgba(40, 167, 69, 0.15);
          color: #28a745;
        }
        
        .status-review {
          background: rgba(102, 0, 51, 0.1);
          color: #660033;
        }
        
        .event-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid rgba(102, 0, 51, 0.08);
        }
        
        .event-item:last-child {
          border-bottom: none;
        }
        
        .event-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: white;
          border-radius: 16px;
          padding: 8px;
          min-width: 200px;
          box-shadow: 0 20px 50px rgba(102, 0, 51, 0.15);
          z-index: 100;
        }
        
        .profile-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          font-weight: 500;
          color: #660033;
        }
        
        .profile-dropdown-item:hover {
          background: rgba(102, 0, 51, 0.06);
        }
        
        .contract-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .contract-table th {
          text-align: left;
          padding: 14px 16px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(102, 0, 51, 0.5);
          border-bottom: 2px solid rgba(102, 0, 51, 0.1);
        }
        
        .contract-table td {
          padding: 18px 16px;
          border-bottom: 1px solid rgba(102, 0, 51, 0.06);
          font-size: 14px;
        }
        
        .contract-table tr:hover td {
          background: rgba(102, 0, 51, 0.02);
        }
        
        .btn-primary-sm {
          background: #660033;
          color: #F7E6CA;
          border: none;
          padding: 12px 24px;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 50px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary-sm:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(102, 0, 51, 0.25);
        }
        
        .btn-secondary-sm {
          background: rgba(255, 255, 255, 0.6);
          color: #660033;
          border: 2px solid rgba(102, 0, 51, 0.15);
          padding: 10px 20px;
          font-family: 'Nunito', sans-serif;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 50px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .btn-secondary-sm:hover {
          background: rgba(255, 255, 255, 0.9);
          border-color: #660033;
        }
        
        .link-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 16px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
        }
        
        .link-item:hover {
          background: rgba(255, 255, 255, 0.8);
          transform: translateX(4px);
        }
        
        .link-item.disabled {
          opacity: 0.5;
        }
        
        .toggle-switch {
          position: relative;
          width: 48px;
          height: 26px;
          background: rgba(102, 0, 51, 0.2);
          border-radius: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .toggle-switch.active {
          background: #660033;
        }
        
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s ease;
        }
        
        .toggle-switch.active::after {
          left: 25px;
        }
        
        .landing-preview {
          background: linear-gradient(135deg, #660033 0%, #8B0045 100%);
          border-radius: 24px;
          padding: 40px;
          color: #F7E6CA;
          position: relative;
          overflow: hidden;
        }
        
        .landing-preview::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(247, 230, 202, 0.1) 0%, transparent 60%);
        }
        
        .filter-btn {
          background: rgba(255, 255, 255, 0.5);
          border: none;
          padding: 10px 20px;
          font-family: 'Nunito', sans-serif;
          font-weight: 600;
          font-size: 13px;
          color: rgba(102, 0, 51, 0.6);
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 10px;
        }
        
        .filter-btn:hover, .filter-btn.active {
          background: #660033;
          color: #F7E6CA;
        }
        
        .grain-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          z-index: 1000;
        }
      `}</style>

      {/* Grain Overlay */}
      <div className="grain-overlay" />

      {/* Sidebar */}
      <aside style={{
        width: '280px',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRight: '1px solid rgba(102, 0, 51, 0.08)',
        padding: '32px 20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        opacity: isLoaded ? 1 : 0,
        animation: isLoaded ? 'fadeIn 0.6s ease forwards' : 'none'
      }}>
        {/* Logo */}
        <div style={{
          fontSize: '24px',
          fontWeight: '300',
          letterSpacing: '0.25em',
          textTransform: 'lowercase',
          marginBottom: '48px',
          paddingLeft: '20px'
        }}>
          aermuse
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => (
            <a
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              {item.icon}
              {item.label}
            </a>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid rgba(102, 0, 51, 0.08)',
          marginTop: 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F7E6CA',
              fontWeight: '700',
              fontSize: '14px'
            }}>
              MV
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>Mira Voss</div>
              <div style={{ fontSize: '12px', color: 'rgba(102, 0, 51, 0.5)' }}>Pro Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        marginLeft: '280px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <header style={{
          height: '80px',
          backgroundColor: 'rgba(247, 230, 202, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(102, 0, 51, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          opacity: isLoaded ? 1 : 0,
          animation: isLoaded ? 'fadeIn 0.6s ease forwards 0.1s' : 'none',
          animationFillMode: 'both'
        }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '2px'
            }}>
              {activeNav === 'dashboard' && 'Welcome back, Mira'}
              {activeNav === 'contracts' && 'Contract Manager'}
              {activeNav === 'landing' && 'Landing Page'}
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'rgba(102, 0, 51, 0.6)',
              fontWeight: '500'
            }}>
              {activeNav === 'dashboard' && "Here's what's happening with your music career"}
              {activeNav === 'contracts' && 'Manage, analyze, and sign your contracts with AI assistance'}
              {activeNav === 'landing' && 'Customize your artist page and manage your links'}
            </p>
          </div>

          {/* Profile Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.6)',
                border: '2px solid rgba(102, 0, 51, 0.1)',
                borderRadius: '16px',
                padding: '10px 16px 10px 12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F7E6CA',
                fontWeight: '700',
                fontSize: '13px'
              }}>
                MV
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#660033" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Profile Settings
                </div>
                <div className="profile-dropdown-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Account Settings
                </div>
                <div className="profile-dropdown-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign Out
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <main style={{
          flex: 1,
          padding: '32px 40px',
          opacity: isLoaded ? 1 : 0,
          animation: isLoaded ? 'slideIn 0.6s ease forwards 0.2s' : 'none',
          animationFillMode: 'both'
        }}>
          {/* Dashboard View */}
          {activeNav === 'dashboard' && (
            <>
              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '24px',
                marginBottom: '32px'
              }}>
                {stats.map((stat, index) => (
                  <div key={index} className="stat-card">
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'rgba(102, 0, 51, 0.5)',
                      marginBottom: '12px'
                    }}>
                      {stat.label}
                    </div>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      marginBottom: '8px'
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#28a745',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                        <polyline points="17 6 23 6 23 12"/>
                      </svg>
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* Two Column Layout */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr',
                gap: '24px'
              }}>
                {/* Recent Contracts */}
                <div className="content-card">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px'
                  }}>
                    <h2 style={{
                      fontSize: '18px',
                      fontWeight: '700'
                    }}>
                      Recent Contracts
                    </h2>
                    <button 
                      onClick={() => setActiveNav('contracts')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#660033',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      View All
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </div>

                  {recentContracts.map((contract, index) => (
                    <div key={index} className="contract-item">
                      <div>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '15px',
                          marginBottom: '4px'
                        }}>
                          {contract.name}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: 'rgba(102, 0, 51, 0.5)'
                        }}>
                          {contract.date}
                        </div>
                      </div>
                      <span className={`status-badge status-${contract.status}`}>
                        {contract.status}
                      </span>
                    </div>
                  ))}

                  {/* Add Contract Button */}
                  <button style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '14px',
                    background: 'rgba(102, 0, 51, 0.06)',
                    border: '2px dashed rgba(102, 0, 51, 0.2)',
                    borderRadius: '12px',
                    color: '#660033',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    fontFamily: 'Nunito, sans-serif'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Upload New Contract
                  </button>
                </div>

                {/* Upcoming Events */}
                <div className="content-card">
                  <h2 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    marginBottom: '24px'
                  }}>
                    Upcoming
                  </h2>

                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="event-item">
                      <div 
                        className="event-icon"
                        style={{
                          background: event.type === 'contract' 
                            ? 'rgba(102, 0, 51, 0.1)' 
                            : event.type === 'event'
                            ? 'rgba(40, 167, 69, 0.1)'
                            : 'rgba(255, 193, 7, 0.15)'
                        }}
                      >
                        {event.type === 'contract' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#660033" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        )}
                        {event.type === 'event' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                        )}
                        {event.type === 'payment' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '14px',
                          marginBottom: '2px'
                        }}>
                          {event.title}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: 'rgba(102, 0, 51, 0.5)'
                        }}>
                          {event.date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Contract Manager View */}
          {activeNav === 'contracts' && (
            <>
              {/* Header Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginBottom: '32px'
              }}>
                <button className="btn-primary-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Upload Contract
                </button>
              </div>

              {/* Filter Tabs */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px'
              }}>
                <button className="filter-btn active">All Contracts</button>
                <button className="filter-btn">Pending</button>
                <button className="filter-btn">In Review</button>
                <button className="filter-btn">Signed</button>
              </div>

              {/* Contracts Table */}
              <div className="content-card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="contract-table">
                  <thead>
                    <tr>
                      <th>Contract Name</th>
                      <th>Type</th>
                      <th>Parties</th>
                      <th>Value</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allContracts.map((contract, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: '600' }}>{contract.name}</td>
                        <td>
                          <span style={{
                            background: 'rgba(102, 0, 51, 0.08)',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {contract.type}
                          </span>
                        </td>
                        <td style={{ color: 'rgba(102, 0, 51, 0.7)' }}>{contract.parties}</td>
                        <td style={{ fontWeight: '600' }}>{contract.value}</td>
                        <td style={{ color: 'rgba(102, 0, 51, 0.5)' }}>{contract.date}</td>
                        <td>
                          <span className={`status-badge status-${contract.status}`}>
                            {contract.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{
                              background: 'none',
                              border: 'none',
                              color: '#660033',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease'
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                            <button style={{
                              background: 'none',
                              border: 'none',
                              color: '#660033',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease'
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* AI Analysis Card */}
              <div style={{
                marginTop: '32px',
                background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)',
                borderRadius: '24px',
                padding: '32px 40px',
                color: '#F7E6CA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <h3 style={{ fontSize: '20px', fontWeight: '700' }}>AI Contract Analysis</h3>
                  </div>
                  <p style={{ fontSize: '15px', opacity: 0.85, maxWidth: '500px', lineHeight: 1.6 }}>
                    Get instant AI-powered insights on your contracts. Identify unfavorable clauses, compare to industry standards, and receive suggested revisions.
                  </p>
                </div>
                <button style={{
                  background: '#F7E6CA',
                  color: '#660033',
                  border: 'none',
                  padding: '14px 28px',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}>
                  Analyze a Contract
                </button>
              </div>
            </>
          )}

          {/* Landing Page View */}
          {activeNav === 'landing' && (
            <>
              {/* Header Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginBottom: '32px',
                gap: '12px'
              }}>
                <button className="btn-secondary-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  View Live Page
                </button>
                <button className="btn-primary-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Edit Page
                </button>
              </div>

              {/* Stats Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
                marginBottom: '32px'
              }}>
                {landingPageStats.map((stat, index) => (
                  <div key={index} className="stat-card" style={{ padding: '24px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'rgba(102, 0, 51, 0.5)',
                      marginBottom: '8px'
                    }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700' }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Two Column Layout */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px'
              }}>
                {/* Links Manager */}
                <div className="content-card">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Your Links</h3>
                    <button style={{
                      background: 'none',
                      border: 'none',
                      color: '#660033',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add Link
                    </button>
                  </div>

                  {landingLinks.map((link, index) => (
                    <div key={index} className={`link-item ${!link.enabled ? 'disabled' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'rgba(102, 0, 51, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#660033" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '2px' }}>
                            {link.name}
                          </div>
                          <div style={{ fontSize: '13px', color: 'rgba(102, 0, 51, 0.5)' }}>
                            {link.clicks.toLocaleString()} clicks
                          </div>
                        </div>
                      </div>
                      <div className={`toggle-switch ${link.enabled ? 'active' : ''}`} />
                    </div>
                  ))}
                </div>

                {/* Landing Page Preview */}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Preview</h3>
                  <div className="landing-preview">
                    <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
                      {/* Avatar */}
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: 'rgba(247, 230, 202, 0.2)',
                        border: '3px solid rgba(247, 230, 202, 0.4)',
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: '700'
                      }}>
                        MV
                      </div>
                      
                      <h3 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                        Mira Voss
                      </h3>
                      <p style={{ fontSize: '15px', opacity: 0.8, marginBottom: '32px' }}>
                        Electronic Producer & Artist
                      </p>

                      {/* Preview Links */}
                      {landingLinks.filter(l => l.enabled).slice(0, 3).map((link, index) => (
                        <div key={index} style={{
                          background: 'rgba(247, 230, 202, 0.15)',
                          border: '1px solid rgba(247, 230, 202, 0.3)',
                          borderRadius: '12px',
                          padding: '14px 20px',
                          marginBottom: '12px',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          {link.name}
                        </div>
                      ))}

                      <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '24px' }}>
                        miravoss.aermuse.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
