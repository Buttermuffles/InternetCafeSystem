import React, { useState, useEffect } from 'react';

function SystemPrefs({ onThemeChange }) {
    const [pollInterval, setPollInterval] = useState(8000);
    const [theme, setTheme] = useState('dark');
    const [showOffline, setShowOffline] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setPollInterval(parseInt(localStorage.getItem('icafe_poll_interval') || '8000', 10));
        setTheme(localStorage.getItem('icafe_theme') || 'dark');
        setShowOffline(localStorage.getItem('icafe_show_offline') !== 'false');
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        localStorage.setItem('icafe_poll_interval', String(pollInterval));
        localStorage.setItem('icafe_theme', theme);
        localStorage.setItem('icafe_show_offline', String(showOffline));
        setMessage('System preferences saved locally. Reload to apply.');
        if (onThemeChange) onThemeChange(theme);
    };

    return (
        <div className="w-full mx-auto p-6">
            <div className="clay-card-flat bg-slate-900/70 border border-white/10 p-6 w-full">
                <h2 className="text-xl font-black text-white mb-2">System Preferences</h2>
                <p className="text-sm text-slate-300 mb-6">Configure connection and realtime settings for the dashboard.</p>

                <form className="space-y-4" onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Polling interval (ms)</label>
                            <input
                                type="number"
                                value={pollInterval}
                                onChange={(e) => setPollInterval(Number(e.target.value))}
                                className="w-full mt-1 p-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
                                min={1000}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Theme</label>
                            <select
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                className="w-full mt-1 p-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
                            >
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Show Offline PCs</label>
                            <select
                                value={showOffline ? 'show' : 'hide'}
                                onChange={(e) => setShowOffline(e.target.value === 'show')}
                                className="w-full mt-1 p-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
                            >
                                <option value="show">Show</option>
                                <option value="hide">Hide</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="mt-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg font-black text-white uppercase tracking-wide">
                        Save Preferences
                    </button>
                </form>

                {message && <p className="mt-4 text-sm text-emerald-400">{message}</p>}
            </div>
        </div>
    );
}

export default SystemPrefs;
