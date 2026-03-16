import React, { useState, useEffect } from 'react';
import { Clock, Zap, Settings, Save, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { getIdToken } from '../../services/authService';

interface ChallengeScheduleSettings {
  enabled: boolean;
  frequency: 'daily' | 'every_3_days' | 'weekly';
  intervalHours: number;
  gameType: 'singles' | 'doubles';
  maxPerPlayer: number;
  leagueId: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export const ChallengeSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<ChallengeScheduleSettings>({
    enabled: false,
    frequency: 'daily',
    intervalHours: 24,
    gameType: 'singles',
    maxPerPlayer: 1,
    leagueId: null,
    lastRunAt: null,
    nextRunAt: null,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [runningManual, setRunningManual] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/settings/challenge-schedule', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load challenge settings:', err);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/settings/challenge-schedule', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      const data = await res.json();
      setSettings(data);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const runManualGeneration = async () => {
    setRunningManual(true);
    setMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/challenges/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameType: settings.gameType,
          maxPerPlayer: settings.maxPerPlayer,
          leagueId: settings.leagueId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Generation failed');
      }
      const data = await res.json();
      setMessage({ type: 'success', text: `Generated ${data.generated} challenges!` });
      setTimeout(() => setMessage(null), 4000);
      await loadSettings(); // Refresh to get updated lastRunAt
    } catch (err: any) {
      console.error('Failed to run generation:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to generate challenges' });
    } finally {
      setRunningManual(false);
    }
  };

  const frequencyOptions = [
    { value: 'daily', label: 'Every 24 hours', hours: 24 },
    { value: 'every_3_days', label: 'Every 3 days', hours: 72 },
    { value: 'weekly', label: 'Once a week', hours: 168 },
  ];

  const handleFrequencyChange = (freq: string) => {
    const option = frequencyOptions.find(o => o.value === freq);
    if (option) {
      setSettings(prev => ({
        ...prev,
        frequency: freq as any,
        intervalHours: option.hours,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyber-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Zap className="text-cyber-yellow" size={20} />
          Automated Challenge Generation
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Configure automatic challenge generation between players based on ELO rankings
        </p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span className="text-sm font-mono">{message.text}</span>
        </div>
      )}

      {/* Scheduler Status */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="text-cyber-cyan" size={18} />
            <h4 className="font-display font-bold text-white">Scheduler Status</h4>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-mono ${
            settings.enabled
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            {settings.enabled ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {settings.lastRunAt && (
            <div>
              <p className="text-gray-500 font-mono text-xs mb-1">Last Run</p>
              <p className="text-white font-mono">{new Date(settings.lastRunAt).toLocaleString()}</p>
            </div>
          )}
          {settings.nextRunAt && (
            <div>
              <p className="text-gray-500 font-mono text-xs mb-1">Next Run</p>
              <p className="text-white font-mono">{new Date(settings.nextRunAt).toLocaleString()}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Configuration */}
      <Card className="p-4 space-y-5">
        <div className="flex items-center gap-2">
          <Settings className="text-cyber-purple" size={18} />
          <h4 className="font-display font-bold text-white">Generation Settings</h4>
        </div>

        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/10">
          <div>
            <p className="font-mono text-white text-sm">Enable Automatic Generation</p>
            <p className="text-xs text-gray-500 mt-0.5">Run challenge generation on schedule</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              settings.enabled ? 'bg-cyber-purple' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.enabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-mono text-gray-400 mb-2">Generation Frequency</label>
          <select
            value={settings.frequency}
            onChange={(e) => handleFrequencyChange(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-cyan/50"
          >
            {frequencyOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            Interval: {settings.intervalHours} hours
          </p>
        </div>

        {/* Game Type */}
        <div>
          <label className="block text-sm font-mono text-gray-400 mb-2">Game Type</label>
          <select
            value={settings.gameType}
            onChange={(e) => setSettings(prev => ({ ...prev, gameType: e.target.value as any }))}
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-cyan/50"
          >
            <option value="singles">Singles</option>
            <option value="doubles" disabled>Doubles (Coming Soon)</option>
          </select>
        </div>

        {/* Max Per Player */}
        <div>
          <label className="block text-sm font-mono text-gray-400 mb-2">
            Max Challenges Per Player
          </label>
          <input
            type="number"
            min="1"
            max="3"
            value={settings.maxPerPlayer}
            onChange={(e) => setSettings(prev => ({ ...prev, maxPerPlayer: parseInt(e.target.value) || 1 }))}
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-cyan/50"
          />
          <p className="text-xs text-gray-500 mt-1 font-mono">
            How many challenges each player can receive in one generation cycle
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Settings
              </>
            )}
          </Button>
          <Button
            onClick={runManualGeneration}
            disabled={runningManual}
            variant="outline"
          >
            {runningManual ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap size={14} />
                Run Now
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-cyber-cyan/5 border-cyber-cyan/20">
        <div className="flex gap-3">
          <AlertCircle className="text-cyber-cyan flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-gray-300 space-y-2">
            <p className="font-mono font-bold text-cyber-cyan">How It Works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>The scheduler runs at the configured interval when enabled</li>
              <li>Players are paired based on ELO proximity for fair matchups</li>
              <li>Duplicate pairings within 24 hours are automatically prevented</li>
              <li>Players receive a notification popup when they first load the app</li>
              <li>Manual "Run Now" is available for testing or immediate generation</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
