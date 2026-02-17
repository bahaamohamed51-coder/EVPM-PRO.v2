
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlanRow, AchievedRow, KPIRow } from '../types';
import { calculateTimeGone, formatNumber, getUniqueValues, formatCurrency } from '../utils';
import { Filter, RefreshCw, ChevronDown, Calendar, TrendingUp, TrendingDown, Clock, Activity, LineChart as IconLineChart, XCircle, AlertCircle, Users, Banknote, Layers, Check } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, Cell, PieChart, Pie, Legend, LabelList, LineChart, Line, ReferenceLine 
} from 'recharts';

interface Props {
  plans: PlanRow[];
  achievements: AchievedRow[];
  onRefresh: () => void;
  lastUpdated?: string;
  userFilters?: any;
}

interface DebtGroup {
  name: string;
  fullKey: string;
  Due: number;
  Overdue: number;
  Total: number;
}

// Redesigned Time Pie Widget (Enhanced Visuals)
const TimePieWidget = React.memo(({ selected }: { selected: { percentage: number, dateString: string } }) => {
    // Ensure percentage is within bounds
    const percentage = Math.min(Math.max(selected.percentage, 0), 100);
    
    // Data structure for the pie chart
    const data = [
        { name: 'Completed', value: percentage },
        { name: 'Remaining', value: 100 - percentage },
    ];

    return (
        <div className="bg-slate-800 text-white rounded-3xl p-6 shadow-xl border border-slate-700/50 flex flex-row items-center justify-between relative overflow-hidden h-full group hover:shadow-2xl hover:border-slate-600 transition-all duration-300">
             
             {/* Left Side: Text Info */}
             <div className="flex flex-col items-start z-10 relative max-w-[60%] space-y-3">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 p-2.5 rounded-xl text-red-500 shadow-inner shadow-red-500/10">
                        <Clock size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-wide leading-none">Time Gone</h2>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Cycle</span>
                    </div>
                </div>
                
                <div className="pl-1">
                    <p className="text-sm font-bold text-slate-200 leading-relaxed opacity-90">
                        {selected.dateString}
                    </p>
                </div>
             </div>
             
             {/* Right Side: Enhanced Circular Chart */}
             <div className="h-36 w-36 relative z-10 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            <linearGradient id="colorTimeGone" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#f87171" /> {/* red-400 */}
                                <stop offset="100%" stopColor="#dc2626" /> {/* red-600 */}
                            </linearGradient>
                            <filter id="shadow" height="200%" width="200%">
                                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ef4444" floodOpacity="0.4"/>
                            </filter>
                        </defs>
                        
                        {/* Background Track Ring */}
                        <Pie
                            data={[{ value: 100 }]}
                            dataKey="value" 
                            cx="50%"
                            cy="50%"
                            innerRadius={46}
                            outerRadius={58}
                            startAngle={90}
                            endAngle={-270}
                            fill="#1e293b" // Darker slate for track
                            stroke="none"
                            isAnimationActive={false}
                        />
                        
                        {/* Progress Ring */}
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={46}
                            outerRadius={58}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={10} 
                            paddingAngle={0}
                        >
                             <Cell key="completed" fill="url(#colorTimeGone)" filter="url(#shadow)" />
                             <Cell key="remaining" fill="transparent" stroke="none" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-white leading-none drop-shadow-lg tracking-tighter">
                        {percentage.toFixed(0)}<span className="text-lg align-top text-red-400 ml-0.5">%</span>
                    </span>
                </div>
             </div>
             
             {/* Background Effects */}
             <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-red-600/10 rounded-full blur-[60px] pointer-events-none mix-blend-screen"></div>
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[40px] pointer-events-none"></div>
        </div>
    );
});

