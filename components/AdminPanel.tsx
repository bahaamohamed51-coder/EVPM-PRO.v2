
import React, { useState } from 'react';
import { User, AppConfig } from '../types';
import { Database, Upload, Users, Shield, Save, Copy, Check, Share2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  onRefresh: () => void;
  user: User; // Current Admin User with Token
}

export default function AdminPanel({ config, setConfig, onRefresh, user }: Props) {
  const [activeTab, setActiveTab] = useState<'data' | 'users'>('data');
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(config.syncUrl);
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCopied, setIsCopied] = useState(false);

  const handleSaveUrl = () => {
    const cleanUrl = urlInput.trim();
    setUrlInput(cleanUrl);
    setConfig({ ...config, syncUrl: cleanUrl });
    alert('Backend URL Updated!');
  };

  const handleCopyLink = () => {
    if (!config.syncUrl) {
        alert("Please save a Script URL first.");
        return;
    }
    const baseUrl = window.location.href.split('?')[0];
    const shareUrl = `${baseUrl}?syncUrl=${encodeURIComponent(config.syncUrl)}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'plan' | 'achieved' | 'users') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!config.syncUrl) {
      alert("Missing Backend URL.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsedData = XLSX.utils.sheet_to_json(ws);

        let body: any = {};
        
        // Include USER object with authToken for Security Check
        const requestPayload = {
            user: user, // Passing current admin user with token
            action: '',
            rows: [] as any[],
            users: [] as any[],
            date: ''
        };

        if (type === 'plan') {
             requestPayload.action = 'uploadPlan';
             requestPayload.rows = parsedData;
        } else if (type === 'achieved') {
             requestPayload.action = 'uploadAchieved';
             requestPayload.rows = parsedData;
             requestPayload.date = uploadDate;
        } else {
             // Correctly map the Name field from Excel columns
             const formattedUsers = parsedData.map((u: any) => ({
                 username: u.Username || u.username,
                 password: u.Password || u.password,
                 name: u.Name || u.name || u.Username || u.username, 
                 jobTitle: 'Staff',
                 role: (u.Role || u.role) === 'admin' ? 'admin' : 'user'
             }));
             requestPayload.action = 'updateUsers';
             requestPayload.users = formattedUsers;
        }
        
        // REMOVED 'no-cors' to allow reading the security error messages
        const response = await fetch(config.syncUrl, {
             method: 'POST',
             body: JSON.stringify(requestPayload)
        });

        if (!response.ok) throw new Error("Network Response Failed");
        
        const json = await response.json();
        
        if (json.error) {
            throw new Error(json.error);
        }

        alert('Upload successful! Data secured on server.');
        setTimeout(onRefresh, 2000);

      } catch (err: any) {
        console.error(err);
        alert('Upload Failed: ' + (err.message || "Unknown Error"));
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
       <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-black flex items-center gap-2"><Shield size={24} className="text-blue-400" /> Secure Admin</h2>
                <p className="text-slate-400 text-xs mt-1">Data & Access Control</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('data')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'data' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Data Upload</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Users</button>
            </div>
       </div>

       {activeTab === 'data' && (
         <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 space-y-8 relative">
            
            {/* Connection Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-2"><Database size={14}/> Backend Script URL</h3>
                    <div className="flex gap-2">
                        <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm" placeholder="Paste GAS Script URL..." />
                        <button onClick={handleSaveUrl} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><Save size={16}/></button>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <h3 className="font-bold text-blue-800 text-xs mb-2 flex items-center gap-2"><Share2 size={14}/> Share App Link</h3>
                    <div className="flex gap-2 items-center">
                        <div className="flex-1 bg-white border border-blue-200 rounded-xl px-4 py-2 text-xs text-slate-500 truncate select-all">
                             {config.syncUrl ? `${window.location.href.split('?')[0]}?syncUrl=...` : 'Configure URL first'}
                        </div>
                        <button 
                            onClick={handleCopyLink} 
                            disabled={!config.syncUrl}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            {isCopied ? <Check size={16}/> : <Copy size={16}/>}
                            {isCopied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <p className="text-[10px] text-blue-600/70 mt-1 pl-1">Link auto-configures the app for users.</p>
                </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            {/* Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                     <h3 className="text-lg font-black text-slate-700 mb-2">Monthly Plan</h3>
                     <label className={`w-full cursor-pointer flex flex-col items-center gap-2 bg-white hover:bg-blue-50 text-slate-700 rounded-2xl p-6 shadow-sm border border-slate-200 transition-all ${isUploading ? 'opacity-50' : ''}`}>
                        <Upload size={24} className="text-blue-500" />
                        <span className="font-bold text-sm">Upload Plan File</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'plan')} disabled={isUploading} />
                     </label>
                </div>
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col items-center text-center">
                     <h3 className="text-lg font-black text-slate-700 mb-2">Daily Achievements</h3>
                     <div className="w-full mb-4 text-left">
                        <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm font-bold" />
                     </div>
                     <label className={`w-full cursor-pointer flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-6 shadow-lg shadow-blue-200 transition-all ${isUploading ? 'opacity-50' : ''}`}>
                        <Upload size={24} className="text-white" />
                        <span className="font-bold text-sm">Upload Daily Report</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'achieved')} disabled={isUploading} />
                     </label>
                </div>
            </div>
         </div>
       )}

       {activeTab === 'users' && (
         <div className="bg-white p-6 rounded-3xl shadow-lg">
            <h4 className="font-black text-lg mb-4 text-slate-700 flex items-center gap-2"><Users size={18}/> User Management</h4>
            <div className="p-4 bg-yellow-50 text-yellow-700 text-xs rounded-xl border border-yellow-200 mb-6 font-bold">
                Security Notice: For security reasons, user lists and passwords cannot be viewed from the client side. You can only bulk upload new user lists to the server.
            </div>
            
            <div className="flex gap-4">
                <label className="cursor-pointer flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-3 px-6 rounded-xl transition-colors text-sm font-bold border border-emerald-200">
                    <Upload size={16} /> Upload Users Sheet (Reset All)
                    <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'users')} />
                </label>
            </div>
         </div>
       )}
    </div>
  );
}
