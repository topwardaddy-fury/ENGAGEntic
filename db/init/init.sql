-- ENGAGEntic DB Initialization (Open Source Developer Edition)
-- Focused on Context Persistence and Session History

-- 1. Standards Meta (Optional, as source is Markdown)
CREATE TABLE IF NOT EXISTS standards_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT UNIQUE NOT NULL,
    last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sessions (Context Compositions)
-- Stores the final assembled context for history/copying
CREATE TABLE IF NOT EXISTS context_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT,
    specification_id TEXT,
    workflow_id TEXT,
    user_task TEXT,
    assembled_prompt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Prompt Versions (For Diff Comparison)
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES context_sessions(id),
    version_label TEXT, -- e.g. "Iteration 1", "Draft"
    prompt_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data (Optional)
INSERT INTO context_sessions (profile_id, assembled_prompt) VALUES ('engineering-assistant.md', '### PROFILE\nEngineering Assistant Baseline\n### USER\nInitial Session Context');
