import React, { useEffect } from 'react';
import { Maximize2, X, Monitor, Cpu, Zap } from 'lucide-react';

function ScreenshotModal({ pc, onClose }) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!pc) return null;
    const hasScreenshot = typeof pc.screenshot === 'string';

    return (
        <div className="premium-modal-overlay" onClick={onClose} id="screenshot-modal">
            <div 
                className="relative w-full max-w-6xl clay-card overflow-hidden shadow-2xl p-0 max-w-[95vw] max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                            <Maximize2 size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white leading-none">Live Monitor</h3>
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">System: {pc.pc_name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="clay-btn bg-white/10 text-white backdrop-blur-md border border-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Screenshot Area */}
                <div className="bg-[#0a0f1d] min-h-[320px] flex items-center justify-center">
                    {hasScreenshot ? (
                        <img
                            src={pc.screenshot}
                            alt={`${pc.pc_name} observation`}
                            className="w-full h-auto max-h-[85vh] object-contain shadow-2xl"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-10 sm:p-20 text-slate-600">
                             <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 shadow-inner animate-pulse">
                                <Monitor size={40} />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest">No Signal Received</p>
                            <p className="text-[10px] font-bold text-slate-700 mt-2 uppercase tracking-tighter">Awaiting agent heartbeat...</p>
                        </div>
                    )}
                </div>

                {/* Info Bar Overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                    <div className="clay-card-flat bg-black/60 backdrop-blur-xl px-8 py-4 flex items-center gap-8 border border-white/10">
                        <div className="flex items-center gap-3">
                            <Cpu size={14} className="text-sky-400" />
                            <span className="text-[11px] font-black text-white">{parseFloat(pc.cpu_usage || 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-3">
                            <Zap size={14} className="text-violet-400" />
                            <span className="text-[11px] font-black text-white">{parseFloat(pc.ram_usage || 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                         <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${pc.status === 'online' ? 'bg-emerald-500 pulse-dot' : 'bg-rose-500'}`} />
                            <span className="text-[11px] font-black text-white uppercase tracking-widest">{pc.status}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ScreenshotModal;
