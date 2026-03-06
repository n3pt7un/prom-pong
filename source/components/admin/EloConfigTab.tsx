import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, RefreshCw, Check, AlertCircle, Info, TrendingUp, Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { getIdToken } from '../../services/authService';

interface EloConfig {
  kFactor: number;
  initialElo: number;
  dFactor: number;
  formulaPreset: 'standard' | 'score_weighted' | 'custom';
  customFormula: string;
  customConstants: Record<string, number>;
}

const FORMULA_PRESETS: Record<string, { label: string; description: string; template: string }> = {
  standard: {
    label: 'Standard ELO',
    description: 'Classic formula. All wins weighted equally regardless of score.',
    template: 'Math.round(kFactor * (1 - expectedScore(winnerElo, loserElo)))',
  },
  score_weighted: {
    label: 'Score-Weighted ELO',
    description: 'K-factor scales with score margin. 11-0 blowout awards up to 2× points vs a close 11-9.',
    template: 'Math.round(kFactor * (1 + (scoreWinner - scoreLoser) / (scoreWinner + scoreLoser || 1)) * (1 - expectedScore(winnerElo, loserElo)))',
  },
  custom: {
    label: 'Custom Formula',
    description: 'Write your own formula using any available variables and custom constants.',
    template: 'Math.round(kFactor * (1 - expectedScore(winnerElo, loserElo)))',
  },
};

const DEFAULT_CONFIG: EloConfig = {
  kFactor: 32,
  initialElo: 1200,
  dFactor: 200,
  formulaPreset: 'standard',
  customFormula: 'Math.round(kFactor * (1 - expectedScore(winnerElo, loserElo)))',
  customConstants: {},
};

const AVAILABLE_VARS = [
  { name: 'winnerElo', desc: 'ELO rating of the winning side' },
  { name: 'loserElo', desc: 'ELO rating of the losing side' },
  { name: 'kFactor', desc: 'K-Factor constant' },
  { name: 'dFactor', desc: 'D-Factor (spread) constant' },
  { name: 'scoreWinner', desc: 'Match score of the winner' },
  { name: 'scoreLoser', desc: 'Match score of the loser' },
  { name: 'expectedScore(ra, rb)', desc: 'Returns win probability for ra vs rb using current dFactor' },
  { name: 'Math.*', desc: 'Full Math object (Math.round, Math.pow, Math.max, Math.log, …)' },
];

