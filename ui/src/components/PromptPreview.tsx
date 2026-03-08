import React, { useState, useEffect } from 'react';
import { Copy, Download, FileJson, Terminal, CheckCircle2, Share, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    prompt: string;
    layers: any;
    normalizedContext?: any;
    isComposing: boolean;
    errorMessage?: string;
    specName: string;
    setSpecName: (n: string) => void;
    onSaveAsSpec: (isOverwrite?: boolean) => void;
    isSaved?: boolean;
}

const PromptPreview: React.FC<Props> = ({ prompt, layers, normalizedContext, isComposing, errorMessage, specName, setSpecName, onSaveAsSpec, isSaved }) => {
    const [copied, setCopied] = useState(false);
    const [format, setFormat] = useState('plain');
    const [displayContent, setDisplayContent] = useState('');

    useEffect(() => {
        if (!normalizedContext) {
            setDisplayContent(prompt);
            return;
        }

        let result = prompt;
        if (format === 'json') {
            result = JSON.stringify(normalizedContext, null, 2);
        } else if (format === 'openai') {
            const msgs = [];
            if (normalizedContext.system_prompt) msgs.push({ role: 'system', content: normalizedContext.system_prompt });
            if (normalizedContext.developer_prompt) msgs.push({ role: 'developer', content: normalizedContext.developer_prompt });
            if (normalizedContext.user_prompt) msgs.push({ role: 'user', content: normalizedContext.user_prompt });
            result = JSON.stringify(msgs, null, 2);
        } else if (format === 'anthropic') {
            const payload = {
                system: `${normalizedContext.system_prompt}\n\n${normalizedContext.developer_prompt}`.trim(),
                messages: [{ role: 'user', content: normalizedContext.user_prompt }]
            };
            result = JSON.stringify(payload, null, 2);
        } else if (format === 'generic') {
            const payload = {
                system_prompt: normalizedContext.system_prompt,
                developer_prompt: normalizedContext.developer_prompt,
                user_prompt: normalizedContext.user_prompt
            };
            result = JSON.stringify(payload, null, 2);
        }
        setDisplayContent(result);
    }, [format, normalizedContext, prompt]);

    const handleCopy = () => {
        navigator.clipboard.writeText(displayContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadMarkdown = () => {
        const ext = format === 'plain' ? 'md' : 'json';
        const type = format === 'plain' ? 'text/markdown' : 'application/json';
        const blob = new Blob([displayContent], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `engagentic-context-${Date.now()}.${ext}`;
        a.click();
    };

    const handleDownloadJSON = () => {
        const data = {
            metadata: {
                engine: "ENGAGEntic Context Engine",
                format: format,
                timestamp: new Date().toISOString()
            },
            layers: layers,
            payload: displayContent
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `engagentic-payload-${Date.now()}.json`;
        a.click();
    };

    return (
        <div className="preview-container glass-card">
            <header className="preview-header">
                <div className="header-left">
                    <Terminal size={18} className="primary-icon" />
                    <h3>Live Context</h3>
                    {isComposing && (
                        <motion.span
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="status-pill animating"
                        >
                            Syncing...
                        </motion.span>
                    )}
                </div>
                <div className="header-right">
                    <div className="spec-save-ui">
                        <input
                            type="text"
                            placeholder="Specification name..."
                            value={specName}
                            onChange={(e) => setSpecName(e.target.value)}
                            className="spec-name-input"
                            title="Name your specification"
                        />
                        <button
                            className={`btn btn-sm btn-save ${isSaved ? 'success' : 'btn-primary'}`}
                            onClick={() => onSaveAsSpec(false)}
                            disabled={!specName || !prompt || isSaved}
                            title="Save as New"
                            style={isSaved ? { backgroundColor: 'var(--accent-color)', color: 'black', width: 'auto' } : {}}
                        >
                            {isSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                            <span>{isSaved ? 'Saved' : 'Save New'}</span>
                        </button>
                        <button
                            className={`btn btn-sm btn-save ${isSaved ? 'success' : 'btn-outline'}`}
                            onClick={() => onSaveAsSpec(true)}
                            disabled={!specName || !prompt || isSaved}
                            title="Save Over Existing"
                            style={isSaved ? { display: 'none' } : {}}
                        >
                            <Save size={14} />
                            <span>Save Over</span>
                        </button>
                    </div>
                    <div className="format-toggle">
                        <button
                            className={`toggle-btn ${format === 'plain' ? 'active' : ''}`}
                            onClick={() => setFormat('plain')}
                        >
                            TEXT
                        </button>
                        <button
                            className={`toggle-btn ${format === 'json' ? 'active' : ''}`}
                            onClick={() => setFormat('json')}
                        >
                            JSON
                        </button>
                    </div>
                    <button className="icon-btn" onClick={handleDownloadMarkdown} title="Export File">
                        <Download size={18} />
                    </button>
                    <button className="icon-btn" onClick={handleDownloadJSON} title="Export Wrapper JSON">
                        <FileJson size={18} />
                    </button>
                    <button className={`icon-btn primary ${copied ? 'success' : ''}`} onClick={handleCopy} title="Copy Code">
                        {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                    </button>
                </div>
            </header>

            {errorMessage && (
                <div className="preview-alert" role="alert">
                    {errorMessage}
                </div>
            )}

            <div className="prompt-container">
                <AnimatePresence mode="wait">
                    {displayContent ? (
                        <motion.pre
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="prompt-textarea"
                        >
                            {displayContent}
                        </motion.pre>
                    ) : (
                        <motion.div
                            key="empty"
                            className="empty-prompt"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <div className="pulse-icon"><Share size={40} /></div>
                            <p>Configure your logic context on the left to generate the final mission prompt.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default PromptPreview;
