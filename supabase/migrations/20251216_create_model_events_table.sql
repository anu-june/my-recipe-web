-- Create table for tracking model usage and fallbacks
CREATE TABLE IF NOT EXISTS model_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  model_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failure'
  duration_ms INTEGER,
  error_message TEXT,
  fallback_occurred BOOLEAN DEFAULT FALSE,
  recipe_source TEXT -- optional input source (URL or text snippet)
);

-- Enable Row Level Security
ALTER TABLE model_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon and authenticated) to insert logs
CREATE POLICY "Enable insert for all users" ON model_events
    FOR INSERT
    WITH CHECK (true);

-- Only allow authenticated users to view logs
CREATE POLICY "Enable read for authenticated users only" ON model_events
    FOR SELECT
    USING (auth.role() = 'authenticated');
