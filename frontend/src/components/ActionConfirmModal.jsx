import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, MessageSquare, Power, Lock, RotateCcw } from 'lucide-react';

/**
 * ============================================================
 * ActionConfirmModal - Custom Premium Dialog
 * ============================================================
 * Replaces window.confirm/prompt with a rich, themed experience.
 */
function ActionConfirmModal({ 
    type, 
    pcCount, 
    onConfirm, 
    onCancel, 
    title, 
    description, 
    requiresInput = false,
    inputPlaceholder = "Enter message...",
    confirmText = "Continue",
    tone = "indigo"
}) {
    const [inputValue, setInputValue] = useState('');

    const toneMap = {
        indigo: 'bg-indigo-500 text-white shadow-indigo-500/20',
        rose: 'bg-rose-500 text-white shadow-rose-500/20',
        amber: 'bg-amber-500 text-white shadow-amber-500/20',
        violet: 'bg-violet-500 text-white shadow-violet-500/20',
    };

    const iconMap = {
        lock: <Lock size={24} />,
        message: <MessageSquare size={24} />,
        shutdown: <Power size={24} />,
        restart: <RotateCcw size={24} />,
        alert: <ShieldAlert size={24} />
    };

    return (
        <div className="premium-modal-overlay" onClick={onCancel}>
            <div className="premium-modal-content w-full max-w-md p-8 text-center" onClick={e => e.stopPropagation()}>
                <div className={`mx-auto w-16 h-16 rounded-3xl flex items-center justify-center mb-6 border border-white/10 ${toneMap[tone]}`}>
                    {iconMap[type] || iconMap.alert}
                </div>

                <h3 className="text-2xl font-black text-white tracking-tight mb-2 uppercase">{title}</h3>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-4">
                    Targeting {pcCount} active {pcCount === 1 ? 'Station' : 'Stations'}
                </p>
                <p className="text-xs text-slate-400 font-bold leading-relaxed mb-8 px-4">
                    {description}
                </p>

                {requiresInput && (
                    <div className="mb-8 px-4">
                        <textarea
                            autoFocus
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={inputPlaceholder}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none font-bold placeholder:text-slate-600"
                        />
                    </div>
                )}

                <div className="flex gap-4 px-4">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onConfirm(inputValue)}
                        className={`flex-1 py-4 rounded-2xl ${toneMap[tone]} text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-xl transition-all active:scale-95`}
                    >
                        {confirmText}
                    </button>
                </div>
                
                <button onClick={onCancel} className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}

export default ActionConfirmModal;