const StatCard = React.memo(({ title, actual, plan, prefix = '', customBg = 'bg-white', customText = 'text-slate-800', timeGone }: any) => {
    const percent = plan ? (actual / plan) * 100 : 0;
    const isGSV = title.includes("GSV");
    const titleColor = isGSV ? 'text-purple-100' : 'text-blue-800'; 
    const planValueClass = isGSV ? 'text-sm md:text-base font-bold text-purple-200/90' : 'text-sm md:text-base font-bold text-orange-600'; // Bigger plan numbers

    // --- UPDATED COLOR LOGIC ---
    // The target is Time Gone, but capped at 80% max.
    // If Time Gone is > 80%, the comparison target stays at 80%.
    const effectiveTarget = Math.min(timeGone, 80);
    const gap = effectiveTarget - percent;

    let statusColor = 'green';
    
    // Logic:
    // 1. Green: Achievement >= Effective Target (max 80%)
    // 2. Yellow: Achievement is within 10% of Effective Target (e.g. 70-80 when full time)
    // 3. Red: Achievement is more than 10% behind Effective Target (e.g. <70 when full time)
    
    if (gap <= 0) {
        statusColor = 'green';
    } else if (gap <= 10) {
        statusColor = 'yellow';
    } else {
        statusColor = 'red';
    }

    // Define Styles based on status
    const styles = {
        green: {
            badge: 'bg-emerald-500/20 text-emerald-600',
            fill: 'bg-emerald-500',
            // Special case for GSV badge visibility against dark background
            badgeGSV: 'bg-emerald-500 text-white shadow-sm shadow-emerald-900/20' 
        },
        yellow: {
            badge: 'bg-yellow-100 text-yellow-700', 
            fill: 'bg-yellow-500', 
            badgeGSV: 'bg-yellow-500 text-white shadow-sm shadow-yellow-900/20' 
        },
        red: {
            badge: 'bg-red-500/10 text-red-500',
            fill: 'bg-red-500',
            badgeGSV: 'bg-red-500 text-white shadow-sm shadow-red-900/20'
        }
    };

    const currentStyle = styles[statusColor as keyof typeof styles];
    
    // Select Badge Style (GSV has dark background, needs high contrast)
    const percentBadgeClass = isGSV ? currentStyle.badgeGSV : currentStyle.badge;
    const progressFillClass = currentStyle.fill;
    
    // Progress Track Styles
    const progressTrackClass = isGSV ? 'bg-white/20' : 'bg-slate-100'; 

    const titleClass = isGSV ? 'text-base md:text-lg' : 'text-xs'; 

    return (
        <div className={`${customBg} rounded-2xl p-5 shadow-lg border ${isGSV ? 'border-purple-700' : 'border-slate-100'} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out h-full flex flex-col justify-between relative overflow-hidden group`}>
            {/* Gloss Effect */}
            {!isGSV && <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-full opacity-50 blur-xl group-hover:scale-150 transition-transform duration-500"></div>}
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <span className={`${titleClass} font-black ${titleColor} uppercase tracking-wide`}>{title}</span>
                    {/* MODIFIED: Increased font size from text-sm to text-base */}
                    <span className={`text-base px-2 py-0.5 rounded-lg font-black ${percentBadgeClass}`}>
                        {percent.toFixed(1)}%
                    </span>
                </div>
                <div className="flex items-end gap-2 mt-2">
                    <h3 className={`text-2xl font-black ${customText}`}>{prefix}{formatNumber(actual)}</h3>
                    <span className={`${planValueClass} mb-1`}>/ {formatNumber(plan)}</span>
                </div>
            </div>
            
            <div className={`w-full h-3 rounded-full mt-4 overflow-hidden ${progressTrackClass} relative z-10`}>
                <div className={`h-full rounded-full ${progressFillClass} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
            </div>
        </div>
    );
});

const CustomTooltip = ({ active, payload, label, filterType }: any) => {
    if (active && payload && payload.length) {
      // Access payload of the first item to get the full data object
      const data = payload[0].payload;
      const total = data.Total; // Exists only on Debt Chart
      const globalShare = data.GlobalShare; // Exists only on Debt Chart
      const isProjection = data.isProjection; // Check if it's the future target point

      // Check if we should show total in header
      // It exists only in Debt chart (total property).
      // Logic: Show if total is number AND (filterType is 'All' or undefined).
      // If filterType is 'Due' or 'Overdue', do not show.
      const showTotal = typeof total === 'number' && (filterType === 'All' || !filterType);

      return (
        <div className="bg-slate-800/95 backdrop-blur-sm text-white text-xs p-3 rounded-xl shadow-2xl border border-slate-600">
          <p className="font-bold mb-1 border-b border-slate-600 pb-1 flex justify-between gap-4">
              {/* MODIFIED: Added Total amount display next to name only if showTotal is true */}
              <span>
                  {label} 
                  {isProjection && <span className="text-yellow-400 ml-1">(Next Target)</span>}
                  {showTotal && <span className="text-emerald-400 font-normal ml-1">({formatCurrency(total)})</span>}
              </span>
              {typeof globalShare === 'number' && (
                  <span className="text-yellow-400 font-normal">({globalShare.toFixed(1)}%)</span>
              )}
          </p>
          {payload.map((p: any, i: number) => {
             // Explicitly handle text colors because 'p.color' might be a gradient URL string
             let textColor = p.color;
             if (p.name === 'Overdue Amount') textColor = '#ef4444'; // Red for Overdue
             else if (p.name === 'Due Amount') textColor = '#10b981'; // Green for Due
             else if (typeof p.color === 'string' && p.color.startsWith('url')) {
                 textColor = '#fff'; // Fallback white if gradient
             }
             
             // If projection, skip "Achieved" if null
             if (isProjection && p.dataKey === 'value') return null;
             
             // Calculate % if Total exists (Debt Chart) and it's not a percentage value itself
             let pctString = '';
             // MODIFIED: Only show % if filter is 'All' or unset
             const showPct = !filterType || filterType === 'All';
             
             if (showPct && total && typeof p.value === 'number' && !p.name.includes('%')) {
                 const pct = total > 0 ? (p.value / total) * 100 : 0;
                 pctString = ` (${pct.toFixed(0)}%)`;
             }
             
             return (
                 <p key={i} style={{ color: textColor }} className="font-bold">
                    {p.name}: {typeof p.value === 'number' && p.name.includes('%') ? p.value.toFixed(1) + '%' : formatNumber(p.value)}
                    <span className="ml-1 opacity-75 text-[10px]">{pctString}</span>
                 </p>
             );
          })}
        </div>
      );
    }
    return null;
};

// Reusable KPI Filter Component
const KpiFilterButtons = React.memo(({ current, onChange }: { current: string, onChange: (val: string) => void }) => {
    const options = [
        { k: 'GSV', l: 'GSV' }, { k: 'ECO', l: 'ECO' }, 
        { k: 'PC', l: 'PC' }, { k: 'LPC', l: 'LPC' }, { k: 'MVS', l: 'MVS' }
    ];

    return (
        <div className="flex bg-slate-800 p-1 rounded-xl gap-1 shadow-inner">
            {options.map(opt => (
                <button
                key={opt.k}
                onClick={() => onChange(opt.k)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${current === opt.k ? 'bg-gradient-to-t from-blue-600 to-blue-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                >
                    {opt.l}
                </button>
            ))}
        </div>
    );
});

// Custom Multi-Select Component
const MultiSelectDropdown = ({ label, options, selected, onChange }: { label: string, options: string[], selected: string[], onChange: (val: string[]) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
        onChange(selected.filter(s => s !== opt));
    } else {
        onChange([...selected, opt]);
    }
  };

  const isAll = selected.length === 0;

  return (
    <div className="relative group" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold py-2.5 px-3 rounded-xl outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm flex items-center justify-between"
      >
        {/* Label to the Left, Value/Placeholder to the Right (handled by flex-row in RTL or just text alignment) */}
        {/* To force "Start from Left" in RTL, we use text-left */}
        <span className="text-left w-full truncate pr-4">
             {label}: {isAll ? 'All' : `${selected.length} Selected`}
        </span>
        <ChevronDown size={14} className="text-slate-400 absolute right-3 pointer-events-none"/>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full bg-white shadow-xl rounded-xl mt-1 max-h-60 overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
           <div 
             className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 border-b border-slate-50 flex items-center gap-2"
             onClick={() => onChange([])}
           >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${isAll ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                  {isAll && <Check size={10} className="text-white"/>}
              </div>
              <span>All</span>
           </div>
           {options.map(opt => {
             const isSelected = selected.includes(opt);
             return (
                <div 
                    key={opt} 
                    className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0 flex items-center gap-2"
                    onClick={() => toggleOption(opt)}
                >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                        {isSelected && <Check size={10} className="text-white"/>}
                    </div>
                    <span>{opt}</span>
                </div>
             );
           })}
        </div>
      )}
    </div>
  );
};

const EVPMDashboard = ({ plans, achievements, onRefresh, lastUpdated, userFilters = {} }: Props) => {
  // Global Filters - Now Arrays for Multi-Select
  // If userFilters provides a string (e.g. Salesman restricted view), we wrap it in array
  const initialFilters = useMemo(() => {
      const init: any = {
        Region: [],
        RSM: [],
        SM: [],
        'Dist Name': [],
        'T.L Name': [],      
        SALESMANNAMEA: [],
        Channel: []
      };
      
      Object.keys(userFilters).forEach(key => {
          if (userFilters[key]) {
              init[key] = [userFilters[key]];
          }
      });
      return init;
  }, [userFilters]);

  const [activeFilters, setActiveFilters] = useState<any>(initialFilters);

  // Date Filter State
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Check Restricted View (Salesman)
  const isSalesman = !!userFilters['SALESMANNO'];
  // Check TL View (Team Leader)
  const isTLView = !!userFilters['T.L Name'];
  
  // Check SM View (Sales Manager)
  const isSMView = !!userFilters['SM'] && !userFilters['Dist Name'];

  // Check Restricted View: Dist Name, Salesman OR Team Leader OR SM (To hide Distributor Rankings)
  const isRestrictedView = !!(userFilters['Dist Name'] || isSalesman || isTLView);
  
  // Check ASM View (Distributor but NOT Salesman)
  const isASMView = !!userFilters['Dist Name'] && !userFilters['SALESMANNO'];
  

  // 1. SMART DATE LOGIC PREPARATION
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    achievements.forEach(a => {
        if (a.Days) {
            const d = String(a.Days).split('T')[0];
            if (d.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dates.add(d);
            }
        }
    });
    return Array.from(dates).sort();
  }, [achievements]);

  const effectiveDate = useMemo(() => {
      if (availableDates.includes(selectedDate)) return selectedDate;
      for (let i = availableDates.length - 1; i >= 0; i--) {
          if (availableDates[i] < selectedDate) {
              return availableDates[i];
          }
      }
      return selectedDate;
  }, [selectedDate, availableDates]);

  const isFallbackActive = selectedDate !== effectiveDate && availableDates.length > 0;

  useEffect(() => {
    if (achievements.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const hasDataForToday = achievements.some(a => String(a.Days).includes(today));
        
        if (!hasDataForToday) {
            if (availableDates.length > 0) {
                const latestDate = availableDates[availableDates.length - 1];
                setSelectedDate(latestDate);
            }
        }
    }
  }, [achievements, availableDates]);

  // Chart Filters States
  const [dailyKpi, setDailyKpi] = useState<'Ach GSV' | 'Ach ECO' | 'Ach PC' | 'Ach LPC' | 'Ach MVS'>('Ach GSV');
  const [channelKpi, setChannelKpi] = useState<string>('GSV');
  const [distKpi, setDistKpi] = useState<string>('GSV'); 
  const [salesmanKpi, setSalesmanKpi] = useState<string>('GSV'); // New State for Salesman Chart

  // 2. FILTER LOGIC - UPDATED FOR MULTI-SELECT
  const filteredPlans = useMemo(() => {
    return plans.filter(row => 
        Object.entries(activeFilters).every(([key, vals]: [string, any]) => {
            if (!vals || vals.length === 0) return true; // No filter selected = All
            // Check if row value is included in selected values
            return vals.includes(String(row[key as keyof PlanRow]));
        })
    );
  }, [plans, activeFilters]);

  // 3. DATA MERGING (Using Effective Date)
  const currentViewData = useMemo(() => {
    return filteredPlans.map(plan => {
        const planId = String(plan.SALESMANNO).trim();
        const ach = achievements.find(a => 
            String(a.SALESMANNO).trim() === planId && 
            String(a.Days).includes(effectiveDate)
        );

        return {
            ...plan,
            "Ach GSV": ach ? Number(ach["Ach GSV"]) : 0,
            "Ach ECO": ach ? Number(ach["Ach ECO"]) : 0,
            "Ach PC": ach ? Number(ach["Ach PC"]) : 0,
            "Ach LPC": ach ? Number(ach["Ach LPC"]) : 0,
            "Ach MVS": ach ? Number(ach["Ach MVS"]) : 0,
        } as KPIRow;
    });
  }, [filteredPlans, achievements, effectiveDate]);

  // SPECIAL: Data Source for Salesman Performance Chart
  const salesmanChartSource = useMemo(() => {
    if (isSalesman && userFilters['SALESMANNO']) {
        const me = plans.find(p => String(p.SALESMANNO).trim() === String(userFilters['SALESMANNO']).trim());
        if (me && me['T.L Name']) {
            const myTL = me['T.L Name'];
            const peerPlans = plans.filter(p => p['T.L Name'] === myTL);
            
            return peerPlans.map(plan => {
                const planId = String(plan.SALESMANNO).trim();
                const ach = achievements.find(a => 
                    String(a.SALESMANNO).trim() === planId && 
                    String(a.Days).includes(effectiveDate)
                );
                return {
                    ...plan,
                    "Ach GSV": ach ? Number(ach["Ach GSV"]) : 0,
                    "Ach ECO": ach ? Number(ach["Ach ECO"]) : 0,
                    "Ach PC": ach ? Number(ach["Ach PC"]) : 0,
                    "Ach LPC": ach ? Number(ach["Ach LPC"]) : 0,
                    "Ach MVS": ach ? Number(ach["Ach MVS"]) : 0,
                } as KPIRow;
            });
        }
    }
    return currentViewData;
  }, [isSalesman, userFilters, plans, achievements, effectiveDate, currentViewData]);

  // 4. DATA FOR LINE CHART (Daily Progress) - MODIFIED FOR NEXT TARGET
  const chartData = useMemo(() => {
     const planKey = dailyKpi.replace('Ach', 'Plan') as keyof PlanRow;
     const totalPlan = filteredPlans.reduce((sum, row) => sum + (Number(row[planKey]) || 0), 0);

     const allowedSalesmen = new Set(filteredPlans.map(p => String(p.SALESMANNO).trim()));
     const relevantAchievements = achievements.filter(a => allowedSalesmen.has(String(a.SALESMANNO).trim()));
     const groupedByDate: {[key:string]: number} = {};
     
     relevantAchievements.forEach(a => {
         if (a.Days) {
             const dateKey = String(a.Days).split('T')[0];
             const val = Number(a[dailyKpi]) || 0;
             groupedByDate[dateKey] = (groupedByDate[dateKey] || 0) + val;
         }
     });

     const processedData = Object.entries(groupedByDate)
        .map(([date, value]) => {
            const { percentage } = calculateTimeGone(date);
            const targetValue = totalPlan * (percentage / 100);

            return { 
                date, 
                value,
                target: targetValue,
                isProjection: false
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter(item => item.date <= effectiveDate);
    
     // --- ADD NEXT DAY TARGET LOGIC ---
     if (processedData.length > 0 && totalPlan > 0) {
        const lastDataDate = new Date(effectiveDate);
        let nextTargetDate = new Date(lastDataDate);
        let foundNext = false;
        
        const currentMonth = lastDataDate.getMonth();
        
        // Find next valid working day (Skip Friday, stay in month)
        for(let i=1; i<=5; i++) { // Look ahead max 5 days (e.g. over long weekends)
             nextTargetDate.setDate(nextTargetDate.getDate() + 1);
             
             // Check if moved to next month
             if (nextTargetDate.getMonth() !== currentMonth) {
                 break; 
             }
             
             // Check if Friday (5)
             if (nextTargetDate.getDay() === 5) {
                 continue;
             }
             
             foundNext = true;
             break;
        }

        if (foundNext) {
             const nextDateStr = nextTargetDate.toISOString().split('T')[0];
             const { percentage } = calculateTimeGone(nextTargetDate);
             const targetValue = totalPlan * (percentage / 100);
             
             processedData.push({
                 date: nextDateStr,
                 value: null as any, // No actual value yet
                 target: targetValue,
                 isProjection: true
             });
        }
     }

     return processedData;

  }, [filteredPlans, achievements, dailyKpi, effectiveDate]);


  // DYNAMIC FILTER OPTIONS - UPDATED
  const getOptions = (targetKey: string) => {
      // Logic: Filter data based on ALL other filters EXCEPT the current target key
      let baseData = plans.filter(row => 
         Object.entries(userFilters).every(([k, v]) => !v || String(row[k as keyof PlanRow]) === String(v))
      );

      Object.entries(activeFilters).forEach(([filterKey, filterVals]: [string, any]) => {
          if (filterKey === targetKey) return; // Skip self to allow selection
          if (!filterVals || filterVals.length === 0) return;
          
          baseData = baseData.filter(row => filterVals.includes(String(row[filterKey as keyof PlanRow])));
      });
      
      return getUniqueValues(baseData, targetKey);
  };

  // Aggregates
  const aggregates = useMemo(() => {
    return currentViewData.reduce((acc, row) => ({
        gsv_p: acc.gsv_p + (Number(row["Plan GSV"]) || 0), gsv_a: acc.gsv_a + (Number(row["Ach GSV"]) || 0),
        eco_p: acc.eco_p + (Number(row["Plan ECO"]) || 0), eco_a: acc.eco_a + (Number(row["Ach ECO"]) || 0),
        pc_p: acc.pc_p + (Number(row["Plan PC"]) || 0), pc_a: acc.pc_a + (Number(row["Ach PC"]) || 0),
        lpc_p: acc.lpc_p + (Number(row["Plan LPC"]) || 0), lpc_a: acc.lpc_a + (Number(row["Ach LPC"]) || 0),
        mvs_p: acc.mvs_p + (Number(row["Plan MVS"]) || 0), mvs_a: acc.mvs_a + (Number(row["Ach MVS"]) || 0),
        due: acc.due + (Number(row.Due) || 0),
        overdue: acc.overdue + (Number(row.Overdue) || 0),
        total_debt: acc.total_debt + (Number(row["Total Debt"]) || 0),
    }), { 
        gsv_p: 0, gsv_a: 0, eco_p: 0, eco_a: 0, pc_p: 0, pc_a: 0, lpc_p: 0, lpc_a: 0, mvs_p: 0, mvs_a: 0,
        due: 0, overdue: 0, total_debt: 0
    });
  }, [currentViewData]);

  // Debt Percentages
  const debtPercentages = useMemo(() => {
    if (aggregates.total_debt === 0) return { due: 0, overdue: 0 };
    return {
        due: (aggregates.due / aggregates.total_debt) * 100,
        overdue: (aggregates.overdue / aggregates.total_debt) * 100
    };
  }, [aggregates]);

  // Channel Chart Data
  const channelData = useMemo(() => {
      const planKey = `Plan ${channelKpi}` as keyof KPIRow;
      const achKey = `Ach ${channelKpi}` as keyof KPIRow;

      type ChannelGroup = { name: string, Plan: number, Actual: number };
      const groups = currentViewData.reduce((acc: Record<string, ChannelGroup>, row) => {
          const ch = row.Channel || 'Other';
          if (!acc[ch]) acc[ch] = { name: ch, Plan: 0, Actual: 0 };
          acc[ch].Plan += (Number(row[planKey]) || 0);
          acc[ch].Actual += (Number(row[achKey]) || 0);
          return acc;
      }, {});
      return Object.values(groups).map((item: ChannelGroup) => ({
          ...item,
          achPct: item.Plan > 0 ? Math.round((item.Actual / item.Plan) * 100) : 0
      }))
      .filter(item => item.Plan > 0 || item.Actual > 0) // Filter out zero activity channels
      .sort((a, b) => b.Plan - a.Plan);
  }, [currentViewData, channelKpi]);

  // --- DYNAMIC HIERARCHY LOGIC FOR SALES PERFORMANCE CHART ---
  // Reusing the Drill Down logic from Debt Chart for Sales Chart
  const hierarchyLevels = useMemo(() => [
    { key: 'Region', label: 'Region', depth: 0 },
    { key: 'RSM', label: 'RSM', depth: 1 },
    { key: 'SM', label: 'SM', depth: 2 },
    { key: 'Dist Name', label: 'Distributor', depth: 3 },
    { key: 'T.L Name', label: 'Team Leader', depth: 4 },
    { key: 'SALESMANNAMEA', label: 'Salesman', depth: 5 }
  ], []);

  const currentDepth = useMemo(() => {
      if (activeFilters['SALESMANNO']?.length > 0 || activeFilters['SALESMANNAMEA']?.length > 0) return 5;
      if (activeFilters['T.L Name']?.length > 0) return 4;
      if (activeFilters['Dist Name']?.length > 0) return 3;
      if (activeFilters['SM']?.length > 0) return 2;
      if (activeFilters['RSM']?.length > 0) return 1;
      if (activeFilters['Region']?.length > 0) return 0;
      return 0; 
  }, [activeFilters]);

  // State for Sales Drill Down (similar to debtDrillKey)
  const [salesDrillKey, setSalesDrillKey] = useState<string>('');

  // Auto-set the drill key based on current user view/depth
  useEffect(() => {
      const nextLevelIndex = currentDepth + 1;
      if (nextLevelIndex < hierarchyLevels.length) {
          setSalesDrillKey(hierarchyLevels[nextLevelIndex].key);
      } else {
          setSalesDrillKey(hierarchyLevels[hierarchyLevels.length - 1].key); // Fallback to last level
      }
  }, [currentDepth, hierarchyLevels]);

  const hierarchyTitle = useMemo(() => {
      // Dynamic title based on what we are showing
      const level = hierarchyLevels.find(l => l.key === salesDrillKey);
      if (level) return `${level.label} Performance`;
      return 'Sales Performance';
  }, [salesDrillKey, hierarchyLevels]);

  // Salesman/Hierarchy Performance Data
  const hierarchyData = useMemo(() => {
    if (!salesDrillKey) return [];
    
    const planKey = `Plan ${salesmanKpi}` as keyof KPIRow;
    const achKey = `Ach ${salesmanKpi}` as keyof KPIRow;
    const groupKey = salesDrillKey as keyof KPIRow; // Use the Drill Key, not hierarchyKey

    type GroupData = { name: string, fullName: string, Plan: number, Actual: number };
    
    // Use salesmanChartSource to allow peer view for Salesmen, otherwise falls back to viewData
    const groups = salesmanChartSource.reduce((acc: Record<string, GroupData>, row) => {
        const keyVal = String(row[groupKey] || 'Unknown');
        
        let displayName = keyVal;
        
        // --- MODIFIED: Match Debt Breakdown logic exactly
        // Only shorten if it's NOT a distributor name AND has more than 2 words
        if (typeof keyVal === 'string' && salesDrillKey !== 'Dist Name') {
            const parts = keyVal.trim().split(/\s+/);
            if (parts.length > 2) {
                 displayName = `${parts[0]} ${parts[1]}`;
            }
        }

        if (!acc[keyVal]) acc[keyVal] = { name: displayName, fullName: keyVal, Plan: 0, Actual: 0 };
        acc[keyVal].Plan += (Number(row[planKey]) || 0);
        acc[keyVal].Actual += (Number(row[achKey]) || 0);
        return acc;
    }, {});

    return Object.values(groups).map((item: GroupData) => ({
        ...item,
        achPct: item.Plan > 0 ? Math.round((item.Actual / item.Plan) * 100) : 0
    }))
    .filter(item => item.Plan > 0 || item.Actual > 0) // Filter out zero activity items
    .sort((a, b) => b.Plan - a.Plan); 
  }, [salesmanChartSource, salesmanKpi, salesDrillKey]);

  // Determine available options for drilling down in Sales Chart
  const availableSalesDrillOptions = useMemo(() => {
      return hierarchyLevels.filter(lvl => lvl.depth > currentDepth);
  }, [hierarchyLevels, currentDepth]);


  // Top/Bottom 5 (Dynamic - NOW BY PERCENTAGE)
  const topDistributors = useMemo(() => {
    const achKey = `Ach ${distKpi}` as keyof KPIRow;
    const planKey = `Plan ${distKpi}` as keyof KPIRow;

    type DistGroup = { name: string, Ach: number, Plan: number };
    const groups = currentViewData.reduce((acc: Record<string, DistGroup>, row) => {
        const d = row["Dist Name"] || 'Unknown';
        if (!acc[d]) acc[d] = { name: d, Ach: 0, Plan: 0 };
        acc[d].Ach += (Number(row[achKey]) || 0);
        acc[d].Plan += (Number(row[planKey]) || 0);
        return acc;
    }, {});

    return Object.values(groups)
        .map((g: DistGroup) => ({
            ...g,
            Value: g.Plan > 0 ? (g.Ach / g.Plan) * 100 : 0
        }))
        .filter((i) => i.Plan > 0 || i.Ach > 0) // Filter out zero activity
        .sort((a, b) => b.Value - a.Value)
        .slice(0, 5);
  }, [currentViewData, distKpi]);

  const bottomDistributors = useMemo(() => {
    const achKey = `Ach ${distKpi}` as keyof KPIRow;
    const planKey = `Plan ${distKpi}` as keyof KPIRow;

    type DistGroup = { name: string, Ach: number, Plan: number };
    const groups = currentViewData.reduce((acc: Record<string, DistGroup>, row) => {
        const d = row["Dist Name"] || 'Unknown';
        if (!acc[d]) acc[d] = { name: d, Ach: 0, Plan: 0 };
        acc[d].Ach += (Number(row[achKey]) || 0);
        acc[d].Plan += (Number(row[planKey]) || 0);
        return acc;
    }, {});

    return Object.values(groups)
        .map((g: DistGroup) => ({
            ...g,
            Value: g.Plan > 0 ? (g.Ach / g.Plan) * 100 : 0
        }))
        .filter((i) => i.Value >= 0 && i.Plan > 0) // Strict for Bottom: must have plan
        .sort((a, b) => a.Value - b.Value)
        .slice(0, 5);
  }, [currentViewData, distKpi]);

  const timeGone = useMemo(() => calculateTimeGone(effectiveDate), [effectiveDate]);
  
  const updateFilter = (key: string, val: string[]) => {
      const newFilters = { ...activeFilters, [key]: val };
      setActiveFilters(newFilters);
  };
  
  const handleClearFilters = () => {
    // Reset to user defaults (which are arrays now)
    const init: any = {
        Region: [],
        RSM: [],
        SM: [],
        'Dist Name': [],
        'T.L Name': [],      
        SALESMANNAMEA: [],
        Channel: []
    };
    Object.keys(userFilters).forEach(key => {
        if (userFilters[key]) {
            init[key] = [userFilters[key]];
        }
    });

    setActiveFilters(init);
    
    if (availableDates.length > 0) {
        setSelectedDate(availableDates[availableDates.length - 1]);
    } else {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

  const getLabel = (key: string) => {
      if (key === 'SALESMANNAMEA') return 'Salesman';
      if (key === 'T.L Name') return 'Team Leader';
      return key.replace('_', ' ');
  }

  const filterKeys = ['Region', 'RSM', 'SM', 'Dist Name', 'T.L Name', 'SALESMANNAMEA', 'Channel'];

  // --- DEBT BREAKDOWN DRILL-DOWN LOGIC ---
  const [debtDrillKey, setDebtDrillKey] = useState<string>('');
  const [debtMetric, setDebtMetric] = useState<'All' | 'Due' | 'Overdue'>('All');

  useEffect(() => {
      const nextLevelIndex = currentDepth + 1;
      if (nextLevelIndex < hierarchyLevels.length) {
          setDebtDrillKey(hierarchyLevels[nextLevelIndex].key);
      } else {
          setDebtDrillKey(''); 
      }
  }, [currentDepth, hierarchyLevels]);

  const debtBreakdownData = useMemo(() => {
      if (!debtDrillKey || currentDepth >= 5) return [];

      const groups = currentViewData.reduce((acc: Record<string, DebtGroup>, row) => {
          let key = String(row[debtDrillKey as keyof KPIRow] || 'Unknown');
          let displayName = key;
          if (typeof key === 'string' && debtDrillKey !== 'Dist Name') {
               const parts = key.split(' ');
               if (parts.length > 2) {
                   displayName = `${parts[0]} ${parts[1]}`;
               }
          }

          if (!acc[key]) acc[key] = { name: displayName, fullKey: key, Due: 0, Overdue: 0, Total: 0 };
          acc[key].Due += (Number(row.Due) || 0);
          acc[key].Overdue += (Number(row.Overdue) || 0);
          acc[key].Total += (Number(row["Total Debt"]) || 0);
          return acc;
      }, {} as Record<string, DebtGroup>);

      const rawList = Object.values(groups).filter((item: DebtGroup) => {
          if (debtMetric === 'Due') return item.Due > 0;
          if (debtMetric === 'Overdue') return item.Overdue > 0;
          return item.Total > 0; 
      });

      let metricKey: 'Total' | 'Due' | 'Overdue' = 'Total';
      if (debtMetric === 'Due') metricKey = 'Due';
      else if (debtMetric === 'Overdue') metricKey = 'Overdue';

      // Fix: Direct access without casting
      const grandTotal: number = rawList.reduce((sum, item) => sum + (item[metricKey] || 0), 0);

      return rawList
             .map((item: DebtGroup) => ({
                 ...item,
                 GlobalShare: grandTotal > 0 ? ((item[metricKey] || 0) / grandTotal) * 100 : 0
             }))
             .sort((a, b) => {
                 if (debtMetric === 'Due') return b.Due - a.Due;
                 if (debtMetric === 'Overdue') return b.Overdue - a.Overdue;
                 return b.Total - a.Total;
             });
  }, [currentViewData, debtDrillKey, currentDepth, debtMetric]);

  const availableDrillOptions = useMemo(() => {
      return hierarchyLevels.filter(lvl => lvl.depth > currentDepth);
  }, [hierarchyLevels, currentDepth]);


  return (
    <div className="space-y-6 pb-12">
        {/* Header & Date Filter */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-6 shadow-md border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <Filter size={16} className="text-blue-600"/> 
                    Filters
                </h3>
                
                <div className="flex gap-2">
                    <button onClick={handleClearFilters} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-bold">
                        <XCircle size={12}/> Clear All
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                        <Calendar size={12}/> Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'N/A'}
                    </span>
                    <button onClick={onRefresh} className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-bold">
                        <RefreshCw size={12}/> Update
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                <div className="relative col-span-1">
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className={`w-full border rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none transition-all shadow-sm ${isFallbackActive ? 'bg-orange-50 border-orange-200' : 'bg-white border-blue-200 focus:border-blue-500'}`}
                    />
                    <Calendar className={`absolute right-3 top-3 pointer-events-none ${isFallbackActive ? 'text-orange-400' : 'text-blue-400'}`} size={14}/>
                    
                    {isFallbackActive && (
                        <div className="absolute -bottom-6 right-0 bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap border border-orange-200 shadow-sm z-10">
                            <AlertCircle size={10} /> Data: {effectiveDate}
                        </div>
                    )}
                </div>

                {filterKeys.map(key => (
                    !userFilters[key] && (
                        <div key={key}>
                            <MultiSelectDropdown 
                                label={getLabel(key)}
                                options={getOptions(key)}
                                selected={activeFilters[key] || []}
                                onChange={(vals) => updateFilter(key, vals)}
                            />
                        </div>
                    )
                ))}
            </div>
        </div>

        {/* SECTION 1: Time Widget & Total GSV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TimePieWidget 
                selected={{ percentage: timeGone.percentage, dateString: timeGone.dateString }} 
            />
            <StatCard 
                title="Total GSV" 
                plan={aggregates.gsv_p} 
                actual={aggregates.gsv_a} 
                prefix="" 
                customBg="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800" 
                customText="text-white"
                timeGone={timeGone.percentage}
            />
        </div>

        {/* SECTION 2: Other KPIs Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="ECO Coverage" plan={aggregates.eco_p} actual={aggregates.eco_a} customBg="bg-white" timeGone={timeGone.percentage}/>
            <StatCard title="Productive Calls" plan={aggregates.pc_p} actual={aggregates.pc_a} customBg="bg-white" timeGone={timeGone.percentage}/>
            <StatCard title="LPC" plan={aggregates.lpc_p} actual={aggregates.lpc_a} customBg="bg-white" timeGone={timeGone.percentage}/>
            <StatCard title="MVS" plan={aggregates.mvs_p} actual={aggregates.mvs_a} customBg="bg-white" timeGone={timeGone.percentage}/>
        </div>

        {/* SECTION 3: LINE CHART (Daily Progress) - WITH TARGET LINE */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
             <div className="flex flex-wrap justify-between items-center mb-4 gap-4 px-3 pt-3">
                 <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-sm">
                        <IconLineChart size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-700 text-lg">Daily Progression</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Comparison of Achievement vs. Time Gone Target</p>
                    </div>
                 </div>
                 
                 <div className="flex bg-slate-800 p-1 rounded-xl gap-1 shadow-inner">
                     {[
                         { k: 'Ach GSV', l: 'GSV' }, { k: 'Ach ECO', l: 'ECO' }, 
                         { k: 'Ach PC', l: 'PC' }, { k: 'Ach LPC', l: 'LPC' }, { k: 'Ach MVS', l: 'MVS' }
                     ].map(opt => (
                         <button
                            key={opt.k}
                            onClick={() => setDailyKpi(opt.k as any)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${dailyKpi === opt.k ? 'bg-gradient-to-t from-blue-600 to-blue-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                         >
                             {opt.l}
                         </button>
                     ))}
                 </div>
             </div>
             
             <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{top: 50, right: 10, left: 10, bottom: 10}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis 
                            dataKey="date" 
                            padding={{ left: 30, right: 30 }}
                            height={80} 
                            angle={-90}
                            textAnchor="end"
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                if (isNaN(d.getTime())) return val;
                                const day = String(d.getDate()).padStart(2, '0');
                                const month = d.toLocaleString('en-US', { month: 'short' });
                                return `${day}-${month}`;
                            }}
                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                            axisLine={false} 
                            tickLine={false} 
                            tickMargin={45} 
                        />
                        <YAxis 
                            width={50}
                            tickFormatter={(val) => formatNumber(val)} 
                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                            axisLine={false} 
                            tickLine={false}
                            tickCount={10} 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '10px'}} />
                        
                        {/* Actual Achievement Line - Labels Bottom */}
                        <Line 
                            name="Achieved"
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={4} 
                            connectNulls={true}
                            dot={{r: 4, strokeWidth: 0, fill: '#3b82f6'}} 
                            activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} 
                        >
                             <LabelList 
                                dataKey="value" 
                                position="bottom" 
                                offset={25}
                                formatter={(val: number) => formatNumber(val)} 
                                style={{ fontSize: '9px', fontWeight: 'bold', fill: '#3b82f6', textShadow: '0px 0px 5px white' }} 
                            />
                        </Line>

                        {/* Target Line based on Time Gone - Labels Top */}
                        <Line 
                            name="Target (Time Gone)"
                            type="monotone" 
                            dataKey="target" 
                            stroke="#ef4444" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{r: 5, stroke: '#fff', strokeWidth: 2, fill: '#ef4444'}} 
                        >
                             <LabelList 
                                dataKey="target" 
                                position="top" 
                                offset={25}
                                formatter={(val: number) => formatNumber(val)} 
                                style={{ fontSize: '9px', fontWeight: 'bold', fill: '#ef4444', textShadow: '0px 0px 5px white' }} 
                            />
                        </Line>
                    </LineChart>
                </ResponsiveContainer>
             </div>
        </div>

        {/* SECTION 4: Charts */}
        <div className="grid grid-cols-1 gap-6">
            
            {/* Sales Performance (Dynamic Drill-Down for All Users) */}
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4 px-3 pt-3">
                    <div className="flex items-center gap-2">
                            <Users size={20} className="text-blue-600"/>
                            <div>
                                <h3 className="font-black text-slate-700 text-lg">{hierarchyTitle}</h3>
                                {availableSalesDrillOptions.length > 0 && (
                                     <p className="text-[10px] text-slate-400 font-bold">Level: {availableSalesDrillOptions.find(o => o.key === salesDrillKey)?.label || 'View'}</p>
                                )}
                            </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                         {/* DRILL DOWN BUTTONS for Sales Performance */}
                         {availableSalesDrillOptions.length > 0 && (
                             <div className="flex bg-slate-800 p-1 rounded-xl gap-1 shadow-inner">
                                {availableSalesDrillOptions.map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setSalesDrillKey(opt.key)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${salesDrillKey === opt.key ? 'bg-gradient-to-t from-blue-600 to-blue-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                             </div>
                         )}

                         <KpiFilterButtons current={salesmanKpi} onChange={setSalesmanKpi} />
                    </div>
                </div>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hierarchyData} margin={{top: 20, right: 10, left: -20, bottom: 20}}>
                            <defs>
                                <linearGradient id="colorPlanBar" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#fdba74" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#f97316" stopOpacity={1}/>
                                </linearGradient>
                                <linearGradient id="colorActualBar" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis 
                                dataKey="name" 
                                tick={{fontSize: 9, fontWeight: 'bold'}} 
                                axisLine={false} 
                                tickLine={false} 
                                interval={0}
                                angle={-90}
                                textAnchor="start"
                                height={100}
                                tickMargin={35} 
                            />
                            <YAxis tickFormatter={(val) => formatNumber(val)} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                                iconType="circle" 
                                wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '10px'}} 
                                formatter={(value) => <span style={{ marginInlineStart: '5px', marginInlineEnd: '15px' }}>{value}</span>}
                            />
                            <Bar dataKey="Plan" fill="url(#colorPlanBar)" radius={[4, 4, 0, 0] as any} barSize={24} name="Plan" />
                            <Bar dataKey="Actual" fill="url(#colorActualBar)" radius={[4, 4, 0, 0] as any} barSize={24} name="Achieved">
                                <LabelList dataKey="achPct" position="top" formatter={(val: any) => `${val}%`} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#3b82f6' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Performance by Channel (Bar Chart) - Hidden for Salesman AND Team Leader */}
            {!isSalesman && !isTLView && (
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4 px-3 pt-3">
                        <h3 className="font-black text-slate-700 text-lg">Performance by Channel</h3>
                        <KpiFilterButtons current={channelKpi} onChange={setChannelKpi} />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={channelData} margin={{top: 20, right: 10, left: -20, bottom: 0}}>
                                <defs>
                                    <linearGradient id="colorPlanBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#fdba74" stopOpacity={1}/>
                                        <stop offset="100%" stopColor="#f97316" stopOpacity={1}/>
                                    </linearGradient>
                                    <linearGradient id="colorActualBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(val) => formatNumber(val)} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '10px'}} 
                                    formatter={(value) => <span style={{ marginInlineStart: '5px', marginInlineEnd: '15px' }}>{value}</span>}
                                />
                                <Bar dataKey="Plan" fill="url(#colorPlanBar)" radius={[4, 4, 0, 0] as any} barSize={20} name="Plan" />
                                <Bar dataKey="Actual" fill="url(#colorActualBar)" radius={[4, 4, 0, 0] as any} barSize={20} name="Achieved">
                                    <LabelList dataKey="achPct" position="top" formatter={(val: any) => `${val}%`} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#3b82f6' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            
            {/* Split Row for Top 5 and Bottom 5 (PERCENTAGE BASED) */}
            {!isRestrictedView && !isSMView && (
                <div>
                    <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                         <h3 className="font-black text-slate-700 text-sm flex items-center gap-2">
                            <Activity size={18} className="text-blue-500"/> Distributor Ranking (By %)
                         </h3>
                         <KpiFilterButtons current={distKpi} onChange={setDistKpi} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
                            <div className="flex items-center gap-2 mb-4 px-3 pt-3">
                                <TrendingUp size={20} className="text-emerald-500"/>
                                <h3 className="font-black text-slate-700 text-lg">Top 5 Distributors ({distKpi} %)</h3>
                            </div>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={topDistributors} margin={{top: 20, right: 0, left: 0, bottom: 30}}>
                                        <defs>
                                            <linearGradient id="colorGsvTop" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        {/* Added vertical={true} for vertical lines indicators */}
                                        <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9"/>
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{fontSize: 9, fontWeight: 'bold'}}
                                            angle={45} 
                                            textAnchor="middle" 
                                            interval={0} 
                                            axisLine={false} 
                                            tickLine={false}
                                            height={60} 
                                            padding={{ left: 40, right: 40 }} 
                                        />
                                        <YAxis 
                                            width={50} 
                                            tickFormatter={(val) => `${val.toFixed(0)}%`} 
                                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tickCount={10} 
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        {/* Removed ReferenceLine y={80} */}
                                        <Area 
                                            name="% Achievement"
                                            type="monotone" 
                                            dataKey="Value" 
                                            stroke="#10b981" 
                                            strokeWidth={3} 
                                            fillOpacity={0} 
                                            fill="url(#colorGsvTop)"
                                            // Enhanced dots to show point positions clearly - SOLID with white border
                                            dot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2, fillOpacity: 1 }}
                                            activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                        >
                                            <LabelList 
                                                dataKey="Value" 
                                                position="top" 
                                                offset={10}
                                                formatter={(val: number) => `${val.toFixed(0)}%`} 
                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} 
                                            />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
                            <div className="flex items-center gap-2 mb-4 px-3 pt-3">
                                <TrendingDown size={20} className="text-red-500"/>
                                <h3 className="font-black text-slate-700 text-lg">Bottom 5 Distributors ({distKpi} %)</h3>
                            </div>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={bottomDistributors} margin={{top: 20, right: 0, left: 0, bottom: 30}}>
                                        <defs>
                                            <linearGradient id="colorGsvBottom" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        {/* Added vertical={true} for vertical lines indicators */}
                                        <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9"/>
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{fontSize: 9, fontWeight: 'bold'}}
                                            angle={45} 
                                            textAnchor="middle" 
                                            interval={0} 
                                            axisLine={false} 
                                            tickLine={false}
                                            height={60} 
                                            padding={{ left: 40, right: 40 }}
                                        />
                                        <YAxis 
                                            width={50} 
                                            tickFormatter={(val) => `${val.toFixed(0)}%`} 
                                            tick={{fontSize: 10, fontWeight: 'bold'}} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tickCount={10} 
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        {/* Removed ReferenceLine y={80} */}
                                        <Area 
                                            name="% Achievement"
                                            type="monotone" 
                                            dataKey="Value" 
                                            stroke="#ef4444" 
                                            strokeWidth={3} 
                                            fillOpacity={0} 
                                            fill="url(#colorGsvBottom)"
                                            // Enhanced dots to show point positions clearly - SOLID with white border
                                            dot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2, fillOpacity: 1 }}
                                            activeDot={{ r: 8, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                                        >
                                            <LabelList 
                                                dataKey="Value" 
                                                position="top" 
                                                offset={10}
                                                formatter={(val: number) => `${val.toFixed(0)}%`} 
                                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#ef4444' }} 
                                            />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* DEBT MANAGEMENT CARD */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-6">
                    {/* Title & Total Debt */}
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600/20 p-3 rounded-2xl text-blue-400 border border-blue-500/30">
                            <Banknote size={32} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Debt Status</h3>
                            <div className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                {formatCurrency(aggregates.total_debt)}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar Visual */}
                    <div className="flex-1 w-full md:w-auto">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                             <span>Breakdown</span>
                             <span>{((debtPercentages.due + debtPercentages.overdue) || 0).toFixed(0)}% of Total</span>
                        </div>
                        <div className="h-4 w-full bg-slate-700/50 rounded-full overflow-hidden flex shadow-inner">
                            <div 
                                className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000" 
                                style={{ width: `${debtPercentages.due}%` }} 
                                title="Due"
                            />
                            <div 
                                className="h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-1000" 
                                style={{ width: `${debtPercentages.overdue}%` }} 
                                title="Overdue"
                            />
                        </div>
                    </div>

                    {/* Details: Due vs Overdue */}
                    <div className="flex gap-6 w-full md:w-auto justify-between md:justify-end">
                         <div className="flex flex-col items-center">
                             <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-1">Due Amount</div>
                             <div className="text-xl font-bold text-white leading-none">{formatCurrency(aggregates.due)}</div>
                             <div className="text-sm font-black text-emerald-400 mt-1">{debtPercentages.due.toFixed(1)}%</div>
                         </div>
                         <div className="h-10 w-px bg-slate-700 hidden md:block"></div>
                         <div className="flex flex-col items-center">
                             <div className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-1">Overdue Amount</div>
                             <div className="text-xl font-bold text-white leading-none">{formatCurrency(aggregates.overdue)}</div>
                             <div className="text-sm font-black text-red-400 mt-1">{debtPercentages.overdue.toFixed(1)}%</div>
                         </div>
                    </div>
                </div>
                
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/5 rounded-full blur-[60px] pointer-events-none"></div>
            </div>

            {/* NEW: DEBT BREAKDOWN CARD (Visible if NOT Salesman view) */}
            {currentDepth < 5 && availableDrillOptions.length > 0 && (
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-3 shadow-md border border-slate-100">
                    {/* Header with Drill-Down Filters */}
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4 px-3 pt-3">
                        <div className="flex items-center gap-2">
                             <Layers size={20} className="text-purple-600"/>
                             <div>
                                <h3 className="font-black text-slate-700 text-lg">Debt Breakdown</h3>
                                <p className="text-[10px] text-slate-400 font-bold">Detailed breakdown by {availableDrillOptions.find(o => o.key === debtDrillKey)?.label || 'Level'}</p>
                             </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {/* Drill Down Filters */}
                            <div className="flex bg-slate-800 p-1 rounded-xl gap-1 shadow-inner">
                                {availableDrillOptions.map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setDebtDrillKey(opt.key)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${debtDrillKey === opt.key ? 'bg-gradient-to-t from-purple-600 to-purple-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {/* Metric Filters (Due / Overdue) */}
                            <div className="flex bg-slate-800 p-1 rounded-xl gap-1 shadow-inner">
                                {['All', 'Due', 'Overdue'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setDebtMetric(opt as any)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${debtMetric === opt ? 'bg-gradient-to-t from-blue-600 to-blue-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={debtBreakdownData} margin={{top: 20, right: 10, left: -20, bottom: 20}}>
                                <defs>
                                    <linearGradient id="debtDueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                                        <stop offset="95%" stopColor="#059669" stopOpacity={1}/>
                                    </linearGradient>
                                    <linearGradient id="debtOverdueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                                        <stop offset="95%" stopColor="#dc2626" stopOpacity={1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis 
                                    dataKey="name" 
                                    tick={{fontSize: 9, fontWeight: 'bold'}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    interval={0}
                                    angle={-90}
                                    textAnchor="start" 
                                    height={100}
                                    tickMargin={35} 
                                />
                                <YAxis tickFormatter={(val) => formatNumber(val)} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip filterType={debtMetric} />} />
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '40px'}} 
                                    formatter={(value) => <span style={{ marginInlineStart: '10px' }}>{value}</span>}
                                />
                                {(debtMetric === 'All' || debtMetric === 'Due') && (
                                    <Bar 
                                        dataKey="Due" 
                                        stackId="a" 
                                        fill="url(#debtDueGradient)" 
                                        radius={debtMetric === 'Due' ? [6, 6, 0, 0] as any : [0, 0, 6, 6] as any} 
                                        barSize={24} 
                                        name="Due Amount" 
                                    />
                                )}
                                {(debtMetric === 'All' || debtMetric === 'Overdue') && (
                                    <Bar 
                                        dataKey="Overdue" 
                                        stackId="a" 
                                        fill="url(#debtOverdueGradient)" 
                                        radius={[6, 6, 0, 0] as any} 
                                        barSize={24} 
                                        name="Overdue Amount" 
                                    />
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};

// Export memoized version
export default React.memo(EVPMDashboard);
