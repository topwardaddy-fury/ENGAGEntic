import React from 'react';
import { Plus, FileCode, Trash2 } from 'lucide-react';
import { downloadSpecTemplate } from '../lib/templates';
import { apiUrl } from '../lib/api';

interface Props {
    templates: any[];
    onNavigateToComposer: () => void;
    onUseInComposer?: (spec: any) => void;
    onRefresh: () => void;
}

const SpecificationsList: React.FC<Props> = ({ templates, onNavigateToComposer, onUseInComposer, onRefresh }) => {
    const isCommunitySpec = (spec: any): boolean => {
        const tags = Array.isArray(spec?.tags)
            ? spec.tags.map((t: any) => String(t).trim().toLowerCase())
            : typeof spec?.tags === 'string'
                ? spec.tags.split(',').map((t: string) => t.trim().toLowerCase())
                : [];
        const category = String(spec?.category || '').toLowerCase();
        const source = String(spec?.source || '').toLowerCase();
        return tags.includes('community') || category === 'community' || source === 'scout';
    };
    const manualSpecs = templates.filter((spec) => !isCommunitySpec(spec));
    const communitySpecs = templates.filter((spec) => isCommunitySpec(spec));

    const handleDelete = async (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this specification?')) return;
        try {
            const res = await fetch(apiUrl(`/specifications/${path}`), { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            onRefresh();
        } catch (err) {
            alert('Error deleting specification: ' + (err as Error).message);
        }
    };

    return (
        <div className="studio-container specs-layout">
            <div className="studio-header">
                <div>
                    <h3>Previously Saved Configurations</h3>
                    <p>List of previously saved Profile + Standards named custom sets.</p>
                </div>
                <button className="primary-btn" onClick={() => {
                    downloadSpecTemplate();
                    onNavigateToComposer();
                }}>
                    <Plus size={18} /> Compose New Specification
                </button>
            </div>
            {manualSpecs.length > 0 && (
                <section className="library-section">
                    <div className="standards-category-header">User Specifications</div>
                    <div className="item-grid">
                        {manualSpecs.map(s => (
                            <button
                                key={s.id}
                                className="item-card-btn glass-card"
                                onClick={() => onUseInComposer && onUseInComposer(s)}
                            >
                                <div className="card-header">
                                    <span />
                                    <button className="icon-btn icon-btn-danger card-delete-btn" title="Delete Specification" onClick={(e) => handleDelete(e, s.path)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <h4>{s.name}</h4>
                                <p>{s.description || "Aggregated Profile + Standards operational set."}</p>
                                <div className="card-footer">
                                    <span>Markdown Spec v1.1-stable</span>
                                    <FileCode size={16} />
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}
            {manualSpecs.length > 0 && communitySpecs.length > 0 && <div className="section-divider" />}
            {communitySpecs.length > 0 && (
                <section className="library-section">
                    <div className="standards-category-header">Community Specifications</div>
                    <div className="item-grid">
                        {communitySpecs.map(s => (
                            <button
                                key={s.id}
                                className="item-card-btn glass-card"
                                onClick={() => onUseInComposer && onUseInComposer(s)}
                            >
                                <div className="card-header">
                                    <span className="community-badge">Community</span>
                                    <button className="icon-btn icon-btn-danger card-delete-btn" title="Delete Specification" onClick={(e) => handleDelete(e, s.path)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <h4>{s.name}</h4>
                                <p>{s.description || "Aggregated Profile + Standards operational set."}</p>
                                <div className="card-footer">
                                    <span>Markdown Spec v1.1-stable</span>
                                    <FileCode size={16} />
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default SpecificationsList;
