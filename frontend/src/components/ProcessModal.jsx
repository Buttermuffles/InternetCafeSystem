import React, { useState } from 'react';
import { X, Search, Activity, Cpu, Zap, Power } from 'lucide-react';

function ProcessModal({ pcName, processes, onClose, onKill }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = processes.filter(p => 
        p.Name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.Id.toString().includes(searchTerm)
    ).sort((a, b) => b.CPU - a.CPU);

    return (
        <div className="premium-modal-overlay" onClick={onClose}>
            <div className="premium-modal-content w-full max-w-4xl p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white leading-none">Task Manager</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">
                                Remote Process Pool: {pcName}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search tasks..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 w-64"
                            />
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-900 z-10">
                            <tr className="border-b border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Process Name</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">PID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">CPU %</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">RAM (MB)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length > 0 ? filtered.map((p, idx) => (
                                <tr key={`${p.Id}-${idx}`} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                                                {p.Name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-bold text-slate-200">{p.Name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-mono text-slate-500 bg-black/40 px-2 py-0.5 rounded-md">{p.Id}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-xs font-black ${p.CPU > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>{p.CPU}%</span>
                                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full ${p.CPU > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(p.CPU, 100)}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                         <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs font-black text-amber-400">{p.RAM} MB</span>
                                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500" style={{ width: `${Math.min(p.RAM / 10, 100)}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => onKill(p.Id, p.Name)}
                                            className="p-2 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                            title="End Task"
                                        >
                                            <Power size={14} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                                        No matching processes found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 bg-slate-900/80 border-t border-white/5 flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <span>Processes: {filtered.length}</span>
                    <span>Self-Correction Enabled</span>
                </div>
            </div>
        </div>
    );
}

export default ProcessModal;
