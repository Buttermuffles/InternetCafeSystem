import { Monitor, Signal, SignalLow, Cpu, Zap } from 'lucide-react';

function StatsBar({ stats }) {
    const statCards = [
        {
            label: 'Total PCs',
            value: stats.total,
            icon: <Monitor size={22} />,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10'
        },
        {
            label: 'Online',
            value: stats.online,
            icon: <Signal size={22} />,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10'
        },
        {
            label: 'Offline',
            value: stats.offline,
            icon: <SignalLow size={22} />,
            color: 'text-rose-400',
            bg: 'bg-rose-500/10'
        },
        {
            label: 'Avg CPU',
            value: `${stats.avgCpu}%`,
            icon: <Cpu size={22} />,
            color: 'text-sky-400',
            bg: 'bg-sky-500/10'
        },
        {
            label: 'Avg RAM',
            value: `${stats.avgRam}%`,
            icon: <Zap size={22} />,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10'
        },
    ];

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="clay-card-flat p-4 sm:p-5 flex items-center gap-4 sm:gap-5"
                    >
                        <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">
                                {stat.label}
                            </p>
                            <p className={`text-2xl font-black ${stat.color} leading-none`}>
                                {stat.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default StatsBar;
