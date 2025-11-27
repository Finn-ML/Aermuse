import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import GrainOverlay from '@/components/GrainOverlay';
import { 
  LayoutGrid, 
  FileText, 
  Layout, 
  User, 
  Settings, 
  LogOut,
  ChevronDown,
  TrendingUp,
  Plus,
  ExternalLink,
  Upload,
  Eye,
  Sparkles,
  Calendar,
  DollarSign
} from 'lucide-react';

type NavId = 'dashboard' | 'contracts' | 'landing';

interface Contract {
  name: string;
  status: 'pending' | 'signed' | 'review';
  date: string;
  type?: string;
  value?: string;
  parties?: string;
}

interface LinkItem {
  name: string;
  url: string;
  clicks: number;
  enabled: boolean;
}

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeNav, setActiveNav] = useState<NavId>('dashboard');
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [links, setLinks] = useState<LinkItem[]>([
    { name: 'Spotify', url: 'spotify.com/artist/miravoss', clicks: 2847, enabled: true },
    { name: 'Apple Music', url: 'music.apple.com/miravoss', clicks: 1923, enabled: true },
    { name: 'Instagram', url: 'instagram.com/miravoss', clicks: 3201, enabled: true },
    { name: 'Merch Store', url: 'shop.miravoss.com', clicks: 892, enabled: true },
    { name: 'Tour Dates', url: 'miravoss.com/tour', clicks: 1456, enabled: false }
  ]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const navItems = [
    { id: 'dashboard' as NavId, label: 'Dashboard', icon: LayoutGrid },
    { id: 'contracts' as NavId, label: 'Contract Manager', icon: FileText },
    { id: 'landing' as NavId, label: 'Landing Page', icon: Layout }
  ];

  const stats = [
    { label: 'Active Contracts', value: '12', change: '+2 this month', trend: 'up' },
    { label: 'Fan Subscribers', value: '2,847', change: '+156 this week', trend: 'up' },
    { label: 'Page Views', value: '14.2K', change: '+8.3%', trend: 'up' },
    { label: 'Revenue', value: '$4,280', change: '+$840 this month', trend: 'up' }
  ];

  const recentContracts: Contract[] = [
    { name: 'Publishing Agreement - Universal', status: 'pending', date: 'Nov 24, 2025' },
    { name: 'Sync License - Netflix Series', status: 'signed', date: 'Nov 20, 2025' },
    { name: 'Management Contract Review', status: 'review', date: 'Nov 18, 2025' }
  ];

  const allContracts: Contract[] = [
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-[rgba(255,193,7,0.15)] text-[#B8860B]';
      case 'signed': return 'bg-[rgba(40,167,69,0.15)] text-[#28a745]';
      case 'review': return 'bg-[rgba(102,0,51,0.1)] text-[#660033]';
      default: return '';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'contract': return <FileText size={18} />;
      case 'event': return <Calendar size={18} />;
      case 'payment': return <DollarSign size={18} />;
      default: return null;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'contract': return 'bg-[rgba(102,0,51,0.1)] text-[#660033]';
      case 'event': return 'bg-[rgba(40,167,69,0.15)] text-[#28a745]';
      case 'payment': return 'bg-[rgba(255,193,7,0.15)] text-[#B8860B]';
      default: return '';
    }
  };

  const toggleLink = (index: number) => {
    const newLinks = [...links];
    newLinks[index].enabled = !newLinks[index].enabled;
    setLinks(newLinks);
  };

  const filteredContracts = activeFilter === 'all' 
    ? allContracts 
    : allContracts.filter(c => c.status === activeFilter);

  return (
    <div className="min-h-screen bg-[#F7E6CA] text-[#660033] flex relative">
      <style>{`
        ::selection {
          background: #660033;
          color: #F7E6CA;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <GrainOverlay />

      <aside 
        className={`w-[280px] flex flex-col fixed top-0 left-0 h-screen z-20 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderRight: '1px solid rgba(102, 0, 51, 0.08)',
          padding: '32px 20px'
        }}
      >
        <Link href="/">
          <div className="text-2xl font-light tracking-[0.25em] lowercase mb-12 pl-5 cursor-pointer">
            aermuse
          </div>
        </Link>

        <nav className="flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl cursor-pointer transition-all duration-300 font-medium text-[15px] mb-1 ${
                  activeNav === item.id 
                    ? 'bg-[#660033] text-[#F7E6CA]' 
                    : 'text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.06)] hover:text-[#660033]'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div 
          className="pt-5 mt-auto"
          style={{ borderTop: '1px solid rgba(102, 0, 51, 0.08)' }}
        >
          <div className="flex items-center gap-3 px-5">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#F7E6CA] font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
            >
              MV
            </div>
            <div>
              <div className="font-semibold text-sm">Mira Voss</div>
              <div className="text-xs text-[rgba(102,0,51,0.5)]">Pro Plan</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 ml-[280px] flex flex-col min-h-screen">
        <header 
          className={`h-20 flex items-center justify-between px-10 sticky top-0 z-50 transition-opacity duration-500 delay-100 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundColor: 'rgba(247, 230, 202, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(102, 0, 51, 0.08)'
          }}
        >
          <div>
            <h1 className="text-2xl font-bold mb-0.5" data-testid="text-page-title">
              {activeNav === 'dashboard' && 'Welcome back, Mira'}
              {activeNav === 'contracts' && 'Contract Manager'}
              {activeNav === 'landing' && 'Landing Page'}
            </h1>
            <p className="text-sm text-[rgba(102,0,51,0.6)] font-medium">
              {activeNav === 'dashboard' && "Here's what's happening with your music career"}
              {activeNav === 'contracts' && 'Manage, analyze, and sign your contracts with AI assistance'}
              {activeNav === 'landing' && 'Customize your artist page and manage your links'}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                border: '2px solid rgba(102, 0, 51, 0.1)'
              }}
              data-testid="button-profile"
            >
              <div 
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#F7E6CA] font-bold text-[13px]"
                style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
              >
                MV
              </div>
              <ChevronDown size={16} className="text-[#660033]" />
            </button>

            {profileOpen && (
              <div 
                className="absolute top-[calc(100%+8px)] right-0 bg-white rounded-2xl p-2 min-w-[200px] z-[100]"
                style={{ boxShadow: '0 20px 50px rgba(102, 0, 51, 0.15)' }}
              >
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all" data-testid="button-profile-settings">
                  <User size={18} />
                  Profile Settings
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all" data-testid="button-account-settings">
                  <Settings size={18} />
                  Account Settings
                </button>
                <Link href="/">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all" data-testid="button-signout">
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </Link>
              </div>
            )}
          </div>
        </header>

        <main 
          className={`flex-1 p-10 transition-all duration-500 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        >
          {activeNav === 'dashboard' && (
            <>
              <div className="grid grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div 
                    key={index}
                    className="rounded-[20px] p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(102,0,51,0.08)]"
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    data-testid={`card-stat-${index}`}
                  >
                    <div className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)] mb-3">
                      {stat.label}
                    </div>
                    <div className="text-[32px] font-bold mb-2">
                      {stat.value}
                    </div>
                    <div className="text-[13px] font-semibold text-[#28a745] flex items-center gap-1">
                      <TrendingUp size={14} />
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div 
                  className="rounded-[20px] p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Recent Contracts</h3>
                    <button 
                      className="text-sm font-semibold text-[rgba(102,0,51,0.6)] hover:text-[#660033] transition-colors"
                      onClick={() => setActiveNav('contracts')}
                      data-testid="link-view-all-contracts"
                    >
                      View All
                    </button>
                  </div>
                  <div>
                    {recentContracts.map((contract, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between py-4 transition-all duration-200 hover:pl-2"
                        style={{ borderBottom: index < recentContracts.length - 1 ? '1px solid rgba(102, 0, 51, 0.08)' : 'none' }}
                        data-testid={`row-contract-${index}`}
                      >
                        <div>
                          <div className="font-medium text-sm mb-1">{contract.name}</div>
                          <div className="text-xs text-[rgba(102,0,51,0.5)]">{contract.date}</div>
                        </div>
                        <span className={`px-3.5 py-1.5 rounded-[20px] text-xs font-semibold uppercase tracking-[0.05em] ${getStatusClass(contract.status)}`}>
                          {contract.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div 
                  className="rounded-[20px] p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <h3 className="text-lg font-bold mb-6">Upcoming</h3>
                  <div>
                    {upcomingEvents.map((event, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-4 py-3.5"
                        style={{ borderBottom: index < upcomingEvents.length - 1 ? '1px solid rgba(102, 0, 51, 0.08)' : 'none' }}
                        data-testid={`row-event-${index}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getEventColor(event.type)}`}>
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{event.title}</div>
                          <div className="text-xs text-[rgba(102,0,51,0.5)]">{event.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeNav === 'contracts' && (
            <>
              <div className="flex justify-between items-center mb-8">
                <div className="flex gap-2">
                  {['all', 'pending', 'review', 'signed'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-300 ${
                        activeFilter === filter 
                          ? 'bg-[#660033] text-[#F7E6CA]' 
                          : 'bg-[rgba(255,255,255,0.5)] text-[rgba(102,0,51,0.6)] hover:bg-[#660033] hover:text-[#F7E6CA]'
                      }`}
                      data-testid={`button-filter-${filter}`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button 
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[50px] text-[13px] font-semibold transition-all duration-300"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '2px solid rgba(102, 0, 51, 0.15)'
                    }}
                    data-testid="button-upload-contract"
                  >
                    <Upload size={16} />
                    Upload Contract
                  </button>
                  <button 
                    className="flex items-center gap-2 px-6 py-3 rounded-[50px] text-[13px] font-bold uppercase tracking-[0.05em] bg-[#660033] text-[#F7E6CA] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(102,0,51,0.25)] transition-all duration-300"
                    data-testid="button-new-contract"
                  >
                    <Plus size={16} />
                    New Contract
                  </button>
                </div>
              </div>

              <div 
                className="rounded-[20px] overflow-hidden"
                style={{ background: 'rgba(255, 255, 255, 0.6)' }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(102, 0, 51, 0.1)' }}>
                      <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)]">Contract Name</th>
                      <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)]">Type</th>
                      <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)]">Parties</th>
                      <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)]">Value</th>
                      <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)]">Status</th>
                      <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)]">Date</th>
                      <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract, index) => (
                      <tr 
                        key={index}
                        className="hover:bg-[rgba(102,0,51,0.02)] transition-colors"
                        style={{ borderBottom: '1px solid rgba(102, 0, 51, 0.06)' }}
                        data-testid={`row-contract-table-${index}`}
                      >
                        <td className="px-4 py-4.5 text-sm font-medium">{contract.name}</td>
                        <td className="px-4 py-4.5 text-sm">{contract.type}</td>
                        <td className="px-4 py-4.5 text-sm text-[rgba(102,0,51,0.7)]">{contract.parties}</td>
                        <td className="px-4 py-4.5 text-sm font-semibold">{contract.value}</td>
                        <td className="px-4 py-4.5">
                          <span className={`px-3.5 py-1.5 rounded-[20px] text-xs font-semibold uppercase tracking-[0.05em] ${getStatusClass(contract.status)}`}>
                            {contract.status}
                          </span>
                        </td>
                        <td className="px-4 py-4.5 text-sm text-[rgba(102,0,51,0.6)]">{contract.date}</td>
                        <td className="px-4 py-4.5">
                          <div className="flex gap-2">
                            <button 
                              className="p-2 rounded-lg hover:bg-[rgba(102,0,51,0.06)] transition-colors"
                              title="View"
                              data-testid={`button-view-contract-${index}`}
                            >
                              <Eye size={16} className="text-[rgba(102,0,51,0.6)]" />
                            </button>
                            <button 
                              className="p-2 rounded-lg hover:bg-[rgba(102,0,51,0.06)] transition-colors"
                              title="AI Analysis"
                              data-testid={`button-analyze-contract-${index}`}
                            >
                              <Sparkles size={16} className="text-[rgba(102,0,51,0.6)]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeNav === 'landing' && (
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {landingPageStats.map((stat, index) => (
                    <div 
                      key={index}
                      className="rounded-[16px] p-5"
                      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                      data-testid={`card-landing-stat-${index}`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)] mb-2">
                        {stat.label}
                      </div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div 
                  className="rounded-[20px] p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Manage Links</h3>
                    <button 
                      className="flex items-center gap-2 px-4 py-2 rounded-[50px] text-sm font-semibold bg-[#660033] text-[#F7E6CA] hover:-translate-y-0.5 transition-all"
                      data-testid="button-add-link"
                    >
                      <Plus size={14} />
                      Add Link
                    </button>
                  </div>
                  <div>
                    {links.map((link, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between px-6 py-5 rounded-2xl mb-3 transition-all duration-300 hover:translate-x-1 ${link.enabled ? '' : 'opacity-50'}`}
                        style={{ background: 'rgba(255, 255, 255, 0.5)' }}
                        data-testid={`row-link-${index}`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-sm mb-1">{link.name}</div>
                          <div className="text-xs text-[rgba(102,0,51,0.5)] flex items-center gap-1">
                            {link.url}
                            <ExternalLink size={10} />
                          </div>
                        </div>
                        <div className="text-sm font-medium text-[rgba(102,0,51,0.6)] mr-6">
                          {link.clicks.toLocaleString()} clicks
                        </div>
                        <button
                          onClick={() => toggleLink(index)}
                          className={`relative w-12 h-[26px] rounded-[13px] cursor-pointer transition-all duration-300 ${link.enabled ? 'bg-[#660033]' : 'bg-[rgba(102,0,51,0.2)]'}`}
                          data-testid={`toggle-link-${index}`}
                        >
                          <div 
                            className="absolute top-[3px] w-5 h-5 bg-white rounded-full transition-all duration-300"
                            style={{ left: link.enabled ? '25px' : '3px' }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div 
                  className="rounded-3xl p-10 text-[#F7E6CA] relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                >
                  <div 
                    className="absolute"
                    style={{
                      top: '-50%',
                      right: '-50%',
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle, rgba(247, 230, 202, 0.1) 0%, transparent 60%)'
                    }}
                  />
                  <div className="relative z-10">
                    <div className="text-center mb-8">
                      <div 
                        className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-light"
                        style={{ 
                          background: 'rgba(247, 230, 202, 0.2)',
                          border: '2px solid rgba(247, 230, 202, 0.3)'
                        }}
                      >
                        MV
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Mira Voss</h2>
                      <p className="text-sm opacity-80">Electronic Producer</p>
                    </div>

                    <div className="space-y-3">
                      {links.filter(l => l.enabled).slice(0, 3).map((link, index) => (
                        <div 
                          key={index}
                          className="px-6 py-4 rounded-xl text-center font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                          style={{ 
                            background: 'rgba(247, 230, 202, 0.15)',
                            border: '1px solid rgba(247, 230, 202, 0.2)'
                          }}
                        >
                          {link.name}
                        </div>
                      ))}
                    </div>

                    <div className="text-center mt-8 text-xs opacity-60">
                      aermuse.link/miravoss
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button 
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '2px solid rgba(102, 0, 51, 0.15)'
                    }}
                    data-testid="button-preview-page"
                  >
                    <Eye size={16} />
                    Preview
                  </button>
                  <button 
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold uppercase tracking-[0.05em] bg-[#660033] text-[#F7E6CA] hover:-translate-y-0.5 transition-all"
                    data-testid="button-publish-page"
                  >
                    Publish Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
