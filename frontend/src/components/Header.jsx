import { Activity, Clock, ShieldCheck, AlertCircle, Monitor } from 'lucide-react';

function Header({ lastUpdate, error }) {
    const formatTime = (date) => {
        if (!date) return '--:--:--';
        return date.toLocaleTimeString('en-US', { hour12: true });
    };

    return (
        <header className="sticky top-0 z-40 p-4">
            <div className="max-w-[1700px] mx-auto">
                <div className="clay-card-flat px-8 h-20 flex items-center justify-between backdrop-blur-md bg-slate-900/60 transition-all duration-500 border-b border-white/5">
                    {/* Brand */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shadow-inner">
                            <Activity className="text-white animate-pulse" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight leading-none">
                                ICafe <span className="text-indigo-400">Sphere</span>
                                <span className="ml-2 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse uppercase tracking-widest">Live</span>
                            </h1>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">
                                Command Center v2.0
                            </p>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 sm:gap-6">
                        {/* Live Monitoring Badge */}
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-widest text-[9px]">
                            <Monitor size={12} className="animate-pulse" />
                            Live CCTV Stream Active
                        </div>

                        {/* Sync Time */}
                        <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/20 shadow-inner border border-white/5">
                            <Clock size={14} className="text-slate-500" />
                            <span className="text-xs font-mono font-bold text-slate-400">
                                {formatTime(lastUpdate)}
                            </span>
                        </div>

                        {/* Connection Status */}
                        <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl shadow-inner border border-white/5 ${
                            error
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                            {error ? <AlertCircle size={16} /> : <ShieldCheck size={16} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {error ? 'System Down' : 'Secure Connection'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
