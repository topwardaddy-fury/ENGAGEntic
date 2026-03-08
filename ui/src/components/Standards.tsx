import React, { useState } from 'react';
import { FileText, Plus, ArrowLeft, ExternalLink, Trash2, Save, Copy, Sparkles, RotateCcw } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { apiUrl } from '../lib/api';

interface Standard {
    id: string;
    path: string;
    name?: string;
    title?: string;
    category?: string;
    description?: string;
    version?: string;
    type?: string;
    is_community?: boolean;
    raw_content?: string;
    markdown_content: string;
}

interface Props {
    items: Standard[];
    onNavigateToComposer: () => void;
    onUseInComposer: (standardId: string) => void;
    onRefresh: () => void;
    onEnhancerBusyChange?: (busy: boolean) => void;
}

const NEW_STANDARD_TEMPLATE = `---
id: new-standard
type: standard
title: New Standard
category: prompt-engineering
version: 1.0.0
description: Briefly describe what this standard enforces.
---

## Objective
Describe the goal of this standard.

## Standards
- Rule 1
- Rule 2
- Rule 3

## When to Use
Explain where this standard should be applied.
`;

type View = 'grid' | 'detail' | 'editor';

function extractIdFromContent(content: string, fallback: string): string {
    const match = content.match(/^id:\s*(.+)$/m);
    return match ? match[1].trim() : fallback;
}

