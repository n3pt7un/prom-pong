-- Add challenge generation scheduler settings
INSERT INTO app_settings (key, value)
VALUES ('challenge_generation_schedule', '{
  "enabled": false,
  "frequency": "daily",
  "intervalHours": 24,
  "gameType": "singles",
  "maxPerPlayer": 1,
  "leagueId": null,
  "lastRunAt": null,
  "nextRunAt": null
}')
ON CONFLICT (key) DO NOTHING;

-- Add index for faster settings lookup
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

COMMENT ON TABLE app_settings IS 'Application-wide configuration and scheduler settings';
