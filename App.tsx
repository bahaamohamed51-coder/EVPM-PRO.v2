import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, PlanRow, AchievedRow, Job, AppConfig } from './types';
import Login from './components/Login';
import EVPMDashboard from './components/EVPMDashboard';
import AdminPanel from './components/AdminPanel';
import { LayoutDashboard, LogOut, Loader2, Settings, RefreshCw, Download } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [achievements, setAchievements] = useState<AchievedRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [adminView, setAdminView] = useState<'dashboard' | 'settings'>('dashboard');
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Capture PWA Install Prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  const [config, setConfig] = useState<AppConfig>(() => {
    // Check URL params for auto-configuration (Invite Link Logic)
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('syncUrl');
    
    if (urlParam) {
      const cleanUrl = urlParam.trim();
      const newConfig = { syncUrl: cleanUrl, lastUpdated: '' };
      localStorage.setItem('evpm_config', JSON.stringify(newConfig));
      // Optional: Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return newConfig;
    }

    const saved = localStorage.getItem('evpm_config');
    return saved ? JSON.parse(saved) : { syncUrl: '' };
  });

  const syncData = useCallback(async (url: string) => {
    if (!url) return;
    
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    setIsSyncing(true);
    try {
      // Fix: Handle existing query params in the URL correctly
      const separator = cleanUrl.includes('?') ? '&' : '?';
      const fetchUrl = `${cleanUrl}${separator}action=getData&t=${Date.now()}`;
      
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const json = await response.json();
      
      if (json.plans) setPlans(json.plans);
      if (json.achievements) setAchievements(json.achievements);
      if (json.users) setUsers(json.users);
      if (json.jobs) setJobs(json.jobs);
      
      const newConfig = { ...config, syncUrl: cleanUrl, lastUpdated: new Date().toISOString() };
      setConfig(newConfig);
      localStorage.setItem('evpm_config', JSON.stringify(newConfig));
      
      // CACHING: Save data to localStorage to prevent white screen on offline/reload
      try {
        localStorage.setItem('evpm_data', JSON.stringify(json));
      } catch (e) {
        console.warn('Storage Limit Exceeded: Could not cache data locally.');
      }

    } catch (err) {
      console.error("Sync Failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [config]);

  // Load Data on Mount (From Cache first, then Sync)
  useEffect(() => {
    const savedUser = localStorage.getItem('evpm_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    // 1. Try Loading from Local Cache immediately
    const cachedData = localStorage.getItem('evpm_data');
    let hasCache = false;
    if (cachedData) {
        try {
            const json = JSON.parse(cachedData);
            if (json.plans) setPlans(json.plans);
            if (json.achievements) setAchievements(json.achievements);
            if (json.users) setUsers(json.users);
            if (json.jobs) setJobs(json.jobs);
            hasCache = true;
        } catch (e) {
            console.error('Failed to parse cached data');
        }
    }

    // 2. Sync if configured (Background update)
    if (config.syncUrl) {
      syncData(config.syncUrl);
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAdminView('dashboard');
    localStorage.setItem('evpm_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('evpm_user');
  };

  // Helper to strip system fields from user object before filtering
  const getSafeUserFilters = (user: User) => {
    if (user.role === 'admin') return {}; 
    // Allow 'Staff' job title to view all data (same as admin logic for filters)
    // Updated to also allow 'Director' to have full view
    if (user.jobTitle === 'Staff' || user.jobTitle === 'Director') return {};

    const allowedKeys = ['Region', 'RSM', 'SM', 'Dist Name', 'T.L Name', 'Channel', 'SALESMANNO'];
    const filters: any = {};
    allowedKeys.forEach(key => {
      // @ts-ignore
      if (user[key]) {
         // @ts-ignore
         filters[key] = user[key];
      }
    });
    return filters;
  };

  // Helper to format name (Remove Code & Keep First Two Names)
  const formattedName = useMemo(() => {
    if (!currentUser?.name) return '';
    const rawName = currentUser.name;
    // 1. Remove ID if exists (e.g., "12345 - Ahmed")
    let namePart = rawName.includes('-') ? rawName.split('-')[1].trim() : rawName;
    // 2. Get first two words
    const parts = namePart.split(' ').filter(Boolean);
    if (parts.length > 2) {
        return `${parts[0]} ${parts[1]}`;
    }
    return namePart;
  }, [currentUser]);

  // Create a placeholder for currentData for compatibility with Login/Admin logic which expects KPIRow[]
  // We'll just map plans to a basic structure for now
  const dummyMergedData = useMemo(() => {
      return plans.map(p => ({
        ...p,
        "Ach GSV": 0, "Ach ECO": 0, "Ach PC": 0, "Ach LPC": 0, "Ach MVS": 0,
    }));
  }, [plans]);

  return (
    <div className="min-h-screen bg-slate-50 font-cairo relative isolate flex flex-col">
      
      {/* --- REPEATED WATERMARK PATTERN --- */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <svg className="w-full h-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="watermark-pattern"
              width="80"
              height="80"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-25)"
            >
              <text
                x="50%"
                y="50%"
                fontFamily="'Dancing Script', cursive"
                fontSize="14"
                fill="#1e40af"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                Unilever
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#watermark-pattern)" />
        </svg>
      </div>
      {/* --------------------------- */}

      {currentUser && (
        <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between relative">
            
            {/* Left Section (Logo) - Modified to show on mobile */}
            <div className="flex items-center gap-3 w-auto md:w-1/4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-xl shadow-lg shadow-blue-900/50">
                <LayoutDashboard size={24} className="text-white" />
              </div>
              <div className="block"> {/* Removed 'hidden md:block' */}
                <h1 className="font-black text-lg md:text-xl leading-tight tracking-tight">EVPM <span className="text-blue-400">Pro</span></h1>
              </div>
            </div>

            {/* Center Section (User Info) - Modified Layout */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                 <span className="text-[10px] md:text-xs text-blue-200 font-bold uppercase tracking-widest mb-0.5">Welcome</span>
                 <h2 className="text-base md:text-2xl font-black text-white tracking-wide leading-none">{formattedName}</h2>
                 <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider opacity-80 mt-1">{currentUser.jobTitle}</p>
                 {isSyncing && <span className="flex items-center gap-1 text-[9px] text-emerald-400 animate-pulse font-bold mt-1"><Loader2 size={10} className="animate-spin"/> SYNCING DATA...</span>}
            </div>
            
            {/* Right Section (Controls) */}
            <div className="flex items-center justify-end gap-3 w-1/4">
               {installPrompt && (
                   <button 
                     onClick={handleInstallClick}
                     className="flex bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white p-2.5 rounded-xl transition-all border border-emerald-500/20"
                     title="Install App"
                   >
                     <Download size={20} />
                   </button>
               )}
               {currentUser.role === 'admin' && (
                 <div className="hidden md:flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                   <button 
                     onClick={() => setAdminView('dashboard')}
                     className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${adminView === 'dashboard' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                   >
                     <LayoutDashboard size={14}/>
                   </button>
                   <button 
                     onClick={() => setAdminView('settings')}
                     className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${adminView === 'settings' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                   >
                     <Settings size={14}/>
                   </button>
                 </div>
               )}

               <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 p-2.5 rounded-xl transition-all border border-red-500/20 shadow-sm">
                 <LogOut size={20} />
               </button>
            </div>
          </div>
        </header>
      )}

      <main className="p-4 md:p-6 max-w-7xl mx-auto relative z-10 w-full flex-grow">
        {!currentUser ? (
          <Login 
            onLogin={handleLogin} 
            users={users} 
            data={dummyMergedData}
            jobs={jobs} 
            config={config} 
            setConfig={(c) => { setConfig(c); localStorage.setItem('evpm_config', JSON.stringify(c)); syncData(c.syncUrl); }}
            installPrompt={installPrompt}
            onInstall={handleInstallClick}
          />
        ) : (
          (currentUser.role === 'admin' && adminView === 'settings') ? (
            <AdminPanel 
              config={config} 
              setConfig={(c) => { setConfig(c); localStorage.setItem('evpm_config', JSON.stringify(c)); }}
              onRefresh={() => syncData(config.syncUrl)} 
              allUsers={users}
              jobs={jobs}
              currentData={dummyMergedData}
            />
          ) : (
            <EVPMDashboard 
              plans={plans}
              achievements={achievements} 
              onRefresh={() => syncData(config.syncUrl)} 
              lastUpdated={config.lastUpdated}
              userFilters={getSafeUserFilters(currentUser)}
            />
          )
        )}
      </main>

      <footer className="py-4 text-center relative z-10 text-slate-900 text-[10px] font-bold pb-6">
        <p>EVPM Pro &copy; 2026</p>
        <p className="mt-0.5 opacity-70">RTM Team - Bahaa Mohamed-Tel: 01095665450</p>
      </footer>
    </div>
  );
};

export default App;
