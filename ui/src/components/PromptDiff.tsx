import React, { useState, useEffect } from 'react';
import { SplitSquareVertical, RefreshCw } from 'lucide-react';
import { apiUrl } from '../lib/api';

const PromptDiff: React.FC = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [leftSessionId, setLeftSessionId] = useState('');
    const [rightSessionId, setRightSessionId] = useState('');
    const [leftContent, setLeftContent] = useState('');
    const [rightContent, setRightContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchHistory = async () => {
        const res = await fetch(apiUrl('/sessions'));
        if (res.ok) setSessions(await res.json());
        else setSessions([]);
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchContent = async (id: string, side: 'left' | 'right') => {
        setIsLoading(true);
        const res = await fetch(apiUrl(`/sessions/${id}`));
        if (res.ok) {
            const data = await res.json();
            if (side === 'left') setLeftContent(data.assembled_prompt);
            else setRightContent(data.assembled_prompt);
        }
        setIsLoading(false);
    };

    return (
        <div className="diff-view">
            <header className="studio-header">
                <h3>Prompt Improvement Analysis</h3>
                <p>Compare two session contexts to visualize improvements in standards alignment and specification quality.</p>
                <button className="primary-btn outline" onClick={() => {
                    fetchHistory();
                    setLeftSessionId('');
                    setRightSessionId('');
                    setLeftContent('');
                    setRightContent('');
                }}>
                    <RefreshCw size={16} /> Reset
                </button>
            </header>

            <div className="diff-controls">
                <div className="session-selector glass-card">
                    <label>Base Session (Version 1)</label>
                    <select
                        value={leftSessionId}
                        onChange={(e) => { setLeftSessionId(e.target.value); fetchContent(e.target.value, 'left'); }}
                    >
                        <option value="">-- Choose V1 --</option>
                        {sessions.map(s => <option key={s.id} value={s.id}>{new Date(s.created_at).toLocaleString()}</option>)}
                    </select>
                </div>
                <div className="diff-icon"><SplitSquareVertical size={24} /></div>
                <div className="session-selector glass-card">
                    <label>Comparison Session (Version 2)</label>
                    <select
                        value={rightSessionId}
                        onChange={(e) => { setRightSessionId(e.target.value); fetchContent(e.target.value, 'right'); }}
                    >
                        <option value="">-- Choose V2 --</option>
                        {sessions.map(s => <option key={s.id} value={s.id}>{new Date(s.created_at).toLocaleString()}</option>)}
                    </select>
                </div>
            </div>

            <div className="diff-content-grid">
                <div className="content-panel left glass-card">
                    <div className="panel-label">V1 - Baseline</div>
                    <pre>{leftContent || (isLoading ? 'Loading session...' : 'Select a session to begin analysis.')}</pre>
                </div>
                <div className="content-panel right glass-card">
                    <div className="panel-label">V2 - Iteration</div>
                    <pre>{rightContent || (isLoading ? 'Loading session...' : 'Select a session to begin analysis.')}</pre>
                </div>
            </div>
        </div>
    );
};

export default PromptDiff;
