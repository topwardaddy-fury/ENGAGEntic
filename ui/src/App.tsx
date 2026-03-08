import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FileText, User, Activity, Terminal, Code2,
    FileCode, SplitSquareVertical, MessageSquareCode
} from 'lucide-react'

// Layout & Components
import Sidebar from './components/Sidebar';
import ContextDashboard from './components/Dashboard';
import StandardsStudio from './components/Standards';
import ProfileArchitect from './components/Profiles';
import SpecificationBuilder from './components/Specs';
import ContextComposer from './components/Composer';
import PromptDiff from './components/PromptDiff';
import { apiUrl } from './lib/api';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [standards, setStandards] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [specs, setSpecs] = useState<any[]>([]);
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [sessionsCount, setSessionsCount] = useState(0);
    const [enhancerActive, setEnhancerActive] = useState(false);
    const [enhancerRunning, setEnhancerRunning] = useState(false);
    const [scoutActive, setScoutActive] = useState(false);
    const [scoutRunning, setScoutRunning] = useState(false);
    const [scoutCommunityCount, setScoutCommunityCount] = useState(0);
    const [scoutTargetCount, setScoutTargetCount] = useState(5);
    const [isLoading, setIsLoading] = useState(true);
    const [composerSelections, setComposerSelections] = useState<{
        profile: string;
        standards: string[];
        spec: string;
        workflow: string;
        task: string;
    }>({
        profile: '',
        standards: [],
        spec: '',
        workflow: '',
        task: ''
    });

    const fetchItems = async () => {
        try {
            const results = await Promise.allSettled([
                fetch(apiUrl('/standards')),
                fetch(apiUrl('/profiles')),
                fetch(apiUrl('/specifications')),
                fetch(apiUrl('/workflows')),
                fetch(apiUrl('/sessions'))
            ]);

            if (results[0].status === 'fulfilled' && results[0].value.ok) setStandards(await results[0].value.json());
            if (results[1].status === 'fulfilled' && results[1].value.ok) setProfiles(await results[1].value.json());
            if (results[2].status === 'fulfilled' && results[2].value.ok) setSpecs(await results[2].value.json());
            if (results[3].status === 'fulfilled' && results[3].value.ok) setWorkflows(await results[3].value.json());
            if (results[4].status === 'fulfilled' && results[4].value.ok) {
                const sessions = await results[4].value.json();
                setSessionsCount(Array.isArray(sessions) ? sessions.length : 0);
            }
        } catch (err) {
            console.error("Context Connectivity issue:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEnhancerHealth = async () => {
        try {
            const res = await fetch(apiUrl('/agents/enhancer/health'), { cache: 'no-store' });
            if (res.status === 304) {
                return;
            }
            if (!res.ok) {
                setEnhancerActive(false);
                return;
            }
            const data = await res.json();
            setEnhancerActive(Boolean(data?.enhancer_active));
        } catch {
            setEnhancerActive(false);
        }
    };

    const fetchScoutHealth = async () => {
        try {
            const res = await fetch(apiUrl('/agents/scout/health'), { cache: 'no-store' });
            if (res.status === 304) {
                return;
            }
            if (!res.ok) {
                setScoutActive(false);
                setScoutRunning(false);
                return;
            }
            const data = await res.json();
            const enabled = Boolean(data?.scout_enabled);
            const deficit = Number(data?.deficit || 0);
            const target = Number(data?.scout_target_count || 5);
            const community = Number(data?.community_spec_count || 0);
            setScoutActive(enabled);
            setScoutTargetCount(target);
            setScoutCommunityCount(community);
            // Blink while actively running OR while a deficit exists (< target community specs).
            setScoutRunning(Boolean(data?.scout_running) || (enabled && deficit > 0));
        } catch {
            setScoutActive(false);
            setScoutRunning(false);
        }
    };

    const purgeCommunityItems = async () => {
        try {
            const res = await fetch(apiUrl('/community/purge'), { method: 'POST' });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload?.error || 'Failed to purge community items');
            }
            await fetchItems();
            await fetchScoutHealth();
        } catch (err) {
            console.error('Community purge failed:', err);
            throw err;
        }
    };

    useEffect(() => {
        fetchItems();
        fetchEnhancerHealth();
        fetchScoutHealth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            fetchEnhancerHealth();
            fetchScoutHealth();
        }, 15000);

        return () => {
            window.clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            fetchItems();
        }, 10000);

        return () => {
            window.clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!scoutActive) return;
        fetchItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scoutCommunityCount, scoutRunning, scoutActive]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <Activity size={20} /> },
        { id: 'profiles', label: 'Profiles', icon: <User size={20} /> },
        { id: 'standards', label: 'Standards', icon: <FileText size={20} /> },
        { id: 'specs', label: 'Specifications', icon: <FileCode size={20} /> },
        { id: 'composer', label: 'Composer', icon: <Terminal size={20} /> },
    ];

    if (isLoading) return <LoadingScreen />;

    return (
        <div className="layout">
            <Sidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                navItems={navItems}
                enhancerActive={enhancerActive}
                enhancerRunning={enhancerRunning}
                scoutActive={scoutActive}
                scoutRunning={scoutRunning}
            />

            <main className="main-content">
                <header className="page-header">
                    <div className="header-title">
                        <h1>{navItems.find(i => i.id === activeTab)?.label}</h1>
                        <p className="subtitle">ENGAGEntic Platform v0.2.2-stable | Build operational context for AI.</p>
                    </div>
                </header>

                <div className="content-scroller">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="tab-content"
                        >
                            {activeTab === 'dashboard' && <ContextDashboard
                                stats={{
                                    standards: standards.length,
                                    profiles: profiles.length,
                                    specs: specs.length,
                                    workflows: workflows.length,
                                    sessions: sessionsCount,
                                    scoutCommunityCount,
                                    scoutTargetCount,
                                    scoutRunning
                                }}
                                onNavigate={(tab: any) => setActiveTab(tab)}
                                onPurgeCommunity={purgeCommunityItems}
                            />}
                            {activeTab === 'standards' && <StandardsStudio
                                items={standards}
                                onNavigateToComposer={() => setActiveTab('composer')}
                                onUseInComposer={(standardId: string) => {
                                    setComposerSelections((prev: any) => ({
                                        ...prev,
                                        standards: prev.standards.includes(standardId)
                                            ? prev.standards
                                            : [...prev.standards, standardId]
                                    }));
                                    setActiveTab('composer');
                                }}
                                onRefresh={fetchItems}
                                onEnhancerBusyChange={setEnhancerRunning}
                            />}
                            {activeTab === 'profiles' && <ProfileArchitect
                                profiles={profiles}
                                onNavigateToComposer={() => setActiveTab('composer')}
                                onUseInComposer={(profileId: string) => {
                                    setComposerSelections((prev: any) => ({
                                        ...prev,
                                        profile: profileId
                                    }));
                                    setActiveTab('composer');
                                }}
                                onRefresh={fetchItems}
                                onEnhancerBusyChange={setEnhancerRunning}
                            />}
                            {activeTab === 'specs' && <SpecificationBuilder
                                templates={specs}
                                onNavigateToComposer={() => setActiveTab('composer')}
                                onUseInComposer={(spec: any) => {
                                    setComposerSelections((prev: any) => ({
                                        ...prev,
                                        profile: spec.profile || prev.profile,
                                        standards: spec.standards || prev.standards,
                                        spec: spec.name
                                    }));
                                    setActiveTab('composer');
                                }}
                                onRefresh={fetchItems}
                            />}
                            {activeTab === 'workflows' && <Placeholder title="Workflows" desc="Operational sequence definitions for complex tasks." />}
                            {activeTab === 'composer' && <ContextComposer
                                profiles={profiles}
                                specs={specs}
                                standards={standards}
                                initialSelections={composerSelections}
                                onSelectionsChange={setComposerSelections}
                                onNavigateToDiff={() => setActiveTab('diff')}
                                onNavigateToSpecs={() => setActiveTab('specs')}
                                onRefresh={fetchItems}
                            />}
                            {activeTab === 'diff' && <PromptDiff />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

const LoadingScreen = () => (
    <div className="loading-screen">
        <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="loader"
        />
        <p>Loading ENGAGEntic Engine...</p>
    </div>
);

const Placeholder = ({ title, desc }: any) => (
    <div className="placeholder-content">
        <div className="illustration-box">
            <MessageSquareCode size={48} />
        </div>
        <h2>{title} coming soon</h2>
        <p>{desc}</p>
        <button className="outline-btn">Documentation</button>
    </div>
);

export default App;
