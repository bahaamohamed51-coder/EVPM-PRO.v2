
import React, { useState } from 'react';
import { User, Job, AppConfig, KPIRow } from '../types';
import { Database, Upload, Users, Plus, Trash2, Shield, FileJson, FileDown, Save, CloudDownload, Calendar, Share2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  onRefresh: () => void;
  allUsers: User[];
  jobs: Job[];
  currentData: KPIRow[];
}

export default function AdminPanel({ config, setConfig, onRefresh, allUsers, jobs, currentData }: Props) {
  const [activeTab, setActiveTab] = useState<'data' | 'users'>('data');
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(config.syncUrl);
  
  // Date state for Achievement Upload
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);

  // User Management State
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'user' });

  const handleSaveUrl = () => {
    const cleanUrl = urlInput.trim();
    setUrlInput(cleanUrl); // Update UI to show trimmed version
    setConfig({ ...config, syncUrl: cleanUrl });
    alert('Google Script URL Updated!');
  };

  const handleShareLink = () => {
    if (!config.syncUrl) {
      alert("Please save the Script URL first.");
      return;
    }
    const cleanUrl = config.syncUrl.trim();
    // Construct the link with query parameter
    const baseUrl = window.location.origin + window.location.pathname;
    const inviteLink = `${baseUrl}?syncUrl=${encodeURIComponent(cleanUrl)}`;
    
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert('Invite Link copied to clipboard! Send this to your team.');
    });
  };

  const handleDownloadTemplate = (type: 'plan' | 'ach') => {
    let headers = [];
    let filename = "";

    if (type === 'plan') {
        headers = [
            "SALESMANNO", "SALESMANNAMEA", 
            "Plan GSV", "Plan ECO", "Plan PC", "Plan LPC", "Plan MVS", 
            "Dist Name", "T.L Name", "Channel", "SM", "RSM", "Region",
            "Due", "Overdue", "Total Debt"
        ];
        filename = "EVPM_Plan_Template.xlsx";
    } else {
        headers = [
            "SALESMANNO", "SALESMANNAMEA", 
            "Ach GSV", "Ach ECO", "Ach PC", "Ach LPC", "Ach MVS"
        ];
        filename = "EVPM_Achieved_Template.xlsx";
    }
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, filename);
  };

  const handleUserTemplateDownload = () => {
    const headers = ["Username", "Password", "Role"];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ["Branch_Cairo", "12345", "user"], ["admin", "admin123", "admin"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "EVPM_Credentials_Template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'plan' | 'achieved' | 'users') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!config.syncUrl) {
      alert("Please configure the Google Apps Script URL before uploading.");
      return;
    }

    const cleanUrl = config.syncUrl.trim();

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsedData = XLSX.utils.sheet_to_json(ws);

        if (type === 'plan') {
             // Plan Upload
             await fetch(cleanUrl, {
                 method: 'POST', mode: 'no-cors',
                 body: JSON.stringify({ action: 'uploadPlan', rows: parsedData })
             });
             alert('Monthly Plan Data uploaded successfully!');
        } else if (type === 'achieved') {
             // Achieved Upload (Append with Date)
             await fetch(cleanUrl, {
                 method: 'POST', mode: 'no-cors',
                 body: JSON.stringify({ action: 'uploadAchieved', rows: parsedData, date: uploadDate })
             });
             alert(`Daily Achievements for ${uploadDate} appended successfully!`);
        } else {
             // Users Upload
             const formattedUsers = parsedData.map((u: any) => ({
                 username: u.Username || u.username,
                 password: u.Password || u.password,
                 name: u.Username || u.username,
                 jobTitle: 'Staff',
                 role: (u.Role || u.role) === 'admin' ? 'admin' : 'user'
             }));

             await fetch(cleanUrl, {
                 method: 'POST', mode: 'no-cors',
                 body: JSON.stringify({ action: 'updateUsers', users: formattedUsers })
             });
             alert('Credentials updated successfully!');
        }
        
        setTimeout(onRefresh, 2000);
      } catch (err) {
        console.error(err);
        alert('Error parsing or uploading file.');
      } finally {
        setIsUploading(false);
        // Reset file input
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const syncUsers = async (updatedUsers: User[]) => {
    if (!config.syncUrl) { alert("Missing Sync URL"); return; }
    try {
        await fetch(config.syncUrl.trim(), {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'updateUsers', users: updatedUsers })
        });
        onRefresh();
    } catch(e) { alert('Sync Failed'); }
  };

  return (
    <div className="space-y-6">
       <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-black flex items-center gap-2"><Shield size={24} className="text-blue-400" /> Control Panel</h2>
                <p className="text-slate-400 text-xs mt-1">System Management & Configuration</p>
            </div>
            <div className="flex gap-2">
                {['data', 'users'].map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab as any)} 
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        {tab === 'data' ? 'Data Upload' : 'Users'}
                    </button>
                ))}
            </div>
       </div>

       {activeTab === 'data' && (
         <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 space-y-8 relative">
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-2xl mx-auto">
                <label className="text-xs font-black text-slate-500 mb-2 block uppercase tracking-wide">Backend URL</label>
                <div className="flex gap-2">
                    <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-700 outline-none" placeholder="Script URL..." />
                    <button onClick={handleSaveUrl} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"><Save size={16}/></button>
                    <button onClick={handleShareLink} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2" title="Copy Invite Link">
                       <Share2 size={16}/> Invite Link
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">Use the 'Invite Link' button to share direct access with users.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 1. PLAN UPLOAD */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                     <h3 className="text-lg font-black text-slate-700 mb-2">Monthly Plan</h3>
                     <p className="text-xs text-slate-400 mb-6">Upload the master plan for the month. (Replaces existing)</p>
                     
                     <label className={`w-full cursor-pointer flex flex-col items-center gap-2 bg-white hover:bg-blue-50 text-slate-700 rounded-2xl p-6 shadow-sm border border-slate-200 transition-all ${isUploading ? 'opacity-50' : ''}`}>
                        <Upload size={24} className="text-blue-500" />
                        <span className="font-bold text-sm">Upload Plan File</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'plan')} disabled={isUploading} />
                     </label>

                     <button onClick={() => handleDownloadTemplate('plan')} className="mt-4 text-[10px] text-slate-400 flex items-center gap-1 hover:text-blue-600"><FileDown size={12}/> Download Plan Template</button>
                </div>

                {/* 2. ACHIEVED UPLOAD */}
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col items-center text-center">
                     <h3 className="text-lg font-black text-slate-700 mb-2">Daily Achievements</h3>
                     <p className="text-xs text-slate-400 mb-4">Append daily sales report.</p>
                     
                     <div className="w-full mb-4 text-left">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Report Date</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={uploadDate} 
                                onChange={(e) => setUploadDate(e.target.value)} 
                                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                            />
                            <Calendar className="absolute right-3 top-3 text-blue-300 pointer-events-none" size={16}/>
                        </div>
                     </div>

                     <label className={`w-full cursor-pointer flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-6 shadow-lg shadow-blue-200 transition-all ${isUploading ? 'opacity-50' : ''}`}>
                        <Upload size={24} className="text-white" />
                        <span className="font-bold text-sm">Upload Daily Report</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'achieved')} disabled={isUploading} />
                     </label>

                     <button onClick={() => handleDownloadTemplate('ach')} className="mt-4 text-[10px] text-blue-400 flex items-center gap-1 hover:text-blue-600"><FileDown size={12}/> Download Achieved Template</button>
                </div>

            </div>

            <div className="text-center">
                <button onClick={onRefresh} className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 mx-auto">
                    <CloudDownload size={18}/> Refresh System Data
                </button>
            </div>

         </div>
       )}

       {activeTab === 'users' && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-lg h-fit space-y-6">
                <div className="border-b border-slate-100 pb-6 mb-2">
                     <h4 className="font-black text-sm mb-3 flex items-center gap-2 text-slate-700">Bulk Actions</h4>
                     <div className="grid grid-cols-1 gap-2">
                        <button onClick={handleUserTemplateDownload} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-xl transition-colors text-xs font-bold"><FileDown size={14} /> Template</button>
                        <label className="cursor-pointer flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-2 rounded-xl transition-colors text-xs font-bold">
                            <Upload size={14} /> Upload Sheet
                            <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'users')} />
                        </label>
                     </div>
                </div>
                <div>
                    <h4 className="font-black text-lg mb-4 flex items-center gap-2 text-slate-700"><Plus size={18}/> Manual Entry</h4>
                    <div className="space-y-3">
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" placeholder="Username" value={newUser.username || ''} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" placeholder="Password" value={newUser.password || ''} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" value={newUser.role || 'user'} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => { if(newUser.username && newUser.password) { const updated = [...allUsers, { ...newUser, name: newUser.username } as User]; syncUsers(updated); setNewUser({role:'user'}); } }} className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-colors">Save</button>
                    </div>
                </div>
             </div>
             
             <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                     <h4 className="font-black text-lg flex items-center gap-2 text-slate-700"><Users size={18}/> Users</h4>
                     {isUploading && <span className="text-xs text-blue-500 animate-pulse font-bold">Uploading...</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="text-[10px] text-slate-400 uppercase border-b border-slate-100"><th className="pb-2">Username</th><th className="pb-2">Role</th><th className="pb-2">Action</th></tr></thead>
                        <tbody>
                            {allUsers.map((u, i) => (
                                <tr key={i} className="border-b border-slate-50 text-xs font-bold text-slate-700">
                                    <td className="py-3">{u.username}</td>
                                    <td className="py-3"><span className={`px-2 py-1 rounded-md ${u.role === 'admin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{u.role}</span></td>
                                    <td className="py-3">
                                        <button onClick={() => { if(confirm('Delete credential?')) { const updated = allUsers.filter(x => x.username !== u.username); syncUsers(updated); } }} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
         </div>
       )}
    </div>
  );
}
