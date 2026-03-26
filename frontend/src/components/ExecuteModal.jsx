import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Play, X, ChevronRight } from 'lucide-react';

function ExecuteModal({ pcName, onExecute, onClose }) {
    const [command, setCommand] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const inputRef = useRef(null);

    const presets = [
        { label: 'System Info', cmd: 'systeminfo' },
        { label: 'List Tasks', cmd: 'tasklist' },
        { label: 'IP Config', cmd: 'ipconfig /all' },
        { label: 'Net Connections', cmd: 'netstat -an' },
    ];

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (command.trim()) {
            setIsExecuting(true);
            onExecute(pcName, command.trim());
        }
    };

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="premium-modal-overlay" onClick={onClose}>
            <div className="premium-modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4 text-emerald-400">
                        <div className="p-3 rounded-2xl bg-emerald-600/10 shadow-inner border border-emerald-600/20">
                            <Terminal size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white leading-none">Remote Terminal</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Target: {pcName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="clay-btn bg-slate-800 text-slate-500 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-8">
                    {/* Presets */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {presets.map((p) => (
                            <button
                                key={p.label}
                                onClick={() => setCommand(p.cmd)}
                                className="clay-card-flat p-3 text-left hover:bg-emerald-500/10 group transition-all"
                            >
                                <span className="block text-[8px] font-black text-slate-600 uppercase tracking-tighter mb-1">Preset</span>
                                <span className="block text-[10px] font-black text-white group-hover:text-emerald-400 truncate">{p.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Console Input */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative group">
                            <div className="absolute left-4 top-5 text-emerald-500/50">
                                <ChevronRight size={20} className="animate-pulse" />
                            </div>
                            <textarea
                                ref={inputRef}
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder="Enter shell command..."
                                className="w-full h-32 p-5 pl-12 bg-black/50 border border-white/5 rounded-[1.5rem] font-mono text-xs text-emerald-400 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">Linked Control</span>
                             </div>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-3 text-xs font-black text-slate-500 hover:text-white"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={!command.trim() || isExecuting}
                                    className="clay-btn bg-emerald-600 px-8 py-3 text-white disabled:opacity-30 flex items-center gap-3 shadow-lg shadow-emerald-600/20"
                                >
                                    <span className="text-xs font-black uppercase tracking-widest">Execute</span>
                                    <Play size={16} />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ExecuteModal;
