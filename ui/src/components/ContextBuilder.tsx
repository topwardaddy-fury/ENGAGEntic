import React from 'react';
import { Layers, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    profiles: any[];
    standards: any[];
    specs: any[];
    workflows: any[];
    selections: {
        profile: string;
        standards: string[];
        spec: string;
        workflow: string;
        task: string;
    };
    onChange: (selections: any) => void;
}

const ContextBuilder: React.FC<Props> = ({ profiles, standards, specs, workflows, selections, onChange }) => {

    const toggleStandard = (id: string) => {
        const newStandards = selections.standards.includes(id)
            ? selections.standards.filter(s => s !== id)
            : [...selections.standards, id];
        onChange({ ...selections, standards: newStandards });
    };

    return (
        <div className="composer-panel glass-card">
            <header className="panel-header">
                <Layers size={18} className="primary-icon" />
                <h3>Composer</h3>
            </header>

            <div className="builder-scroll">
                <div className="form-group">
                    <label>Profile (Parent Record)</label>
                    <div className="select-wrapper">
                        <select
                            title="Primary Role Profile"
                            value={selections.profile}
                            onChange={(e) => onChange({ ...selections, profile: e.target.value })}
                        >
                            <option value="">-- Choose Role Profile --</option>
                            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <ChevronDown className="select-chevron" size={16} />
                    </div>
                </div>

                <div className="form-group">
                    <label>Standards (Children)</label>
                    <div className="standards-group">
                        <div className="standards-category-header">CORE STANDARDS</div>
                        <div className="checkbox-grid">
                            {standards.filter(s => !s.is_community).map(s => (
                                <button
                                    key={s.id}
                                    className={`checkbox-item ${selections.standards.includes(s.id) ? 'checked' : ''}`}
                                    onClick={() => toggleStandard(s.id)}
                                >
                                    {selections.standards.includes(s.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                    <span>{s.title || s.name || s.id}</span>
                                </button>
                            ))}
                        </div>

                        <div className="standards-category-header" style={{ marginTop: '15px' }}>COMMUNITY STANDARDS</div>
                        <div className="checkbox-grid">
                            {standards.filter(s => s.is_community).map(s => (
                                <button
                                    key={s.id}
                                    className={`checkbox-item ${selections.standards.includes(s.id) ? 'checked' : ''}`}
                                    onClick={() => toggleStandard(s.id)}
                                >
                                    {selections.standards.includes(s.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                    <span>{s.title || s.name || s.id} <span style={{ fontSize: '0.75rem', opacity: 0.7, paddingLeft: 4 }}>(Community)</span></span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContextBuilder;
