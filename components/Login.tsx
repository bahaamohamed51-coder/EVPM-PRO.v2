
import React, { useState, useMemo } from 'react';
import { User, AppConfig, AppMetadata } from '../types';
import { Briefcase, User as UserIcon, Lock, LogIn, Database, Search, Download, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  metadata: AppMetadata | null;
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  installPrompt?: any;
  onInstall?: () => void;
}

export default function Login({ onLogin, metadata, config, setConfig, installPrompt, onInstall }: LoginProps) {
  const [roleType, setRoleType] = useState(''); 
  const [selectedIdentity, setSelectedIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncUrl, setSyncUrl] = useState(config.syncUrl);
  const [mode, setMode] = useState<'login' | 'setup'>(config.syncUrl ? 'login' : 'setup');
  const [searchTerm, setSearchTerm] = useState('');

  // Use Metadata for Dropdowns
  const filteredList = useMemo(() => {
    if (!metadata) return [];
    
    let source: string[] = [];
    if (roleType === 'ASM') source = metadata.asmList;
    else if (roleType === 'T.L Name') source = metadata.tlList;
    else if (roleType === 'Director') source = metadata.directorList;
    else if (roleType === 'SALESMANNAMEA') source = metadata.salesmanList;
    
    // Only filter if search term exists
    if (!searchTerm) return source;
    return source.filter(s => s && s.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [metadata, searchTerm, roleType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'setup') {
        if (!syncUrl) { setError('يرجى إدخال رابط الاتصال'); return; }
        setConfig({ ...config, syncUrl });
        setMode('login');
        return;
    }

    if (!roleType) { setError('يرجى اختيار الوظيفة'); return; }
    // For Admin, we still need an identity name (can be just 'admin')
    const finalIdentity = roleType === 'Admin' ? 'admin' : selectedIdentity;
    if (!finalIdentity) { setError('يرجى اختيار الاسم/الفرع/الكود'); return; }

    setIsLoading(true);

    try {
        // SERVER-SIDE AUTHENTICATION
        // Calculate the actual username to check against the database
        const targetUsername = roleType === 'SALESMANNAMEA' ? selectedIdentity.split(' - ')[0].trim() :
                               roleType === 'T.L Name' ? selectedIdentity :
                               roleType === 'Admin' ? 'admin' :
                               selectedIdentity; // For ASM/RSM/SM

        const response = await fetch(config.syncUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                username: targetUsername, 
                password: password,
                roleType: roleType,
                identityName: selectedIdentity // Used for scoping data (keep full name for display/scope)
            })
        });

        const json = await response.json();

        if (json.success && json.user) {
            onLogin(json.user);
        } else {
            setError(json.error || 'فشل تسجيل الدخول');
        }

    } catch (err) {
        console.error(err);
        setError('خطأ في الاتصال بالخادم');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
        
        <div className="text-center mb-6 relative z-10 flex flex-col items-center">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">EVPM</h2>
            <p className="text-blue-600 font-bold text-[10px] uppercase tracking-[0.1em]">Smart Visual performance</p>
        </div>

        {installPrompt && (
            <div className="mb-6 animate-pulse">
                <button type="button" onClick={onInstall} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 p-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    <Download size={20} /><span className="font-black text-sm">Install App</span>
                </button>
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            {mode === 'setup' ? (
                <div className="animate-fade-in-up">
                    <label className="text-xs font-black text-slate-500 mb-2 block text-right">Script URL</label>
                    <div className="relative">
                        <input type="text" required value={syncUrl} onChange={e => setSyncUrl(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none transition-all" />
                        <Database className="absolute right-3 top-3.5 text-slate-400" size={18} />
                    </div>
                </div>
            ) : (
                <>
                    <div>
                         <label className="text-[10px] font-black text-slate-400 mb-1 block text-right uppercase">الوظيفة</label>
                         <div className="relative">
                            <select 
                                value={roleType} 
                                onChange={e => { setRoleType(e.target.value); setSelectedIdentity(''); setSearchTerm(''); }} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none appearance-none cursor-pointer font-bold text-slate-700 transition-all"
                            >
                                <option value="">اختر الوظيفة</option>
                                <option value="Director">Director</option>
                                <option value="RSM">RSM (Regional Manager)</option>
                                <option value="SM">SM (Sales Manager)</option>
                                <option value="ASM">ASM / Distributor</option>
                                <option value="T.L Name">Team Leader</option>
                                <option value="SALESMANNAMEA">Sales Representative</option>
                                <option value="Admin">System Administrator</option>
                            </select>
                            <Briefcase className="absolute right-3 top-3.5 text-slate-400" size={18} />
                         </div>
                    </div>

                    {roleType && roleType !== 'Admin' && (
                        <div className="animate-fade-in-up">
                             <label className="text-[10px] font-black text-slate-400 mb-1 block text-right uppercase">الاسم / الهوية</label>
                             <div className="relative">
                                {(roleType === 'SALESMANNAMEA' || roleType === 'T.L Name' || roleType === 'ASM') ? (
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="بحث..."
                                            value={selectedIdentity ? selectedIdentity : searchTerm}
                                            onChange={(e) => { setSearchTerm(e.target.value); setSelectedIdentity(''); }}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none font-bold text-sm"
                                        />
                                        <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
                                        {searchTerm && !selectedIdentity && (
                                            <div className="absolute z-50 w-full bg-white shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto border border-slate-100">
                                                {filteredList.map(s => (
                                                    <div key={s} onClick={() => { setSelectedIdentity(s); setSearchTerm(''); }} className="p-3 hover:bg-blue-50 cursor-pointer text-right text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0">
                                                        {s}
                                                    </div>
                                                ))}
                                                {filteredList.length === 0 && <div className="p-3 text-center text-xs text-slate-400">لا توجد نتائج</div>}
                                            </div>
                                        )}
                                        {selectedIdentity && <button type="button" onClick={() => { setSelectedIdentity(''); setSearchTerm(''); }} className="absolute left-3 top-3 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">تغيير</button>}
                                    </div>
                                ) : (
                                    <>
                                        <select value={selectedIdentity} onChange={e => setSelectedIdentity(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none appearance-none cursor-pointer font-bold text-slate-700">
                                            <option value="">اختر من القائمة</option>
                                            {metadata && (() => {
                                                let list: string[] = [];
                                                if (roleType === 'RSM') list = metadata.rsmList;
                                                else if (roleType === 'SM') list = metadata.smList;
                                                else if (roleType === 'Director') list = metadata.directorList;
                                                return list.map(item => <option key={item} value={item}>{item}</option>);
                                            })()}
                                        </select>
                                        <UserIcon className="absolute right-3 top-3.5 text-slate-400" size={18} />
                                    </>
                                )}
                             </div>
                        </div>
                    )}

                    <div>
                         <label className="text-[10px] font-black text-slate-400 mb-1 block text-right uppercase">كلمة المرور</label>
                         <div className="relative">
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-right pr-10 focus:border-blue-500 outline-none transition-all" />
                            <Lock className="absolute right-3 top-3.5 text-slate-400" size={18} />
                         </div>
                    </div>
                </>
            )}

            {error && <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full"></div>{error}</div>}

            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-l from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'setup' ? 'اتصال بالنظام' : 'تسجيل الدخول')} {!isLoading && <LogIn size={18} />}
            </button>
            
            {mode === 'login' && (
                <div className="flex justify-between items-center pt-2">
                    <button type="button" onClick={() => setMode('setup')} className="text-slate-400 text-[10px] font-bold hover:text-blue-500">إعدادات الاتصال</button>
                    {!metadata && <span className="text-[9px] text-orange-400 bg-orange-50 px-2 py-1 rounded">Offline Mode</span>}
                </div>
            )}
        </form>
      </div>
    </div>
  );
}
