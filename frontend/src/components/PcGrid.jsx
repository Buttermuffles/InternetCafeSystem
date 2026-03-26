import React from 'react';
import PcCard from './PcCard';

/**
 * ============================================================
 * PcGrid Component
 * ============================================================
 * Responsive grid layout for PC monitoring cards.
 */
function PcGrid({ pcs, onLock, onShutdown, onRestart, onMessage, onExecute, onScreenshot, onRecordVideo, onExpand, onWebRTC, onProcesses, selectedPcs, onToggleSelection }) {
    // Sort: online PCs first, then by name
    const sortedPcs = [...pcs].sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.pc_name.localeCompare(b.pc_name);
    });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {sortedPcs.map((pc) => (
                <PcCard
                    key={pc.pc_name}
                    pc={pc}
                    isSelected={selectedPcs.includes(pc.pc_name)}
                    onToggleSelection={() => onToggleSelection(pc.pc_name)}
                    onLock={() => onLock(pc.pc_name)}
                    onShutdown={() => onShutdown(pc.pc_name)}
                    onRestart={() => onRestart(pc.pc_name)}
                    onMessage={() => onMessage(pc.pc_name)}
                    onExecute={() => onExecute(pc.pc_name)}
                    onScreenshot={() => onScreenshot(pc)}
                    onRecordVideo={() => onRecordVideo(pc.pc_name)}
                    onWebRTC={() => onWebRTC(pc.pc_name)}
                    onExpand={() => onExpand(pc)}
                    onProcesses={() => onProcesses(pc.pc_name)}
                />
            ))}
        </div>
    );
}

export default PcGrid;
