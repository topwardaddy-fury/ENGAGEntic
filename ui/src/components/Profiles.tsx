import React, { useState } from 'react';
import { User, Plus, ArrowLeft, ExternalLink, FileText, Trash2, Save, Copy, Sparkles, RotateCcw } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { apiUrl } from '../lib/api';

interface Profile {
    id: string;
    path: string;          // actual filename on disk, e.g. engineering-assistant.md
    name: string;
    description?: string;
    standards?: string[];
    default_workflow?: string;
    is_community?: boolean;
    raw_content?: string;
    markdown_content: string;
}

interface Props {
    profiles: Profile[];
    onNavigateToComposer: () => void;
    onUseInComposer: (profileId: string) => void;
    onRefresh: () => void;
    onEnhancerBusyChange?: (busy: boolean) => void;
}

const NEW_PROFILE_TEMPLATE = `---
id: new-profile
name: New Profile
description: Baseline identity and behavior for a specific AI role.
standards:
  - prompt-engineering/structured-output.md
default_workflow: code-implementation.md
---

This profile defines the default role behavior, tone, and operational preferences.
`;

type View = 'grid' | 'detail' | 'editor';

function extractIdFromContent(content: string, fallback: string): string {
    const match = content.match(/^id:\s*(.+)$/m);
    return match ? match[1].trim() : fallback;
}