// Client-side formula evaluator — mirrors the server sandbox
function evalFormulaClient(
  formula: string,
  winnerElo: number,
  loserElo: number,
  config: EloConfig,
): number | null {
  try {
    const { kFactor, dFactor, customConstants } = config;
    const scoreWinner = 11, scoreLoser = 5; // sample values for preview
    const expectedScore = (ra: number, rb: number, d = dFactor) =>
      1 / (1 + Math.pow(10, (rb - ra) / d));

    const keys = ['Math', 'winnerElo', 'loserElo', 'kFactor', 'dFactor',
      'scoreWinner', 'scoreLoser', 'expectedScore', ...Object.keys(customConstants)];
    const vals = [Math, winnerElo, loserElo, kFactor, dFactor,
      scoreWinner, scoreLoser, expectedScore, ...Object.values(customConstants)];

    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return (${formula});`);
    const result = fn(...vals);
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result);
  } catch {
    return null;
  }
}

function getActiveFormula(config: EloConfig): string {
  if (config.formulaPreset === 'custom') return config.customFormula;
  return FORMULA_PRESETS[config.formulaPreset]?.template ?? FORMULA_PRESETS.standard.template;
}

function FormulaPreview({ config }: { config: EloConfig }) {
  const formula = getActiveFormula(config);
  const scenarios = [
    { label: 'Equal (1200 vs 1200)', wElo: 1200, lElo: 1200 },
    { label: 'Favourite wins (1400 vs 1200)', wElo: 1400, lElo: 1200 },
    { label: 'Upset: underdog wins (1200 vs 1400)', wElo: 1200, lElo: 1400 },
  ];

  return (
    <div className="space-y-1.5">
      {scenarios.map((s, i) => {
        const delta = evalFormulaClient(formula, s.wElo, s.lElo, config);
        const valid = delta !== null;
        return (
          <div key={i} className="flex items-center justify-between bg-black/30 rounded-lg px-4 py-2 text-xs font-mono">
            <span className="text-gray-400">{s.label}</span>
            {valid ? (
              <div className="flex items-center gap-3">
                <span className="text-green-400">winner +{delta}</span>
                <span className="text-red-400">loser -{delta}</span>
              </div>
            ) : (
              <span className="text-red-500">formula error</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Custom Constants Editor ----
function ConstantsEditor({
  constants,
  onChange,
}: {
  constants: Record<string, number>;
  onChange: (c: Record<string, number>) => void;
}) {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [keyError, setKeyError] = useState('');
  const identRe = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

  const add = () => {
    const k = newKey.trim();
    const v = Number(newVal);
    if (!identRe.test(k)) { setKeyError('Must be a valid identifier (letters, numbers, _$)'); return; }
    if (!isFinite(v)) { setKeyError('Value must be a number'); return; }
    if (k in constants) { setKeyError('Name already exists'); return; }
    onChange({ ...constants, [k]: v });
    setNewKey('');
    setNewVal('');
    setKeyError('');
  };

  const remove = (k: string) => {
    const next = { ...constants };
    delete next[k];
    onChange(next);
  };

  const updateVal = (k: string, raw: string) => {
    const v = Number(raw);
    if (isFinite(v)) onChange({ ...constants, [k]: v });
  };

  return (
    <div className="space-y-2">
      {Object.entries(constants).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="font-mono text-xs text-cyber-cyan bg-black/40 rounded px-2 py-1 min-w-[120px]">{k}</span>
          <span className="text-gray-500 text-xs">=</span>
          <input
            type="number"
            defaultValue={v}
            onBlur={e => updateVal(k, e.target.value)}
            className="w-28 bg-black/50 border border-white/20 rounded px-2 py-1 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none"
          />
          <button onClick={() => remove(k)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <div className="flex items-start gap-2 pt-1">
        <input
          type="text"
          placeholder="name"
          value={newKey}
          onChange={e => { setNewKey(e.target.value); setKeyError(''); }}
          className="w-28 bg-black/50 border border-white/20 rounded px-2 py-1 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none"
        />
        <span className="text-gray-500 text-xs pt-1">=</span>
        <input
          type="number"
          placeholder="value"
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="w-24 bg-black/50 border border-white/20 rounded px-2 py-1 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none"
        />
        <button
          onClick={add}
          className="flex items-center gap-1 px-2 py-1 bg-cyber-purple/20 hover:bg-cyber-purple/30 border border-cyber-purple/40 text-cyber-purple rounded text-xs font-bold transition-all"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      {keyError && <p className="text-xs text-red-400 font-mono">{keyError}</p>}
    </div>
  );
}

// ---- Formula Editor ----
function FormulaEditor({ value, onChange, error }: { value: string; onChange: (v: string) => void; error: string | null }) {
  const [showVars, setShowVars] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={4}
          spellCheck={false}
          className={`w-full bg-black/60 border rounded-lg px-3 py-2.5 text-white font-mono text-xs leading-relaxed focus:outline-none resize-y ${
            error ? 'border-red-500/60 focus:border-red-500' : 'border-white/20 focus:border-cyber-purple'
          }`}
          style={{ tabSize: 2 }}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 font-mono flex items-center gap-1.5">
          <X size={11} /> {error}
        </p>
      )}

      {/* Variable reference */}
      <button
        onClick={() => setShowVars(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {showVars ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Available variables
      </button>
      {showVars && (
        <div className="bg-black/40 rounded-lg p-3 space-y-1.5 border border-white/5">
          {AVAILABLE_VARS.map(v => (
            <div key={v.name} className="flex items-start gap-3 text-xs">
              <button
                onClick={() => {
                  const el = ref.current;
                  if (!el) return;
                  const start = el.selectionStart;
                  const next = value.slice(0, start) + v.name.split('(')[0] + value.slice(el.selectionEnd);
                  onChange(next);
                  setTimeout(() => el.focus(), 0);
                }}
                className="font-mono text-cyber-cyan hover:text-white transition-colors shrink-0"
              >
                {v.name}
              </button>
              <span className="text-gray-500">{v.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Main tab ----
export const EloConfigTab: React.FC = () => {
  const [config, setConfig] = useState<EloConfig>(DEFAULT_CONFIG);
  const [draft, setDraft] = useState<EloConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [recalcResult, setRecalcResult] = useState<{ playersUpdated: number; matchesReplayed: number } | null>(null);
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [formulaError, setFormulaError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/elo-config', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setConfig(data);
      setDraft(data);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Live-validate custom formula
  useEffect(() => {
    if (draft.formulaPreset !== 'custom') { setFormulaError(null); return; }
    const formula = getActiveFormula(draft);
    const result = evalFormulaClient(formula, 1200, 1200, draft);
    setFormulaError(result === null ? 'Formula returned a non-numeric value or threw an error' : null);
  }, [draft.customFormula, draft.formulaPreset, draft.customConstants, draft.kFactor, draft.dFactor]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(config);

  const setField = <K extends keyof EloConfig>(key: K, value: EloConfig[K]) =>
    setDraft(d => ({ ...d, [key]: value }));

  const handlePresetChange = (preset: EloConfig['formulaPreset']) => {
    setDraft(d => ({
      ...d,
      formulaPreset: preset,
      // When switching to custom, pre-populate with the current preset's template
      customFormula: preset === 'custom'
        ? (FORMULA_PRESETS[d.formulaPreset]?.template ?? DEFAULT_CONFIG.customFormula)
        : d.customFormula,
    }));
  };

  const handleSave = async () => {
    if (formulaError) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/elo-config', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data);
      setDraft(data);
      setSaveResult({ ok: true, msg: 'Configuration saved. Run "Recalculate ELO" to apply to all historical matches.' });
    } catch (err: any) {
      setSaveResult({ ok: false, msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setRecalcResult(null);
    setRecalcError(null);
    setConfirming(false);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/recalculate-elo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Recalculation failed');
      setRecalcResult(data);
    } catch (err: any) {
      setRecalcError(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyber-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Constants */}
      <div className="glass-panel rounded-xl border border-white/10 p-6 space-y-5">
        <h3 className="text-sm font-display font-bold text-cyber-cyan uppercase tracking-widest flex items-center gap-2">
          <Settings size={16} /> Formula Constants
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">K-Factor</label>
            <input
              type="number" min={1} max={200}
              value={draft.kFactor}
              onChange={e => setField('kFactor', Number(e.target.value))}
              className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-cyber-purple focus:outline-none"
            />
            <p className="text-xs text-gray-500">Max points per match (default 32)</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Initial ELO</label>
            <input
              type="number" min={100} max={5000}
              value={draft.initialElo}
              onChange={e => setField('initialElo', Number(e.target.value))}
              className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-cyber-purple focus:outline-none"
            />
            <p className="text-xs text-gray-500">Starting rating (default 1200)</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">D-Factor</label>
            <input
              type="number" min={50} max={2000}
              value={draft.dFactor}
              onChange={e => setField('dFactor', Number(e.target.value))}
              className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-cyber-purple focus:outline-none"
            />
            <p className="text-xs text-gray-500">Spread in win-probability curve (default 200, chess 400)</p>
          </div>
        </div>
      </div>

      {/* Formula preset */}
      <div className="glass-panel rounded-xl border border-white/10 p-6 space-y-4">
        <h3 className="text-sm font-display font-bold text-cyber-purple uppercase tracking-widest flex items-center gap-2">
          <TrendingUp size={16} /> Formula
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(FORMULA_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key as EloConfig['formulaPreset'])}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                draft.formulaPreset === key
                  ? 'border-cyber-purple bg-cyber-purple/10'
                  : 'border-white/10 hover:border-white/30 bg-black/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {draft.formulaPreset === key && <Check size={13} className="text-cyber-purple shrink-0" />}
                <span className="text-sm font-bold text-white">{preset.label}</span>
              </div>
              <p className="text-xs text-gray-400">{preset.description}</p>
            </button>
          ))}
        </div>

        {/* Show formula string for non-custom presets */}
        {draft.formulaPreset !== 'custom' && (
          <div className="bg-black/40 rounded-lg px-4 py-3 font-mono text-xs text-gray-400 space-y-1">
            <p className="text-gray-500 uppercase text-[10px] tracking-widest mb-2">Active formula</p>
            <p className="break-all">{FORMULA_PRESETS[draft.formulaPreset]?.template}</p>
          </div>
        )}

        {/* Custom formula editor */}
        {draft.formulaPreset === 'custom' && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            {/* Custom Constants */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Custom Constants</h4>
              <p className="text-xs text-gray-500">Define named constants you can reference in your formula.</p>
              <ConstantsEditor
                constants={draft.customConstants}
                onChange={c => setField('customConstants', c)}
              />
            </div>

            {/* Formula input */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Formula Expression</h4>
              <p className="text-xs text-gray-500">
                Write a JS expression that returns the ELO delta (points gained by the winner).
                The expression runs in a sandboxed context — no access to external APIs or globals beyond what's listed below.
              </p>
              <FormulaEditor
                value={draft.customFormula}
                onChange={v => setField('customFormula', v)}
                error={formulaError}
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div className="glass-panel rounded-xl border border-white/10 p-6 space-y-3">
        <h3 className="text-xs font-display font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Info size={14} /> ELO Delta Preview
          <span className="text-gray-600 font-normal normal-case tracking-normal">(sample score 11-5 for score-aware formulas)</span>
        </h3>
        <FormulaPreview config={draft} />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty || !!formulaError}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyber-purple hover:bg-cyber-purple/80 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {!isDirty && <span className="text-xs text-gray-500 font-mono">No unsaved changes</span>}
        {formulaError && isDirty && <span className="text-xs text-red-400 font-mono">Fix formula errors before saving</span>}
      </div>

      {saveResult && (
        <div className={`rounded-lg px-4 py-3 text-xs font-mono ${
          saveResult.ok
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {saveResult.msg}
        </div>
      )}

      {/* Recalculate */}
      <div className="glass-panel rounded-xl border border-red-500/20 p-6 space-y-4">
        <h3 className="text-sm font-display font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
          <AlertCircle size={16} /> Danger Zone
        </h3>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-white">Recalculate ELO from Match History</p>
            <p className="text-xs text-gray-400 mt-1">
              Resets all ratings to <span className="text-white font-mono">{config.initialElo}</span> and replays every
              non-friendly match chronologically using the <span className="text-white">saved</span> configuration.
              Save your changes first.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-sm font-bold transition-all"
              >
                <RefreshCw size={14} />
                Recalculate ELO
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-mono">Are you sure?</span>
                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {recalculating ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                  {recalculating ? 'Recalculating...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {recalcResult && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-xs font-mono text-green-400">
            Done — {recalcResult.matchesReplayed} matches replayed, {recalcResult.playersUpdated} players updated.
          </div>
        )}
        {recalcError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-xs font-mono text-red-400">
            Error: {recalcError}
          </div>
        )}
      </div>
    </div>
  );
};
