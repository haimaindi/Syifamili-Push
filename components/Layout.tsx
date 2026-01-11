
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Calendar, 
  Pill, 
  Baby, 
  Heart, 
  FileText, 
  Menu,
  X,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  PhoneCall,
  Home,
  RotateCw,
  Calculator,
  Grid,
  Loader2,
  Handshake,
  Bell,
  BellRing,
  Info,
  BellOff
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../translations';
import { notificationService } from '../services/notificationService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  syncStatus?: { isSyncing: boolean; lastSync: Date | null };
  onManualFetch?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  language, 
  syncStatus, 
  onManualFetch
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [notifPermission, setNotifPermission] = useState(Notification.permission);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  const t = useTranslation(language);

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: Activity },
    { id: 'recommendations', label: 'Mitra Kesehatan', icon: Handshake },
    { id: 'members', label: t.members, icon: Users },
    { id: 'records', label: t.records, icon: FileText },
    { id: 'homecare', label: t.homeCare, icon: Home },
    { id: 'meds', label: t.meds, icon: Pill },
    { id: 'kids', label: t.kids, icon: Baby },
    { id: 'elderly', label: t.elderly, icon: Heart },
    { id: 'schedule', label: t.schedule, icon: Calendar },
    { id: 'vault', label: t.vault, icon: ImageIcon },
    { id: 'calculators', label: t.calculators, icon: Calculator },
    { id: 'contacts', label: t.contacts, icon: PhoneCall },
  ];

  useEffect(() => {
    notificationService.registerServiceWorker();
    
    // Cek status langganan saat awal muat
    const initNotifStatus = async () => {
      const sub = await notificationService.checkSubscription();
      setIsSubscribed(!!sub);
    };
    initNotifStatus();

    const checkInterval = setInterval(() => {
      if (Notification.permission !== notifPermission) {
        setNotifPermission(Notification.permission);
      }
    }, 2000);
    
    return () => clearInterval(checkInterval);
  }, [notifPermission]);

  const handleToggleNotification = async () => {
    if (notifPermission === 'denied') {
      alert('Izin notifikasi diblokir browser. Mohon reset izin di pengaturan browser/HP Anda.');
      return;
    }

    setIsSubscribing(true);

    try {
      if (isSubscribed) {
        // Logic Nonaktifkan
        const res = await notificationService.unsubscribeUser();
        if (res.success) {
          setIsSubscribed(false);
          alert('Notifikasi telah dinonaktifkan.');
        } else {
          alert('Gagal menonaktifkan: ' + res.message);
        }
      } else {
        // Logic Aktifkan
        const permission = await Notification.requestPermission();
        setNotifPermission(permission);

        if (permission === 'granted') {
          const res = await notificationService.subscribeUser();
          if (res.success) {
            setIsSubscribed(true);
            alert('Berhasil! Notifikasi pengingat aktif di perangkat ini.');
          } else {
            alert('Gagal mengaktifkan: ' + res.message);
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan pada pengaturan notifikasi.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleMoreAppsClick = async () => {
    setLoadingLink(true);
    try {
      const sheetId = '1HYNx5hJn_0uM3aKlrjfaeTFYkkUDune6rdUuTxWfOQg';
      const sheetName = 'More Apps from Maindi';
      const cell = 'A1';
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&range=${cell}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      const cleanUrl = text.replace(/"/g, '').trim();
      if (cleanUrl && cleanUrl.startsWith('http')) {
        window.open(cleanUrl, '_blank');
      } else {
        alert('Tautan tidak valid.');
      }
    } catch (error) {
      console.error('Failed to fetch Maindi Apps link:', error);
      alert('Gagal mengambil tautan layanan.');
    } finally {
      setLoadingLink(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-8 right-8 z-[100] bg-blue-600 text-white p-4 rounded-full shadow-2xl scale-110 active:scale-95 transition-all flex items-center justify-center border-4 border-white"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[95] w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="py-10 px-4 flex items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 shadow-md shrink-0">
              <img 
                src="https://lh3.googleusercontent.com/d/1DrGOVDFdXv24Ac2z2t49pZUH-evReTxV" 
                alt="App Icon" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 h-16 flex items-center overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/d/18mOaOLYnOPdnHXZYoAJ6juWonHvtWqx1" 
                alt="Syifamili Logo" 
                className="w-full h-full object-contain object-center"
              />
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${activeTab === item.id 
                    ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                `}
              >
                <item.icon size={20} />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
            <button
              onClick={handleMoreAppsClick}
              disabled={loadingLink}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-md group active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                {loadingLink ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  <Grid size={16} className="text-blue-300 group-hover:text-white transition-colors" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {loadingLink ? 'Memuat...' : 'More Apps/Services'}
                </span>
              </div>
              {!loadingLink && (
                <span className="text-[8px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors tracking-[0.15em] uppercase">
                  from Maindi
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 capitalize tracking-tight">
            {navItems.find(i => i.id === activeTab)?.label || activeTab}
          </h2>

          <div className="flex items-center gap-2">
            {syncStatus && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                {syncStatus.isSyncing ? (
                  <RefreshCw size={12} className="text-blue-500 animate-spin" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                )}
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {syncStatus.isSyncing ? t.syncing : 'Synced'}
                </span>
              </div>
            )}
            
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 gap-1">
              <div className="relative">
                {/* Radar Effect - Only show if NOT Subscribed */}
                {!isSubscribed && (
                  <div className="absolute inset-0 z-0">
                    <span className="absolute inset-0 rounded-lg bg-blue-400 animate-ping opacity-75"></span>
                    <span className="absolute inset-[-4px] rounded-lg border-2 border-blue-400 animate-pulse opacity-50"></span>
                  </div>
                )}

                <button 
                  onClick={handleToggleNotification}
                  disabled={isSubscribing}
                  className={`relative z-10 p-2 rounded-lg transition-all group ${
                    isSubscribed 
                      ? 'text-emerald-600 bg-white shadow-sm hover:text-rose-500' 
                      : 'text-white bg-blue-600 shadow-lg shadow-blue-200'
                  }`}
                  title={isSubscribed ? "Klik untuk Matikan" : "Klik untuk Aktifkan Notifikasi"}
                >
                  {isSubscribing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isSubscribed ? (
                    <BellRing size={18} className="group-hover:hidden" />
                  ) : (
                    <Bell size={18} className="animate-swing" />
                  )}
                  {isSubscribed && !isSubscribing && (
                    <BellOff size={18} className="hidden group-hover:block text-rose-500" />
                  )}
                </button>

                {/* Floating Tooltip Alert - Only show if NOT Subscribed */}
                {!isSubscribed && (
                  <div className="absolute top-12 right-0 z-[110] whitespace-nowrap animate-bounce pointer-events-none">
                    <div className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5 border border-blue-400">
                      <Info size={10} /> Aktifkan Notifikasi Pengingat
                      <div className="absolute -top-1 right-4 w-2 h-2 bg-blue-600 rotate-45 border-l border-t border-blue-400"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-slate-200 mx-1"></div>

              <button 
                onClick={onManualFetch}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all group"
                title="Refresh from Cloud"
              >
                <RotateCw size={18} className="group-active:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide bg-slate-50/50">
          <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
