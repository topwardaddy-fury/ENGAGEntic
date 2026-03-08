import React from 'react';
import { Network, Circle, GitCommit, GitBranch } from 'lucide-react';

interface Props {
    layers: any;
}

const PromptLayers: React.FC<Props> = ({ layers }) => {
    if (!layers || (!layers.profile && layers.standards.length === 0 && !layers.specification)) {
        return null;
    }

    return (
        <div className="layers-visualization glass-card">
            <header className="layers-header">
                <Network size={16} />
                <h4>PROMPT COMPOSITION LAYERS</h4>
            </header>

            <div className="layers-tree">
                {layers.profile && (
                    <div className="layer-item profile">
                        <Circle size={12} className="bullet" />
                        <div className="layer-info">
                            <span className="layer-type">PROFILE</span>
                            <span className="layer-name">{layers.profile.name}</span>
                        </div>
                    </div>
                )}

                {layers.standards.length > 0 && (
                    <div className="layer-group">
                        <div className="layer-item separator">
                            <GitBranch size={12} className="bullet" />
                            <span className="layer-type">STANDARDS</span>
                        </div>
                        {layers.standards.map((s: any, i: number) => (
                            <div key={i} className="layer-item standard">
                                <GitCommit size={10} className="bullet sub" />
                                <span className="layer-name">{s.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {layers.specification && (
                    <div className="layer-item specification">
                        <Circle size={12} className="bullet" />
                        <div className="layer-info">
                            <span className="layer-type">SPECIFICATION</span>
                            <span className="layer-name">{layers.specification.name}</span>
                        </div>
                    </div>
                )}

                {layers.workflow && (
                    <div className="layer-item workflow">
                        <Circle size={12} className="bullet" />
                        <div className="layer-info">
                            <span className="layer-type">WORKFLOW</span>
                            <span className="layer-name">{layers.workflow.name}</span>
                        </div>
                    </div>
                )}

                {layers.task && (
                    <div className="layer-item task">
                        <Circle size={12} className="bullet" />
                        <div className="layer-info">
                            <span className="layer-type">USER TASK</span>
                            <span className="layer-name truncated">{layers.task}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromptLayers;
