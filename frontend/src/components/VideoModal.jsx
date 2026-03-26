import React from 'react';
import { Video, X } from 'lucide-react';

function VideoModal({ pcName, videoSrc, isRecording, onClose }) {
    return (
        <div className="premium-modal-overlay" onClick={onClose} id="video-modal">
            <div
                className="premium-modal-content max-w-4xl p-0 overflow-hidden max-w-[95vw] max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                    <div className="flex items-center gap-4 text-emerald-400">
                        <div className="p-3 rounded-2xl bg-emerald-600/10 shadow-inner border border-emerald-600/20">
                            <Video size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white leading-none">Recorded Clip</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                Target: {pcName}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="clay-btn bg-slate-800 text-slate-500 hover:text-white"
                        disabled={isRecording}
                        style={isRecording ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="bg-[#0a0f1d] min-h-[420px] flex items-center justify-center p-4 sm:p-6">
                    {videoSrc ? (
                        <video
                            src={videoSrc}
                            controls
                            autoPlay
                            className="w-full h-auto max-h-[70vh] rounded-xl shadow-2xl"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-200">
                            <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 shadow-inner animate-pulse">
                                <Video size={44} />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-300">
                                {isRecording ? 'Recording... please wait' : 'No clip yet'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tighter">
                                This clip appears here right after the client uploads it.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VideoModal;

