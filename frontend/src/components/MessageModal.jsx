import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

function MessageModal({ pcName, onSend, onClose }) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const inputRef = useRef(null);
    const sendingRef = useRef(false);
    const mountedRef = useRef(true);

    // Auto-focus the input when modal opens
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (sendingRef.current || isSending) return;
        if (message.trim()) {
            const text = message.trim();
            const ok = window.confirm(`Send this message to ${pcName}?\n\n"${text}"`);
            if (!ok) return;
            sendingRef.current = true;
            setIsSending(true);
            Promise.resolve(onSend(pcName, text)).finally(() => {
                // If parent closes the modal immediately, component may unmount.
                // This is safe; React will ignore state updates after unmount in most setups.
                sendingRef.current = false;
                if (mountedRef.current) setIsSending(false);
            });
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
        <div className="premium-modal-overlay" onClick={onClose} id="message-modal">
            <div className="premium-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4 text-violet-400">
                        <div className="p-3 rounded-2xl bg-violet-600/10 shadow-inner border border-violet-600/20">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white leading-none">Global Messenger</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Channel: {pcName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="clay-btn bg-slate-800 text-slate-500 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <textarea
                            ref={inputRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type a priority command or user alert..."
                            className="w-full h-36 p-5 bg-black/30 border border-white/5 rounded-[1.5rem] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none transition-all shadow-inner"
                            id="message-input"
                            disabled={isSending}
                        />
                        <div className="absolute bottom-4 right-4 text-[9px] font-black text-slate-700 uppercase tracking-widest pointer-events-none">
                            Broadcast Active
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                         <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                            Secure Transmit
                         </span>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 text-xs font-black text-slate-500 hover:text-white transition-colors"
                            >
                                ABORT
                            </button>
                            <button
                                type="submit"
                                disabled={!message.trim() || isSending}
                                className="clay-btn bg-violet-600 px-8 py-3 text-white disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-3 shadow-lg shadow-violet-600/20"
                                id="btn-send-message"
                            >
                                <span className="text-xs font-black uppercase tracking-widest">Dispatch</span>
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default MessageModal;