const ProfileArchitect: React.FC<Props> = ({ profiles, onNavigateToComposer, onUseInComposer, onRefresh, onEnhancerBusyChange }) => {
    const [view, setView] = useState<View>('grid');
    const [selected, setSelected] = useState<Profile | null>(null);
    const [editorContent, setEditorContent] = useState(NEW_PROFILE_TEMPLATE);
    const [isSaving, setIsSaving] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [enhanceError, setEnhanceError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [lastEditorSnapshot, setLastEditorSnapshot] = useState('');
    const [lastEnhancerModel, setLastEnhancerModel] = useState('');

    const isEditing = view === 'editor' && selected !== null;
    const manualProfiles = profiles.filter((p) => !p.is_community);
    const communityProfiles = profiles.filter((p) => p.is_community);

    const showSuccess = (msg: string) => {
        setSaveSuccess(msg);
        onRefresh();                          // refresh data immediately
        setTimeout(() => {
            setSaveSuccess('');
            setView('grid');                  // auto-navigate back after 2s
        }, 2000);
    };

    const openDetail = (p: Profile) => {
        setSelected(p);
        setConfirmDelete(false);
        setView('detail');
    };

    const openNewEditor = () => {
        setSelected(null);
        setEditorContent(NEW_PROFILE_TEMPLATE);
        setSaveError('');
        setEnhanceError('');
        setSaveSuccess('');
        setLastEnhancerModel('');
        setView('editor');
    };

    const openEditEditor = () => {
        if (!selected) return;
        setEditorContent(selected.raw_content || `---\nid: ${selected.id}\nname: ${selected.name}\ndescription: ${selected.description || ''}\n---\n\n${selected.markdown_content}`);
        setSaveError('');
        setEnhanceError('');
        setSaveSuccess('');
        setLastEnhancerModel('');
        setView('editor');
    };

    const handleEnhance = async () => {
        if (!editorContent.trim()) {
            setEnhanceError('Editor is empty. Add profile content before enhancing.');
            return;
        }

        setIsEnhancing(true);
        onEnhancerBusyChange?.(true);
        setEnhanceError('');
        setSaveError('');
        setSaveSuccess('');
        try {
            const current = editorContent;
            const res = await fetch(apiUrl('/agents/enhancer/profile'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdown: current })
            });
            const raw = await res.text();
            let data: any = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch {
                data = null;
            }
            if (!res.ok) {
                const details = Array.isArray(data?.warnings) ? ` ${data.warnings.join(' | ')}` : '';
                const fallback = raw?.slice(0, 180) || 'Enhancement failed.';
                throw new Error((data?.error || fallback) + details);
            }
            setLastEditorSnapshot(current);
            const next = data?.enhanced_markdown || current;
            setEditorContent(next);
            setLastEnhancerModel(String(data?.model || 'unknown'));
            if (next.trim() === current.trim()) {
                setSaveSuccess(`Enhancer completed via ${data?.model || 'enhancer'} (no content changes)`);
            } else {
                setSaveSuccess(`Enhanced via ${data?.model || 'enhancer'}`);
            }
        } catch (err) {
            setEnhanceError((err as Error).message);
        } finally {
            setIsEnhancing(false);
            onEnhancerBusyChange?.(false);
        }
    };

    const handleUndoEnhance = () => {
        if (!lastEditorSnapshot) return;
        setEditorContent(lastEditorSnapshot);
        setLastEditorSnapshot('');
        setSaveSuccess('Reverted enhancement');
    };

    // ── Create new file ──────────────────────────────────────────
    const handleSaveNew = async () => {
        setIsSaving(true);
        setSaveError('');
        const suggestedId = extractIdFromContent(editorContent, 'new-profile');
        const filename = suggestedId;
        try {
            const res = await fetch(apiUrl('/profiles'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, content: editorContent })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            showSuccess(`Saved as ${data.id}`);
        } catch (err) {
            setSaveError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Overwrite existing ───────────────────────────────────────
    const handleSaveOver = async () => {
        if (!selected) return;
        setIsSaving(true);
        setSaveError('');
        try {
            const res = await fetch(apiUrl(`/profiles/${selected.path}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editorContent })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Update failed');
            showSuccess('Saved successfully');
        } catch (err) {
            setSaveError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Delete ───────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!selected) return;
        try {
            const res = await fetch(apiUrl(`/profiles/${selected.path}`), { method: 'DELETE' });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Delete failed');
            }
            setView('grid');
            setSelected(null);
            onRefresh();
        } catch (err) {
            setSaveError((err as Error).message);
        }
    };

    /* ── Grid view ─────────────────────────────────────────────── */
    if (view === 'grid') {
        return (
            <div className="studio-container profiles-layout">
                <div className="studio-header">
                    <div className="profiles-intro">
                        <h3>Profile Library</h3>
                        <p>
                            Manage reusable AI role definitions and linked standards.
                            <br />
                            Select any profile card to review or edit details.
                        </p>
                    </div>
                    <button className="primary-btn" onClick={openNewEditor}>
                        <Plus size={18} /> New Profile
                    </button>
                </div>
                {manualProfiles.length > 0 && (
                    <section className="library-section">
                        <div className="standards-category-header">User Profiles</div>
                        <div className="item-grid">
                            {manualProfiles.map(p => (
                                <button
                                    key={p.id}
                                    className="item-card glass-card item-card-btn"
                                    onClick={() => openDetail(p)}
                                    aria-label={`View profile: ${p.name}`}
                                >
                                    <div className="card-header" />
                                    <h4>{p.name}</h4>
                                    <p>{p.description || 'Baseline standards for specialized AI agents.'}</p>
                                    <div className="card-footer">
                                        <span>{p.standards?.length || 0} Standards Attached</span>
                                        <User size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
                {manualProfiles.length > 0 && communityProfiles.length > 0 && <div className="section-divider" />}
                {communityProfiles.length > 0 && (
                    <section className="library-section">
                        <div className="standards-category-header">Community Profiles</div>
                        <div className="item-grid">
                            {communityProfiles.map(p => (
                                <button
                                    key={p.id}
                                    className="item-card glass-card item-card-btn"
                                    onClick={() => openDetail(p)}
                                    aria-label={`View profile: ${p.name}`}
                                >
                                    <div className="card-header">
                                        <span className="community-badge">Community</span>
                                    </div>
                                    <h4>{p.name}</h4>
                                    <p>{p.description || 'Baseline standards for specialized AI agents.'}</p>
                                    <div className="card-footer">
                                        <span>{p.standards?.length || 0} Standards Attached</span>
                                        <User size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div >
        );
    }

    /* ── Detail view ────────────────────────────────────────────── */
    if (view === 'detail' && selected) {
        return (
            <div className="studio-container profiles-layout">
                <div className="studio-detail-header">
                    <button className="back-btn" onClick={() => { setView('grid'); setConfirmDelete(false); }}>
                        <ArrowLeft size={16} /> Back to Profiles
                    </button>
                    <div className="detail-meta">
                        {selected.is_community && <span className="community-badge">Community</span>}
                        {selected.standards && selected.standards.length > 0 && (
                            <span className="version-tag">{selected.standards.length} standards</span>
                        )}
                    </div>
                </div>

                <div className="detail-panel glass-card">
                    <div className="detail-panel-header">
                        <h2>{selected.name}</h2>
                        {selected.description && (
                            <p className="detail-description">{selected.description}</p>
                        )}
                    </div>

                    {selected.standards && selected.standards.length > 0 && (
                        <div className="profile-standards-list">
                            <div className="standards-category-header">Attached Standards</div>
                            {selected.standards.map(s => (
                                <div key={s} className="profile-standard-chip">{s}</div>
                            ))}
                        </div>
                    )}

                    <div className="detail-panel-body">
                        <pre className="standard-markdown">{selected.markdown_content || '(No content)'}</pre>
                    </div>

                    <div className="detail-panel-footer">
                        <div className="crud-actions">
                            {!confirmDelete ? (
                                <button
                                    className="danger-btn"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    <Trash2 size={15} /> Delete
                                </button>
                            ) : (
                                <div className="confirm-delete-row">
                                    <span className="delete-confirm-label">Are you sure?</span>
                                    <button className="danger-btn" onClick={handleDelete}>Confirm</button>
                                    <button className="back-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
                                </div>
                            )}
                        </div>
                        <div className="crud-actions">
                            <button className="primary-btn outline" onClick={openEditEditor}>
                                <FileText size={15} /> Edit
                            </button>
                            <button className="primary-btn" onClick={() => onUseInComposer(selected.id)}>
                                <ExternalLink size={15} /> Use in Composer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Editor view (New or Edit) ──────────────────────────────── */
    if (view === 'editor') {
    return (
        <div className="studio-container profiles-layout">
                <div className="studio-detail-header">
                    <button className="back-btn" onClick={() => setView(selected ? 'detail' : 'grid')}>
                        <ArrowLeft size={16} /> Cancel
                    </button>
                    <span className="editor-hint">
                        Edit the frontmatter and body below. Hit <strong>Save</strong> to persist to disk.
                    </span>
                </div>

                <div className="editor-panel glass-card">
                    <div className="editor-panel-header">
                        <h3>
                            {isEditing ? <><FileText size={18} /> Editing: {selected!.name}</> : <><Plus size={18} /> New Role Profile</>}
                        </h3>
                        <span className="status-pill">
                            {isSaving ? 'SAVING...' : isEnhancing ? 'ENHANCING...' : saveSuccess ? 'SAVED ✓' : 'DRAFT'}
                        </span>
                    </div>

                    {saveError && (
                        <div className="editor-alert error">{saveError}</div>
                    )}
                    {enhanceError && (
                        <div className="editor-alert error">{enhanceError}</div>
                    )}

                    <div data-color-mode="dark" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 2px' }}>
                        <MDEditor
                            value={editorContent}
                            onChange={val => { setEditorContent(val || ''); setSaveSuccess(''); }}
                            height="100%"
                            visibleDragbar={false}
                            preview="live"
                            style={{ flex: 1 }}
                        />
                    </div>

                    <div className="editor-panel-footer">
                        <div className="enhancer-model-note">
                            {lastEnhancerModel ? `LLM used: ${lastEnhancerModel}` : 'LLM used: —'}
                        </div>
                        <button className="primary-btn outline" onClick={handleEnhance} disabled={isSaving || isEnhancing}>
                            <Sparkles size={15} /> {isEnhancing ? 'Enhancing...' : 'Enhance'}
                        </button>
                        <button className="primary-btn outline" onClick={handleUndoEnhance} disabled={isSaving || isEnhancing || !lastEditorSnapshot}>
                            <RotateCcw size={15} /> Undo Enhance
                        </button>
                        {isEditing ? (
                            <>
                                <button className="primary-btn outline" onClick={handleSaveNew} disabled={isSaving}>
                                    <Copy size={15} /> Save as New
                                </button>
                                <button className="primary-btn" onClick={handleSaveOver} disabled={isSaving}>
                                    <Save size={15} /> Save Over
                                </button>
                            </>
                        ) : (
                            <button className="primary-btn" onClick={handleSaveNew} disabled={isSaving}>
                                <Save size={15} /> Save Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default ProfileArchitect;
