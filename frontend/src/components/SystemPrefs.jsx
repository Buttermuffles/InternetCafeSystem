import React, { useState, useEffect } from 'react';

function SystemPrefs() {
    const [apiUrl, setApiUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [pollInterval, setPollInterval] = useState(8000);
    const [pusherKey, setPusherKey] = useState('');
    const [pusherCluster, setPusherCluster] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        setApiUrl(localStorage.getItem('icafe_api_url') || '');
        setApiKey(localStorage.getItem('icafe_api_key') || '');
        setPollInterval(parseInt(localStorage.getItem('icafe_poll_interval') || '8000', 10));
        setPusherKey(localStorage.getItem('icafe_pusher_key') || '');
        setPusherCluster(localStorage.getItem('icafe_pusher_cluster') || '');
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        localStorage.setItem('icafe_api_url', apiUrl);
        localStorage.setItem('icafe_api_key', apiKey);
        localStorage.setItem('icafe_poll_interval', String(pollInterval));
        localStorage.setItem('icafe_pusher_key', pusherKey);
        localStorage.setItem('icafe_pusher_cluster', pusherCluster);
        setMessage('System preferences saved locally. Reload to apply.');
    };

    return (
        <div className="max-w-[1100px] mx-auto p-6">
            <div className="clay-card-flat bg-slate-900/70 border border-white/10 p-6">
                <h2 className="text-xl font-black text-white mb-2">System Preferences</h2>
                <p className="text-sm text-slate-300 mb-6">Configure connection and realtime settings for the dashboard.</p>

                <form className="space-y-4" onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Backend API URL</label>
                            <input
                                value={apiUrl}
                                onChange={(e) => setApiUrl(e.target.value)}
                                className="w-full mt-1 p-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
                                placeholder="http://192.168.1.100:8000"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase tracking-wider text-slate-400">API Key</label>
                            <input
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full mt-1 p-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
                                placeholder="icafe-monitor-api-key-..."
                            />
                        </div>
                        <div>
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
                            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Pusher key</label>
                            <input
                                value={pusherKey}
                                onChange={(e) => setPusherKey(e.target.value)}
                                className="w-full mt-1 p-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
                                placeholder="28728c9b9070d8da40a3"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Pusher cluster</label>
                            <input
                                value={pusherCluster}
                                onChange={(e) => setPusherCluster(e.target.value)}
                                className="w-full mt-1 p-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
                                placeholder="ap1"
                            />
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
