
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, PlanRow, AchievedRow, Job, AppConfig, AppMetadata } from './types';
import Login from './components/Login';
import EVPMDashboard from './components/EVPMDashboard';
import AdminPanel from './components/AdminPanel';
import { LayoutDashboard, LogOut, Loader2, Settings, Download } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [achievements, setAchievements] = useState<AchievedRow[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [metadata, setMetadata] = useState<AppMetadata | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [adminView, setAdminView] = useState<'dashboard' | 'settings'>('dashboard');
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

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
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('syncUrl');
    
    if (urlParam) {
      const cleanUrl = urlParam.trim();
      const newConfig = { syncUrl: cleanUrl, lastUpdated: '' };
      localStorage.setItem('evpm_config', JSON.stringify(newConfig));
      window.history.replaceState({}, document.title, window.location.pathname);
      return newConfig;
    }

    const saved = localStorage.getItem('evpm_config');
    return saved ? JSON.parse(saved) : { syncUrl: '' };
  });

  // 1. Fetch Public Metadata (Dropdowns)
  const syncMetadata = useCallback(async (url: string) => {
    if (!url) return;
    
    // REMOVED 'no-cors'. Standard GAS Web App with "Anyone" access supports CORS.
    // This allows us to read the response.
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action: 'getMetadata' })
        });
        
        if (!response.ok) throw new Error("Metadata Fetch Failed");

        const json = await response.json();
        setMetadata(json);
        localStorage.setItem('evpm_metadata', JSON.stringify(json));
    } catch (e) {
        console.warn("Metadata sync failed", e);
    }
  }, []);

  // 2. Fetch Secure Data (Requires User Context)
  const syncSecureData = useCallback(async (url: string, user: User) => {
    if (!url || !user.authToken) return;
    setIsSyncing(true);
    
    try {
      // REMOVED 'no-cors' to handle 401/403 errors properly
      const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({ 
              action: 'getData', 
              user: user // Passing the user obj with authToken
          })
      });

      if (!response.ok) throw new Error("Network response was not ok");
      
      const json = await response.json();
      
      if (json.error) {
          console.error("Server Error:", json.error);
          if (json.error.includes("Unauthorized") || json.error.includes("Expired")) {
               alert("Session Expired: " + json.error);
               handleLogout();
               return;
          }
      }

      if (json.plans) setPlans(json.plans);
      if (json.achievements) setAchievements(json.achievements);
      
      const newConfig = { ...config, syncUrl: url, lastUpdated: new Date().toISOString() };
      setConfig(newConfig);
      localStorage.setItem('evpm_config', JSON.stringify(newConfig));
      
      // Cache Secure Data locally
      try {
        localStorage.setItem('evpm_data', JSON.stringify(json));
      } catch (e) {
        console.warn('Storage Limit');
      }

    } catch (err) {
      console.error("Secure Sync Failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [config]);

  // Initial Load
  useEffect(() => {
    // Load Config/User
    const savedUser = localStorage.getItem('evpm_user');
    
    // Load Metadata Cache
    const cachedMeta = localStorage.getItem('evpm_metadata');
    if (cachedMeta) setMetadata(JSON.parse(cachedMeta));

    if (savedUser) {
        const userObj = JSON.parse(savedUser);
        setCurrentUser(userObj);
        
        // Load Data Cache
        const cachedData = localStorage.getItem('evpm_data');
        if (cachedData) {
            const json = JSON.parse(cachedData);
            setPlans(json.plans || []);
            setAchievements(json.achievements || []);
        }

        // Sync fresh secure data in background
        if (config.syncUrl) {
            syncSecureData(config.syncUrl, userObj);
        }
    } else {
        // Not logged in: Fetch metadata for login screen
        if (config.syncUrl) {
            syncMetadata(config.syncUrl);
        }
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAdminView('dashboard');
    localStorage.setItem('evpm_user', JSON.stringify(user));
    // Immediately fetch data for this user
    if (config.syncUrl) {
        syncSecureData(config.syncUrl, user);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPlans([]);
    setAchievements([]);
    localStorage.removeItem('evpm_user');
    localStorage.removeItem('evpm_data'); // Clear secure data
  };

  // Safe User Filters (Already applied Server Side, but kept for UI Consistency)
  const getSafeUserFilters = (user: User) => {
    // Since server already filters, we can just return empty or use the scope returned by server
    if (user.role === 'admin') return {}; 
    
    // Use the scope returned from server for UI locking
    if (user.scope && user.scope.key) {
        return { [user.scope.key]: user.scope.value };
    }
    return {};
  };

  const formattedName = useMemo(() => {
    if (!currentUser?.name) return '';
    const rawName = currentUser.name;
    // Remove ID prefix if exists (e.g. "101 - Name" -> "Name")
    return rawName.includes('-') ? rawName.split('-')[1].trim() : rawName;
  }, [currentUser]);

  // Dummy Merged for Admin/Login compatibility (Not used much now)
  const dummyMergedData = useMemo(() => plans.map(p => ({
        ...p,
        "Ach GSV": 0, "Ach ECO": 0, "Ach PC": 0, "Ach LPC": 0, "Ach MVS": 0,
    })), [plans]);

  return (
    <div className="min-h-screen bg-slate-50 font-cairo relative isolate flex flex-col">
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <svg className="w-full h-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="watermark-pattern" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)">
              <text x="50%" y="50%" fontFamily="'Dancing Script', cursive" fontSize="14" fill="#1e40af" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">Unilever</text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#watermark-pattern)" />
        </svg>
      </div>

      {currentUser && (
        <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between relative">
            <div className="flex items-center gap-3 w-auto md:w-1/4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-xl shadow-lg shadow-blue-900/50">
                <LayoutDashboard size={24} className="text-white" />
              </div>
              <div className="block">
                <h1 className="font-black text-lg md:text-xl leading-tight tracking-tight">EVPM <span className="text-blue-400">Pro</span></h1>
                <p className="text-[10px] text-blue-200 font-bold tracking-wide -mt-0.5">Smart Visual performance</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center">
                 <span className="text-[10px] md:text-xs text-blue-200 font-bold uppercase tracking-widest mb-0.5">Welcome</span>
                 <h2 className="text-base md:text-2xl font-black text-white tracking-wide leading-none">{formattedName}</h2>
                 <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider opacity-80 mt-1">{currentUser.jobTitle}</p>
                 {isSyncing && <span className="flex items-center gap-1 text-[9px] text-emerald-400 animate-pulse font-bold mt-1"><Loader2 size={10} className="animate-spin"/> SECURE SYNC...</span>}
            </div>
            
            <div className="flex items-center justify-end gap-3 w-1/4">
               {installPrompt && (
                   <button onClick={handleInstallClick} className="flex bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white p-2.5 rounded-xl transition-all border border-emerald-500/20" title="Install App">
                     <Download size={20} />
                   </button>
               )}
               {currentUser.role === 'admin' && (
                 <div className="hidden md:flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                   <button onClick={() => setAdminView('dashboard')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${adminView === 'dashboard' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                     <LayoutDashboard size={14}/>
                   </button>
                   <button onClick={() => setAdminView('settings')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${adminView === 'settings' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
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
            metadata={metadata}
            config={config} 
            setConfig={(c) => { setConfig(c); localStorage.setItem('evpm_config', JSON.stringify(c)); syncMetadata(c.syncUrl); }}
            installPrompt={installPrompt}
            onInstall={handleInstallClick}
          />
        ) : (
          (currentUser.role === 'admin' && adminView === 'settings') ? (
            <AdminPanel 
              config={config} 
              setConfig={(c) => { setConfig(c); localStorage.setItem('evpm_config', JSON.stringify(c)); }}
              onRefresh={() => syncSecureData(config.syncUrl, currentUser)} 
              user={currentUser}
            />
          ) : (
            <EVPMDashboard 
              plans={plans}
              achievements={achievements} 
              onRefresh={() => syncSecureData(config.syncUrl, currentUser)} 
              lastUpdated={config.lastUpdated}
              userFilters={getSafeUserFilters(currentUser)}
            />
          )
        )}
      </main>

      <footer className="py-4 text-center relative z-10 text-slate-900 text-[10px] font-bold pb-6">
        <p>EVPM Pro &copy; 2026</p>
        <p className="mt-0.5 opacity-70">RTM Team- Bahaa Mohamed -Tel:01095665450</p>
      </footer>
    </div>
  );
};

export default App;
