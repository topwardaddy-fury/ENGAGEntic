import React, { useState, useEffect } from 'react';
import { ArrowRight, Code2, User, FileCode, Radar, Trash2, X } from 'lucide-react';

interface Props {
    stats: any;
    onNavigate: (tab: 'standards' | 'profiles' | 'specs' | 'composer') => void;
    onPurgeCommunity: () => Promise<void>;
}

const StatCard = ({ title, value, icon, color = 'indigo' }: any) => (
    <div className={`stat-card ${color}`}>
        <div className="icon-box">{icon}</div>
        <div className="stat-info">
            <span className="label">{title}</span>
            <span className="value">{value}</span>
        </div>
    </div>
);

const glossary = [
    {
        title: 'Profile',
        body: 'The top-level parent record. Defines baseline role identity and behavior. Standards are associated under a Profile.'
    },
    {
        title: 'Standard',
        body: 'A reusable rule set that tells the AI how to behave or format output. Examples: context-safety, structured-output.'
    },
    {
        title: 'Specification',
        body: 'A custom named set consisting of a selected Profile plus its associated Standards. Used to save specific operational configurations.'
    },
    {
        title: 'Workflow',
        body: 'Optional execution guidance for how the AI should approach work step by step.'
    },
];

const ContextDashboard: React.FC<Props> = ({ stats, onNavigate, onPurgeCommunity }) => {
    const [showMission, setShowMission] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [purgingCommunity, setPurgingCommunity] = useState(false);

    useEffect(() => {
        const missionHidden = localStorage.getItem('hide_mission_card');
        if (missionHidden === 'true') setShowMission(false);

        const onboardingHidden = localStorage.getItem('hide_onboarding_card');
        if (onboardingHidden === 'true') setShowOnboarding(false);
    }, []);

    const hideMission = () => {
        localStorage.setItem('hide_mission_card', 'true');
        setShowMission(false);
    };

    const hideOnboarding = () => {
        localStorage.setItem('hide_onboarding_card', 'true');
        setShowOnboarding(false);
    };

    const handlePurgeCommunity = async () => {
        const confirmed = window.confirm('Purge all Community Profiles, Standards, and Specifications? Scout will refill them.');
        if (!confirmed) return;
        setPurgingCommunity(true);
        try {
            await onPurgeCommunity();
        } catch (err) {
            alert((err as Error).message || 'Failed to purge community items');
        } finally {
            setPurgingCommunity(false);
        }
    };

    return (
        <div className="dashboard-grid">
            <StatCard title="Profiles" value={stats.profiles || "0"} icon={<User />} />
            <StatCard title="Standards" value={stats.standards || "0"} icon={<Code2 />} />
            <StatCard title="Specifications" value={stats.specs || "0"} icon={<FileCode />} />
            <div className="stat-card emerald scout-stat-card">
                <button
                    className="scout-purge-btn"
                    onClick={handlePurgeCommunity}
                    title="Purge community items and trigger Scout refill"
                    disabled={purgingCommunity}
                >
                    <Trash2 size={15} />
                </button>
                <div className="icon-box"><Radar /></div>
                <div className="stat-info">
                    <span className="label">Scout</span>
                    <span className="value">
                        {purgingCommunity ? '...' : `${stats.scoutCommunityCount || 0}/${stats.scoutTargetCount || 5}`}
                    </span>
                </div>
            </div>

            {showMission && (
                <div className="card wide-card mission-card relative-card">
                    <button className="close-card-btn" onClick={hideMission} title="Dismiss">
                        <X size={16} />
                    </button>
                    <div className="mission-badge">OPEN SOURCE</div>
                    <h3>Mission Statement</h3>
                    <p>ENGAGEntic is an open-source framework that helps developers build structured operational context for AI systems.</p>
                    <p className="muted">Apply standards, align profiles, and save specifications to ensure reliable AI session behavior.</p>
                </div>
            )}

            {showOnboarding && (
                <div className="card wide-card onboarding-card glass-card relative-card">
                    <button className="close-card-btn" onClick={hideOnboarding} title="Dismiss">
                        <X size={16} />
                    </button>
                    <h3>First Time Here? Start In 4 Steps</h3>
                    <div className="step-grid">
                        <button className="step-card" onClick={() => onNavigate('profiles')}>
                            <span className="step-index">1</span>
                            <span className="step-title">Create a Profile</span>
                            <span className="step-body">Define the baseline role identity and behavior.</span>
                            <ArrowRight size={16} />
                        </button>
                        <button className="step-card" onClick={() => onNavigate('standards')}>
                            <span className="step-index">2</span>
                            <span className="step-title">Add one or more Standards</span>
                            <span className="step-body">Apply reusable rule sets that guide behavior.</span>
                            <ArrowRight size={16} />
                        </button>
                        <button className="step-card" onClick={() => onNavigate('composer')}>
                            <span className="step-index">3</span>
                            <span className="step-title">Create a Specification</span>
                            <span className="step-body">Create a Specification from a Profile and Standards.</span>
                            <ArrowRight size={16} />
                        </button>
                        <button className="step-card" onClick={() => onNavigate('composer')}>
                            <span className="step-index">4</span>
                            <span className="step-title">Save your Specification</span>
                            <span className="step-body">Save your custom compilation in the Composer UI.</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="card wide-card glossary-card glass-card">
                <h3>Core Definitions</h3>
                <div className="glossary-grid">
                    {glossary.filter(item => item.title !== 'Workflow').map((item) => (
                        <article key={item.title} className="glossary-item">
                            <h4>{item.title}</h4>
                            <p>{item.body}</p>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ContextDashboard;
