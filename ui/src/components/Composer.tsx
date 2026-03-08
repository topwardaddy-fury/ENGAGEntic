import React, { useState, useEffect, useCallback } from 'react';
import { SplitSquareVertical, Info } from 'lucide-react';
import ContextBuilder from './ContextBuilder';
import PromptPreview from './PromptPreview';
import PromptLayers from './PromptLayers';
import { apiUrl } from '../lib/api';

interface Props {
    profiles: any[];
    standards: any[];
    specs: any[];
    initialSelections?: {
        profile: string;
        standards: string[];
        spec: string;
        workflow: string;
        task: string;
    };
    onSelectionsChange?: (s: any) => void;
    onNavigateToDiff?: () => void;
    onNavigateToSpecs?: () => void;
    onRefresh?: () => void;
}

const ContextComposer: React.FC<Props> = ({ profiles, standards, specs, initialSelections, onSelectionsChange, onNavigateToSpecs, onRefresh }) => {
    const [selections, setSelectionsLocal] = useState(initialSelections || {
        profile: '',
        standards: [] as string[],
        spec: '',
        workflow: '',
        task: ''
    });
    const [specName, setSpecName] = useState(initialSelections?.spec || '');
    const [isSaved, setIsSaved] = useState(false);

    const setSelections = (next: any) => {
        setSelectionsLocal(next);
        onSelectionsChange?.(next);
    };

    const [composedPrompt, setComposedPrompt] = useState('');
    const [layers, setLayers] = useState<any>(null);
    const [normalizedContext, setNormalizedContext] = useState<any>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [showLayers, setShowLayers] = useState(true);
    const [composeError, setComposeError] = useState('');

    // Live Composition Logic
    const handleCompose = useCallback(async () => {
        if (!selections.profile) {
            setComposedPrompt('');
            setLayers(null);
            setNormalizedContext(null);
            setComposeError('Please select a Profile to begin composition.');
            return;
        }

        setIsComposing(true);
        setComposeError('');
        try {
            const res = await fetch(apiUrl('/session/compose'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile_id: selections.profile,
                    standards: selections.standards,
                    specification_id: selections.spec,
                })
            });
            if (!res.ok) {
                const error = await res.json().catch(() => null);
                throw new Error(error?.error || 'Failed to compose context.');
            }
            const data = await res.json();
            setComposedPrompt(data.prompt);
            setLayers(data.layers);
            setNormalizedContext(data.normalized_context);
        } catch (err) {
            console.error("Composition Error:", err);
            setComposeError((err as Error).message);
        } finally {
            setIsComposing(false);
        }
    }, [selections]);

    // Debounce/Trigger composition when selections change
    useEffect(() => {
        const timer = setTimeout(() => {
            handleCompose();
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [selections, handleCompose]);

    const handleSaveSpec = async (isOverwrite = false) => {
        if (!specName || !selections.profile) return;
        try {
            const specId = specName.replace(/[^a-z0-9\-_.]/gi, '-').toLowerCase();
            const content = `---
name: ${specName}
type: specification
description: Custom saved specification
profile: ${selections.profile}
standards:
${selections.standards.map((s: string) => `  - ${s}`).join('\n')}
---
`;
            const endpoint = isOverwrite ? `/specifications/${specId}.md` : '/specifications';
            const method = isOverwrite ? 'PUT' : 'POST';

            const res = await fetch(apiUrl(endpoint), {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: specId,
                    content: content
                })
            });
            if (!res.ok) throw new Error('Failed to save specification.');

            setIsSaved(true);
            setTimeout(() => {
                setSpecName('');
                setIsSaved(false);
                if (onRefresh) onRefresh();
                if (onNavigateToSpecs) onNavigateToSpecs();
            }, 2000);
        } catch (err) {
            console.error(err);
            alert(`Error saving specification: ${(err as Error).message}`);
        }
    };

    return (
        <div className="playground-layout">
            <ContextBuilder
                profiles={profiles}
                standards={standards}
                specs={specs}
                workflows={[]}
                selections={selections}
                onChange={setSelections}
            />

            <div className="preview-column">
                <PromptPreview
                    prompt={composedPrompt}
                    layers={layers}
                    normalizedContext={normalizedContext}
                    isComposing={isComposing}
                    errorMessage={composeError}
                    specName={specName}
                    setSpecName={setSpecName}
                    onSaveAsSpec={handleSaveSpec}
                    isSaved={isSaved}
                />

                <div className="utility-bar">
                    <button
                        className={`toggle-btn ${showLayers ? 'active' : ''}`}
                        onClick={() => setShowLayers(!showLayers)}
                    >
                        <Info size={16} /> {showLayers ? 'Hide Layers' : 'Show Layers'}
                    </button>
                </div>

                {showLayers && <PromptLayers layers={layers} />}
            </div>
        </div>
    );
};

export default ContextComposer;
