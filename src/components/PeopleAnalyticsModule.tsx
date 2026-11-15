import React, { useState } from 'react';
import { useCcb } from '../context/CcbContext';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  AlertCircle,
  Building,
  ShieldCheck,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import { PEOPLE_ANALYTICS_SQL, SALARY_DISTORTION_SQL } from '../utils/sqlTemplates';

export const PeopleAnalyticsModule: React.FC = () => {
  const { currentCompany, currentTenantId, employees, jobs, metrics } = useCcb();

  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'distortions' | 'sql'>('overview');

  // Compute departmental stats
  const departments = Array.from(new Set(jobs.map((j) => j.department)));

  const departmentStats = departments.map((dept) => {
    const deptJobs = jobs.filter((j) => j.department === dept);
    const deptJobIds = new Set(deptJobs.map((j) => j.id));
    const deptEmployees = employees.filter(
      (e) => deptJobIds.has(e.job_id) && (e.status === 'active' || e.status === 'vacation')
    );

    const deptPayroll = deptEmployees.reduce((sum, emp) => {
      const job = deptJobs.find((j) => j.id === emp.job_id);
      return sum + (job ? Number(job.base_salary) : 0);
    }, 0);

    const salaries = deptEmployees
      .map((emp) => {
        const job = deptJobs.find((j) => j.id === emp.job_id);
        return job ? Number(job.base_salary) : 0;
      })
      .filter((s) => s > 0);

    const minSalary = salaries.length ? Math.min(...salaries) : 0;
    const maxSalary = salaries.length ? Math.max(...salaries) : 0;
    const avgSalary = deptEmployees.length ? deptPayroll / deptEmployees.length : 0;

    return {
      department: dept,
      headcount: deptEmployees.length,
      payroll: deptPayroll,
      avgSalary,
      minSalary,
      maxSalary,
    };
  }).sort((a, b) => b.payroll - a.payroll);

  // Compute salary anomalies / distortions
  const salaryDistortions = employees
    .filter((e) => e.status === 'active')
    .map((emp) => {
      const job = jobs.find((j) => j.id === emp.job_id);
      if (!job) return null;
      const deptStat = departmentStats.find((d) => d.department === job.department);
      if (!deptStat || deptStat.headcount <= 1) return null;

      const diff = job.base_salary - deptStat.avgSalary;
      const percentageDiff = (diff / deptStat.avgSalary) * 100;

      return {
        employee: emp,
        job,
        deptAvg: deptStat.avgSalary,
        diff,
        percentageDiff,
        isSignificant: Math.abs(percentageDiff) > 35,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b!.diff) - Math.abs(a!.diff));

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSql(id);
    setTimeout(() => setCopiedSql(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              FINANCEIRO & PEOPLE ANALYTICS
            </span>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Inteligência Gerencial e Auditoria de Folha
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Análise agregada de headcount ativo, massa salarial (<code>base_salary</code>) e detecção de assimetrias por departamento.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('distortions')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'distortions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Detector de Distorções
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'sql'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Queries SQL (RLS)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Headcount Ativo</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics.activeHeadcount}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{metrics.activeHeadcount} ativos</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">{metrics.vacationHeadcount} em férias</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Massa Salarial Mensal</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            R$ {metrics.totalPayroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">
            Soma de <code>base_salary</code> dos ativos
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Salário Médio</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            R$ {metrics.averageSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">
            Média ponderada por colaborador
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Departamentos Ativos</span>
            <Building className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {departmentStats.length}
          </div>
          <div className="text-[11px] text-slate-400">
            Centros de custo mapeados no tenant
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Distribuição da Massa Salarial por Departamento</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Filtro RLS: tenant_id = {currentTenantId.substring(0, 8)}...
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Departamento</th>
                    <th className="py-3 px-4 text-center">Headcount</th>
                    <th className="py-3 px-4 text-right">Folha Mensal</th>
                    <th className="py-3 px-4 text-right">Salário Médio</th>
                    <th className="py-3 px-4 text-right">Mínimo</th>
                    <th className="py-3 px-4 text-right">Máximo</th>
                    <th className="py-3 px-4 text-right">% do Orçamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {departmentStats.map((dept) => {
                    const pctOfTotal = metrics.totalPayroll > 0
                      ? (dept.payroll / metrics.totalPayroll) * 100
                      : 0;

                    return (
                      <tr key={dept.department} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span>{dept.department}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold">
                          {dept.headcount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          R$ {dept.payroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                          R$ {dept.avgSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                          R$ {dept.minSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                          R$ {dept.maxSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-indigo-300 font-semibold">
                          <div className="flex items-center justify-end gap-2">
                            <span>{pctOfTotal.toFixed(1)}%</span>
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${pctOfTotal}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'distortions' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-100">Auditoria Automática de Disparidades Salariais</h4>
              <p className="text-amber-300/90 mt-0.5">
                O motor analisa os colaboradores cujo <code>base_salary</code> difere significativamente (&gt;35%) da média de seu departamento de atuação, alertando para possíveis distorções de mercado ou desequilíbrios de retenção.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Cargo & Departamento</th>
                    <th className="py-3 px-4 text-right">Salário Base</th>
                    <th className="py-3 px-4 text-right">Média do Setor</th>
                    <th className="py-3 px-4 text-right">Desvio (%)</th>
                    <th className="py-3 px-4 text-center">Nível de Alerta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {salaryDistortions.map((item, idx) => {
                    if (!item) return null;
                    const isPositive = item.diff > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {item.employee.full_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-200 font-semibold">{item.job.title}</div>
                          <div className="text-[10px] text-slate-500">{item.job.department}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          R$ {item.job.base_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                          R$ {item.deptAvg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold ${
                            isPositive ? 'text-indigo-400' : 'text-amber-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}{item.percentageDiff.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.isSignificant ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              Disparidade Relevante
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                              Alinhado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sql' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold text-white text-xs">
                  Query de Massa Salarial e Headcount (RLS Obrigatório)
                </h4>
              </div>
              <button
                onClick={() => copyCode(PEOPLE_ANALYTICS_SQL(currentTenantId), 'pa-sql')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
              >
                {copiedSql === 'pa-sql' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800/80">
              <code>{PEOPLE_ANALYTICS_SQL(currentTenantId)}</code>
            </pre>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold text-white text-xs">
                  Query de Detecção de Disparidades Salariais com CTE
                </h4>
              </div>
              <button
                onClick={() => copyCode(SALARY_DISTORTION_SQL(currentTenantId), 'dist-sql')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
              >
                {copiedSql === 'dist-sql' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800/80">
              <code>{SALARY_DISTORTION_SQL(currentTenantId)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
