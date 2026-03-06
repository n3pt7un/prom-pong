-- Create app_settings table for storing application-wide configuration
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select ON app_settings;
CREATE POLICY app_settings_select ON app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS app_settings_insert ON app_settings;
CREATE POLICY app_settings_insert ON app_settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS app_settings_update ON app_settings;
CREATE POLICY app_settings_update ON app_settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS app_settings_delete ON app_settings;
CREATE POLICY app_settings_delete ON app_settings FOR DELETE USING (true);

-- Insert default ELO config
INSERT INTO app_settings (key, value)
VALUES ('elo_config', '{
  "kFactor": 32,
  "initialElo": 1200,
  "dFactor": 200,
  "formulaPreset": "standard",
  "customFormula": "Math.round(kFactor * (1 - expectedScore(winnerElo, loserElo)))",
  "customConstants": {}
}')
ON CONFLICT (key) DO NOTHING;
