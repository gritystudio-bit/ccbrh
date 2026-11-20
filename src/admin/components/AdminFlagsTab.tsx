import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Flag,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { AdminTheme, FeatureFlagRecord } from '../types';
import {
  createFeatureFlag,
  fetchFeatureFlags,
  toggleFeatureFlag,
  updateFeatureFlagRules,
} from '../services/adminService';

interface AdminFlagsTabProps {
  theme: AdminTheme;
  adminUserId: string;
  onMaintenanceChange?: (active: boolean) => void;
}

export const AdminFlagsTab: React.FC<AdminFlagsTabProps> = ({
  theme,
  adminUserId,
  onMaintenanceChange,
}) => {
  const isDark = theme === 'dark';
  const [flags, setFlags] = useState<FeatureFlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal nova flag
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newDescricao, setNewDescricao] = useState('');
  const [newAtivo, setNewAtivo] = useState(false);
  const [newRegrasJson, setNewRegrasJson] = useState('{}');
  const [creating, setCreating] = useState(false);

  // Edição de parâmetros JSONB
  const [editingRulesFlag, setEditingRulesFlag] = useState<FeatureFlagRecord | null>(null);
  const [rulesDraft, setRulesDraft] = useState('{}');
  const [savingRules, setSavingRules] = useState(false);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchFeatureFlags();
      setFlags(list);
      const maint = list.find((f) => f.id === 'maintenance_mode');
      onMaintenanceChange?.(Boolean(maint?.ativo));
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao carregar feature flags.',
      });
    } finally {
      setLoading(false);
    }
  }, [onMaintenanceChange]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  const handleToggle = async (flag: FeatureFlagRecord) => {
    setTogglingId(flag.id);
    setFeedback(null);
    try {
      const updated = await toggleFeatureFlag(flag.id, !flag.ativo, adminUserId);
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? updated : f)));
      if (flag.id === 'maintenance_mode') {
        onMaintenanceChange?.(updated.ativo);
      }
      setFeedback({
        type: 'success',
        message: `Flag "${updated.nome}" ${updated.ativo ? 'ativada' : 'desativada'} em tempo real.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao atualizar flag.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    let parsedRules: Record<string, unknown> = {};
    try {
      const raw = JSON.parse(newRegrasJson.trim() || '{}') as unknown;
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new Error('O JSON de regras precisa ser um objeto válido.');
      }
      parsedRules = raw as Record<string, unknown>;
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'JSON de regras inválido.',
      });
      return;
    }

    setCreating(true);
    try {
      await createFeatureFlag({
        id: newId,
        nome: newNome,
        descricao: newDescricao,
        ativo: newAtivo,
        regras: parsedRules,
        updatedBy: adminUserId,
      });
      setShowCreateModal(false);
      setNewId('');
      setNewNome('');
      setNewDescricao('');
      setNewAtivo(false);
      setNewRegrasJson('{}');
      setFeedback({ type: 'success', message: 'Nova feature flag criada com sucesso.' });
      await loadFlags();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao criar feature flag.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRulesFlag) return;
    setFeedback(null);
    let parsed: Record<string, unknown> = {};
    try {
      const raw = JSON.parse(rulesDraft.trim() || '{}') as unknown;
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new Error('As regras devem ser um objeto JSON.');
      }
      parsed = raw as Record<string, unknown>;
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'JSON inválido.',
      });
      return;
    }

    setSavingRules(true);
    try {
      const updated = await updateFeatureFlagRules(editingRulesFlag.id, parsed, adminUserId);
      setFlags((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setEditingRulesFlag(null);
      setFeedback({ type: 'success', message: `Parâmetros de "${updated.nome}" atualizados.` });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao salvar parâmetros.',
      });
    } finally {
      setSavingRules(false);
    }
  };

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-700 text-slate-100'
    : 'bg-white border-slate-300 text-slate-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9F8548]">
            Controle em Tempo Real & Parâmetros Globais
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Feature Flags</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadFlags()}
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 rounded-xl border text-xs font-semibold cursor-pointer ${cardClass}`}
          >
            <RefreshCw className={`w-4 h-4 text-[#f5a90e] ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 rounded-xl bg-[#082175] text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#f5a90e]" />
            <span>Nova Flag</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#f5a90e]" />
          <span className={`text-xs ${mutedText}`}>Carregando flags da plataforma...</span>
        </div>
      ) : flags.length === 0 ? (
        <div className={`rounded-xl border p-12 text-center space-y-2 ${cardClass}`}>
          <Flag className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-sm font-bold">Nenhuma feature flag encontrada</p>
          <p className={`text-xs ${mutedText}`}>Crie a primeira flag para controlar recursos em tempo real.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flags.map((flag) => {
            const isMaintenance = flag.id === 'maintenance_mode';
            return (
              <div
                key={flag.id}
                className={`rounded-xl border p-5 flex flex-col justify-between gap-4 ${
                  isMaintenance && flag.ativo
                    ? 'border-red-500 bg-red-500/10'
                    : cardClass
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isMaintenance && <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />}
                      <h2 className="text-sm font-bold truncate">{flag.nome}</h2>
                    </div>
                    <p className="text-[11px] font-mono text-[#9F8548]">{flag.id}</p>
                    {flag.descricao && <p className={`text-xs leading-relaxed ${mutedText}`}>{flag.descricao}</p>}
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={flag.ativo}
                    aria-label={`Alternar ${flag.nome}`}
                    disabled={togglingId === flag.id}
                    onClick={() => void handleToggle(flag)}
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-extrabold transition-colors cursor-pointer shrink-0 ${
                      flag.ativo
                        ? isMaintenance
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {togglingId === flag.id ? '...' : flag.ativo ? 'ATIVO' : 'INATIVO'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className={mutedText}>
                    Atualizado em {new Date(flag.updated_at).toLocaleString('pt-BR')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRulesFlag(flag);
                      setRulesDraft(JSON.stringify(flag.regras || {}, null, 2));
                    }}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:border-[#f5a90e] cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-[#f5a90e]" />
                    <span>Parâmetros JSON</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar Nova Flag */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl ${cardClass}`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold">Criar Nova Feature Flag</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFlag} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Chave / ID (slug)</label>
                <input
                  type="text"
                  required
                  value={newId}
                  onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="ex: beta_organograma_v2"
                  className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nome amigável</label>
                <input
                  type="text"
                  required
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Novo Organograma Interativo"
                  className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={newDescricao}
                  onChange={(e) => setNewDescricao(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-xs ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Regras / Parâmetros (JSON)</label>
                <textarea
                  rows={3}
                  value={newRegrasJson}
                  onChange={(e) => setNewRegrasJson(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-xs font-mono ${inputClass}`}
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAtivo}
                  onChange={(e) => setNewAtivo(e.target.checked)}
                />
                <span>Criar já ativada</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`min-h-[44px] px-4 rounded-xl border text-xs font-semibold cursor-pointer ${cardClass}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="min-h-[44px] px-5 rounded-xl bg-[#082175] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {creating ? 'Criando...' : 'Criar Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Regras JSONB */}
      {editingRulesFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl ${cardClass}`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Parâmetros Globais</h2>
                <p className="text-xs font-mono text-[#9F8548]">{editingRulesFlag.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRulesFlag(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRules} className="p-6 space-y-4">
              <textarea
                rows={8}
                value={rulesDraft}
                onChange={(e) => setRulesDraft(e.target.value)}
                className={`w-full p-3 rounded-xl border text-xs font-mono ${inputClass}`}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRulesFlag(null)}
                  className={`min-h-[44px] px-4 rounded-xl border text-xs font-semibold cursor-pointer ${cardClass}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRules}
                  className="min-h-[44px] px-5 rounded-xl bg-[#082175] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {savingRules ? 'Salvando...' : 'Salvar Parâmetros'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
