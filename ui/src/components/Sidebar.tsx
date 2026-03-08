import React from 'react';
import { motion } from 'framer-motion';

interface Props {
    activeTab: string;
    onTabChange: (id: string) => void;
    navItems: any[];
    enhancerActive: boolean;
    enhancerRunning: boolean;
    scoutActive: boolean;
    scoutRunning: boolean;
}

const Sidebar: React.FC<Props> = ({ activeTab, onTabChange, navItems, enhancerActive, enhancerRunning, scoutActive, scoutRunning }) => {
    const agentStatuses = [
        { id: 'mcp', label: 'MCP (Coming Soon)', active: true, running: false, color: 'yellow' },
        { id: 'enhancer', label: 'Enhancer Agent', active: enhancerActive, running: enhancerRunning, color: 'blue' },
        { id: 'scout', label: 'Agentic Scout', active: scoutActive, running: scoutRunning, color: 'orange' },
        { id: 'core', label: 'Core Engine', active: true, running: false, color: 'green' }
    ];

    return (
        <aside className="sidebar">
            <div className="logo-section">
                <div className="logo">ENGAGEntic</div>
                <span className="version">v0.2.2-stable</span>
            </div>

            <nav className="side-nav">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => onTabChange(item.id)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                        {activeTab === item.id && <motion.div layoutId="nav-glow" className="nav-glow" />}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="agent-status-stack">
                    {agentStatuses.map(agent => (
                        <div key={agent.id} className="status-indicator agent-status-item">
                            <div className={`dot ${!agent.active ? 'gray' : agent.running ? `${agent.color}-blink` : agent.color}`}></div>
                            <span>{agent.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
