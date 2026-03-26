import { useState } from 'react';
import { LayoutDashboard, Settings, Trash2, Recycle, Lock, Server, Menu, X, Terminal } from 'lucide-react';

function Sidebar({ pcs, handleCommand, showToast, currentPage, setCurrentPage }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    
    const handleBulkCommand = (commandType, commandLabel) => {
        const onlinePcs = pcs.filter(pc => pc.status === 'online');
        
        if (onlinePcs.length === 0) {
            showToast('No online PCs available for bulk action.', 'error');
            return;
        }

        if (window.confirm(`Are you sure you want to run [${commandLabel}] on ALL ${onlinePcs.length} online PCs?`)) {
            onlinePcs.forEach(pc => {
                handleCommand(pc.pc_name, commandType);
            });
            showToast(`Initiating bulk ${commandLabel} on ${onlinePcs.length} PCs`);
            setMobileOpen(false);
        }
    };

    const sidebarContent = (
        <>
            <div className="px-6 flex-1 overflow-y-auto custom-scrollbar space-y-10">
                {/* Navigation Tools */}
                <div>
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 px-2">Navigation</h3>
                    <ul className="space-y-3">
                        <li>
                            <button
                                onClick={() => setCurrentPage('dashboard')}
                                className={`sidebar-button w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all ${currentPage === 'dashboard' ? 'active bg-indigo-500/20 text-indigo-200 border border-indigo-400' : 'text-indigo-400 bg-indigo-500/5 border border-indigo-500/10'}`}
                            >
                                <LayoutDashboard size={20} />
                                <span className="font-bold text-sm">Dashboard</span>
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => setCurrentPage('system')}
                                className={`sidebar-button w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all ${currentPage === 'system' ? 'active bg-sky-500/20 text-sky-200 border border-sky-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                            >
                                <Settings size={20} />
                                <span className="font-bold text-sm">System Prefs</span>
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => setCurrentPage('terminal')}
                                className={`sidebar-button w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all ${currentPage === 'terminal' ? 'active bg-emerald-500/20 text-emerald-200 border border-emerald-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                            >
                                <Terminal size={20} />
                                <span className="font-bold text-sm">Terminal Activity</span>
                            </button>
                        </li>
                    </ul>
                </div>

                {/* Bulk Actions */}
                <div>
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 px-2">Global Commands</h3>
                    <div className="space-y-4">
                        <button 
                            onClick={() => handleBulkCommand('delete_downloads', 'Delete Downloads')}
                            className="w-full clay-btn bg-slate-800 p-5 flex flex-col items-start gap-2 hover:bg-rose-500/10 group"
                        >
                            <Trash2 size={24} className="text-rose-400 group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                                <span className="block text-xs font-black text-white">Wipe Downloads</span>
                                <span className="block text-[9px] text-slate-500 font-bold uppercase mt-1">Clears User Folders</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => handleBulkCommand('empty_recycle', 'Empty Recycle Bin')}
                            className="w-full clay-btn bg-slate-800 p-5 flex flex-col items-start gap-2 hover:bg-amber-500/10 group"
                        >
                            <Recycle size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                                <span className="block text-xs font-black text-white">Empty Trash</span>
                                <span className="block text-[9px] text-slate-500 font-bold uppercase mt-1">Recycle Bin Purge</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => handleBulkCommand('lock', 'Lock Screens')}
                            className="w-full clay-btn bg-indigo-600 p-5 flex flex-col items-start gap-2 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 group"
                        >
                            <Lock size={24} className="text-white group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                                <span className="block text-xs font-black text-white">Lock All PCs</span>
                                <span className="block text-[9px] text-indigo-200/50 font-bold uppercase mt-1">Security Enforcement</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Server Status Footnote */}
            <div className="p-6 lg:p-8 border-t border-white/5">
                <div className="clay-card-flat bg-slate-900/80 p-4 flex items-center gap-4">
                    <div className="pulse-dot-container w-3 h-3 text-emerald-500">
                        <div className="pulse-dot-ring" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white leading-none">Main Hub</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                            <Server size={8} /> 127.0.0.1:8000
                        </span>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button 
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-5 left-5 z-50 p-3 rounded-2xl bg-slate-800/90 backdrop-blur-sm border border-white/10 text-white shadow-lg"
                id="mobile-menu-btn"
            >
                <Menu size={20} />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div 
                    className="lg:hidden fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <aside className={`
                lg:hidden fixed top-0 left-0 z-[80] w-72 h-screen bg-slate-900/95 backdrop-blur-xl border-r border-white/5
                flex flex-col pt-6
                transition-transform duration-300 ease-in-out
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex items-center justify-between px-6 mb-6">
                    <h2 className="text-sm font-black text-white">ICafe Sphere</h2>
                    <button 
                        onClick={() => setMobileOpen(false)}
                        className="p-2 rounded-xl hover:bg-white/5 text-slate-400"
                    >
                        <X size={18} />
                    </button>
                </div>
                {sidebarContent}
            </aside>

            {/* Desktop Sidebar (hidden on mobile) */}
            <aside className="w-72 bg-slate-900/40 backdrop-blur-2xl border-r border-white/5 hidden lg:flex flex-col h-screen fixed left-0 top-0 pt-28">
                {sidebarContent}
            </aside>
        </>
    );
}

export default Sidebar;