const StandardsStudio: React.FC<Props> = ({
    items,
    onNavigateToComposer,
    onUseInComposer,
    onRefresh,
    onEnhancerBusyChange
}) => {
    const [view, setView] = useState<View>('grid');
    const [selected, setSelected] = useState<Standard | null>(null);
    const [editorContent, setEditorContent] = useState(NEW_STANDARD_TEMPLATE);
    const [isSaving, setIsSaving] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [enhanceError, setEnhanceError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [lastEditorSnapshot, setLastEditorSnapshot] = useState('');
    const [lastEnhancerModel, setLastEnhancerModel] = useState('');
    const manualStandards = items.filter((s) => !s.is_community);
    const communityStandards = items.filter((s) => s.is_community);

    const isEditing = view === 'editor' && selected !== null;

    const showSuccess = (msg: string) => {
        setSaveSuccess(msg);
        onRefresh();
        setTimeout(() => {
            setSaveSuccess('');
            setView('grid');
        }, 2000);
    };

    const openDetail = (s: Standard) => {
        setSelected(s);
        setConfirmDelete(false);
        setView('detail');
    };

    const openNewEditor = () => {
        setSelected(null);
        setEditorContent(NEW_STANDARD_TEMPLATE);
        setSaveError('');
        setEnhanceError('');
        setSaveSuccess('');
        setLastEnhancerModel('');
        setView('editor');
    };

    const openEditEditor = () => {
        if (!selected) return;
        setEditorContent(
            selected.raw_content ||
            `---\nid: ${selected.id}\ntype: standard\ntitle: ${selected.title || selected.name || selected.id}\ncategory: ${selected.category || 'general'}\nversion: ${selected.version || '1.0.0'}\ndescription: ${selected.description || ''}\n---\n\n${selected.markdown_content}`
        );
        setSaveError('');
        setEnhanceError('');
        setSaveSuccess('');
        setLastEnhancerModel('');
        setView('editor');
    };

    const handleEnhance = async () => {
        if (!editorContent.trim()) {
            setEnhanceError('Editor is empty. Add standard content before enhancing.');
            return;
        }

        setIsEnhancing(true);
        onEnhancerBusyChange?.(true);
        setEnhanceError('');
        setSaveError('');
        setSaveSuccess('');

        try {
            const current = editorContent;
            const res = await fetch(apiUrl('/agents/enhancer/standard'), {
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

    const handleSaveNew = async () => {
        setIsSaving(true);
        setSaveError('');
        const suggestedId = extractIdFromContent(editorContent, 'new-standard');
        const filename = suggestedId;
        try {
            const res = await fetch(apiUrl('/standards'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, content: editorContent, registry: false })
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

    const handleSaveOver = async () => {
        if (!selected) return;
        setIsSaving(true);
        setSaveError('');
        try {
            const res = await fetch(apiUrl(`/standards/${selected.path}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editorContent, registry: Boolean(selected.is_community) })
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

    const handleDelete = async () => {
        if (!selected) return;
        try {
            const res = await fetch(apiUrl(`/standards/${selected.path}`), { method: 'DELETE' });
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

    if (view === 'grid') {
        return (
            <div className="studio-container standards-layout">
                <div className="studio-header">
                    <div>
                        <h3>Reusable AI Best Practices</h3>
                        <p>
                            Standard fragments stored as markdown to power your operational context.
                            <br />
                            Click any card to read its content.
                        </p>
                    </div>
                    <button className="primary-btn" onClick={openNewEditor}>
                        <Plus size={18} /> New Standard
                    </button>
                </div>
                {manualStandards.length > 0 && (
                    <section className="library-section">
                        <div className="standards-category-header">User Standards</div>
                        <div className="item-grid">
                            {manualStandards.map(s => (
                                <button
                                    key={s.id}
                                    className="item-card glass-card item-card-btn"
                                    onClick={() => openDetail(s)}
                                    aria-label={`View standard: ${s.title || s.name || s.id}`}
                                >
                                    <div className="card-header">
                                        <span className="category-tag">{s.category || 'uncategorized'}</span>
                                    </div>
                                    <h4>{s.title || s.name || s.id}</h4>
                                    <p>{s.description || 'No description provided in frontmatter.'}</p>
                                    <div className="card-footer">
                                        <span>{s.category || 'standard'}</span>
                                        <FileText size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
                {manualStandards.length > 0 && communityStandards.length > 0 && <div className="section-divider" />}
                {communityStandards.length > 0 && (
                    <section className="library-section">
                        <div className="standards-category-header">Community Standards</div>
                        <div className="item-grid">
                            {communityStandards.map(s => (
                                <button
                                    key={s.id}
                                    className="item-card glass-card item-card-btn"
                                    onClick={() => openDetail(s)}
                                    aria-label={`View standard: ${s.title || s.name || s.id}`}
                                >
                                    <div className="card-header">
                                        <span className="community-badge">Community</span>
                                    </div>
                                    <h4>{s.title || s.name || s.id}</h4>
                                    <p>{s.description || 'No description provided in frontmatter.'}</p>
                                    <div className="card-footer">
                                        <span>{s.category || 'standard'}</span>
                                        <FileText size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        );
    }

    if (view === 'detail' && selected) {
        return (
            <div className="studio-container standards-layout">
                <div className="studio-detail-header">
                    <button className="back-btn" onClick={() => { setView('grid'); setConfirmDelete(false); }}>
                        <ArrowLeft size={16} /> Back to Standards
                    </button>
                    <div className="detail-meta">
                        {!selected.is_community && <span className="category-tag">{selected.category}</span>}
                        {selected.is_community && <span className="community-badge">Community</span>}
                    </div>
                </div>

                <div className="detail-panel glass-card">
                    <div className="detail-panel-header">
                        <h2>{selected.title || selected.name || selected.id}</h2>
                        {selected.description && <p className="detail-description">{selected.description}</p>}
                    </div>
                    <div className="detail-panel-body">
                        <pre className="standard-markdown">{selected.markdown_content || '(No content)'}</pre>
                    </div>
                    <div className="detail-panel-footer">
                        <div className="crud-actions">
                            {!confirmDelete ? (
                                <button className="danger-btn" onClick={() => setConfirmDelete(true)}>
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

    if (view === 'editor') {
        return (
            <div className="studio-container standards-layout">
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
                            {isEditing ? <><FileText size={18} /> Editing: {selected?.title || selected?.name || selected?.id}</> : <><Plus size={18} /> New Standard</>}
                        </h3>
                        <span className="status-pill">
                            {isSaving ? 'SAVING...' : isEnhancing ? 'ENHANCING...' : saveSuccess ? 'SAVED ✓' : 'DRAFT'}
                        </span>
                    </div>

                    {saveError && <div className="editor-alert error">{saveError}</div>}
                    {enhanceError && <div className="editor-alert error">{enhanceError}</div>}

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
                                <Save size={15} /> Save Standard
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default StandardsStudio;
