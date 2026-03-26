import React from 'react';

function TerminalActivity({ terminalLogs, onClear }) {
    return (
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 pb-6">
            <div className="clay-card-flat bg-slate-900/70 border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">Terminal Activity</h2>
                    <button
                        onClick={onClear}
                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-black uppercase rounded-lg"
                    >
                        Clear
                    </button>
                </div>
                <div className="bg-black/30 rounded-xl p-3 h-[420px] overflow-y-auto border border-white/10">
                    {terminalLogs.length === 0 ? (
                        <p className="text-sm text-slate-500">No activity yet.</p>
                    ) : (
                        <ul className="space-y-1 text-[11px] font-mono text-slate-300">
                            {terminalLogs.map((log, idx) => (
                                <li key={idx} className="flex justify-between gap-2">
                                    <span className="text-slate-400">[{log.timestamp}]</span>
                                    <span className="truncate">{log.entry}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TerminalActivity;
