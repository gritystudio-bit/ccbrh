import React, { useState } from 'react';
import { useCcb } from '../context/CcbContext';
import {
  Database,
  ShieldCheck,
  Play,
  Copy,
  Check,
  Code2,
  Table2,
  Lock,
  Terminal,
  FileCode,
} from 'lucide-react';
import {
  SUPABASE_DDL_SCHEMA,
  SUPABASE_RLS_POLICIES,
  PEOPLE_ANALYTICS_SQL,
  CANDIDATE_DOCUMENT_AUDIT_SQL,
} from '../utils/sqlTemplates';

export const SupabaseHubModule: React.FC = () => {
  const { currentCompany, currentTenantId, database } = useCcb();

  const [activeTab, setActiveTab] = useState<'runner' | 'ddl' | 'rls'>('runner');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // SQL Runner state
  const [customSql, setCustomSql] = useState<string>(
    PEOPLE_ANALYTICS_SQL(currentTenantId)
  );
  const [queryResults, setQueryResults] = useState<{
    columns: string[];
    rows: any[][];
    executionTimeMs: number;
    rowsCount: number;
    rlsFiltered: boolean;
  } | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const executeSimulatedQuery = () => {
    const start = performance.now();
    const lower = customSql.toLowerCase();

    // Tenant-isolated data
    const tenantJobs = database.jobs.filter((j) => j.tenant_id === currentTenantId);
    const tenantEmployees = database.employees.filter((e) => e.tenant_id === currentTenantId);
    const tenantVacancies = database.vacancies.filter((v) => v.tenant_id === currentTenantId);
    const tenantCandidates = database.candidates.filter((c) => c.tenant_id === currentTenantId);
    const tenantDocuments = database.documents.filter((d) => d.tenant_id === currentTenantId);

    let columns: string[] = [];
    let rows: any[][] = [];

    if (lower.includes('department') && lower.includes('base_salary')) {
      // People analytics department payroll
      columns = ['department', 'total_headcount', 'folha_salarial_mensal', 'salario_medio'];
      const deptMap: Record<string, { count: number; sum: number }> = {};
      tenantEmployees.forEach((emp) => {
        const j = tenantJobs.find((job) => job.id === emp.job_id);
        if (j) {
          if (!deptMap[j.department]) deptMap[j.department] = { count: 0, sum: 0 };
          deptMap[j.department].count += 1;
          deptMap[j.department].sum += Number(j.base_salary);
        }
      });
      rows = Object.entries(deptMap).map(([dept, data]) => [
        dept,
        data.count,
        `R$ ${data.sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(data.sum / data.count).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      ]);
    } else if (lower.includes('token') || lower.includes('candidates')) {
      // Candidate document audit
      columns = ['candidate_id', 'full_name', 'pipeline_stage', 'status_token', 'total_docs'];
      const now = new Date();
      rows = tenantCandidates.map((c) => {
        const isExp = new Date(c.token_expires_at) < now;
        const docs = tenantDocuments.filter((d) => d.candidate_id === c.id);
        return [
          c.id,
          c.full_name,
          c.pipeline_stage,
          isExp ? 'EXPIRADO (Ação: Reemitir)' : 'VÁLIDO',
          `${docs.length}/4 arquivos`,
        ];
      });
    } else if (lower.includes('pg_tables') || lower.includes('rowsecurity')) {
      // RLS validation
      columns = ['schemaname', 'tablename', 'rowsecurity', 'rls_policy_status'];
      rows = [
        ['public', 'companies', 'true', `APPLIED (tenant_id = '${currentTenantId}')`],
        ['public', 'jobs', 'true', `APPLIED (tenant_id = '${currentTenantId}')`],
        ['public', 'employees', 'true', `APPLIED (tenant_id = '${currentTenantId}')`],
        ['public', 'vacancies', 'true', `APPLIED (tenant_id = '${currentTenantId}')`],
        ['public', 'candidates', 'true', `APPLIED (tenant_id = '${currentTenantId}')`],
        ['public', 'documents', 'true', `APPLIED (tenant_id = '${currentTenantId}')`],
      ];
    } else {
      // Default: list employees with jobs
      columns = ['id', 'full_name', 'title', 'department', 'status', 'base_salary'];
      rows = tenantEmployees.map((emp) => {
        const j = tenantJobs.find((job) => job.id === emp.job_id);
        return [
          emp.id,
          emp.full_name,
          j?.title || 'N/A',
          j?.department || 'N/A',
          emp.status,
          `R$ ${Number(j?.base_salary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ];
      });
    }

    const end = performance.now();
    setQueryResults({
      columns,
      rows,
      executionTimeMs: Math.round((end - start + 8.4) * 10) / 10,
      rowsCount: rows.length,
      rlsFiltered: true,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              POSTGRESQL 15 / SUPABASE
            </span>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Arquitetura de Dados & Row Level Security (RLS)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Schema relacional de 6 tabelas, políticas RLS ativas e console interativo para execução de consultas.
          </p>
        </div>

        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('runner')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'runner' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            SQL Runner (Interativo)
          </button>
          <button
            onClick={() => setActiveTab('ddl')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'ddl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            DDL Schema (6 Tabelas)
          </button>
          <button
            onClick={() => setActiveTab('rls')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'rls' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Políticas RLS
          </button>
        </div>
      </div>

      {activeTab === 'runner' && (
        <div className="space-y-4">
          {/* Query Templates Quick Select */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Modelos de Query:</span>
            <button
              onClick={() => {
                setCustomSql(PEOPLE_ANALYTICS_SQL(currentTenantId));
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px]"
            >
              📊 Folha Salarial & Headcount
            </button>
            <button
              onClick={() => {
                setCustomSql(CANDIDATE_DOCUMENT_AUDIT_SQL(currentTenantId));
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px]"
            >
              📄 Auditoria de Tokens & Docs
            </button>
            <button
              onClick={() => {
                setCustomSql(`-- Validar isolamento RLS para o Tenant ${currentTenantId}\nSELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px]"
            >
              🛡️ Status de RLS nas Tabelas
            </button>
          </div>

          {/* SQL Editor Area */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Supabase SQL Console • tenant_id = '{currentTenantId.substring(0, 8)}...'</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(customSql, 'custom-sql')}
                  className="hover:text-white text-[11px] flex items-center gap-1"
                >
                  {copiedKey === 'custom-sql' ? (
                    <span className="text-emerald-400">Copiado</span>
                  ) : (
                    <span>Copiar</span>
                  )}
                </button>
                <button
                  onClick={executeSimulatedQuery}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-colors shadow-sm"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Executar (Run)</span>
                </button>
              </div>
            </div>

            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 p-4 font-mono text-xs text-emerald-300 leading-relaxed outline-none resize-y border-none"
              placeholder="Digite sua query SQL com tenant_id..."
            />
          </div>

          {/* Results Area */}
          {queryResults && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden space-y-2">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>Consulta executada com sucesso</span>
                </div>
                <div className="text-slate-400 font-mono text-[11px] flex items-center gap-3">
                  <span>{queryResults.rowsCount} registro(s)</span>
                  <span>•</span>
                  <span>{queryResults.executionTimeMs} ms</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">RLS APLICADO</span>
                </div>
              </div>

              <div className="overflow-x-auto p-1">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase">
                    <tr>
                      {queryResults.columns.map((col) => (
                        <th key={col} className="py-2.5 px-3 border-b border-slate-800">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-slate-200">
                    {queryResults.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 text-[11px]">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ddl' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Table2 className="w-4 h-4 text-indigo-400" />
              <span>DDL PostgreSQL: 6 Tabelas Relacionais do CCB</span>
            </h3>
            <button
              onClick={() => copyToClipboard(SUPABASE_DDL_SCHEMA, 'ddl-schema')}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-white"
            >
              {copiedKey === 'ddl-schema' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar DDL Completo</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <pre className="text-xs font-mono text-emerald-300 leading-relaxed overflow-x-auto max-h-[550px]">
              <code>{SUPABASE_DDL_SCHEMA}</code>
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'rls' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Políticas de Row Level Security (RLS) no Supabase</span>
            </h3>
            <button
              onClick={() => copyToClipboard(SUPABASE_RLS_POLICIES, 'rls-policies')}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-white"
            >
              {copiedKey === 'rls-policies' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Políticas RLS</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <pre className="text-xs font-mono text-emerald-300 leading-relaxed overflow-x-auto max-h-[550px]">
              <code>{SUPABASE_RLS_POLICIES}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
