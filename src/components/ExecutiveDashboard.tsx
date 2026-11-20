import React, { useState, useEffect } from 'react';
import { useCcb } from '../context/CcbContext';
import { ModuleBanner } from './ui/ModuleBanner';
import {
  Users,
  DollarSign,
  Briefcase,
  UserCheck,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface ExecutiveDashboardProps {
  onNavigateTab: (
    tab: 'recruitment' | 'vacancies' | 'employees' | 'payroll' | 'legal' | 'portal'
  ) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigateTab }) => {
  const {
    currentCompany,
    currentTenantId,
    employees,
    jobs,
    vacancies,
    candidates,
    documents,
    metrics,
    reissueCandidateToken,
  } = useCcb();

  const companyName = currentCompany?.name || 'Empresa Cliente';

  const isVarandaClient =
    currentCompany?.id === '6aad6854-8c72-8d7b-6fc7-597100000001' ||
    companyName.toLowerCase().includes('varanda');

  const [breakdownMode, setBreakdownMode] = useState<'department' | 'role'>(
    isVarandaClient ? 'role' : 'department'
  );

  useEffect(() => {
    setBreakdownMode(isVarandaClient ? 'role' : 'department');
  }, [currentTenantId, isVarandaClient]);

  // Departments breakdown
  const departments = Array.from(new Set(jobs.map((j) => j.department)));
  const departmentBreakdown = departments
    .map((dept) => {
      const deptJobs = jobs.filter((j) => j.department === dept);
      const jobIds = new Set(deptJobs.map((j) => j.id));
      const deptEmployees = employees.filter(
        (e) => jobIds.has(e.job_id) && (e.status === 'active' || e.status === 'vacation')
      );
      const openPositions = vacancies
        .filter((v) => v.status === 'open' && jobIds.has(v.job_id))
        .reduce((sum, v) => sum + (v.vacancies_count || 1), 0);
      const payroll = deptEmployees.reduce((sum, emp) => {
        const job = deptJobs.find((j) => j.id === emp.job_id);
        return sum + (job ? Number(job.base_salary) : 0);
      }, 0);

      return {
        department: dept,
        headcount: deptEmployees.length,
        openPositions,
        payroll,
        avgSalary: deptEmployees.length ? payroll / deptEmployees.length : 0,
      };
    })
    .sort((a, b) => b.payroll - a.payroll);

  // Roles (Cargos) breakdown aligned with registered vacancies
  const roleBreakdown = jobs
    .map((job) => {
      const roleEmployees = employees.filter(
        (e) => e.job_id === job.id && (e.status === 'active' || e.status === 'vacation')
      );
      const openPositions = vacancies
        .filter((v) => v.status === 'open' && v.job_id === job.id)
        .reduce((sum, v) => sum + (v.vacancies_count || 1), 0);
      const payroll = roleEmployees.length * Number(job.base_salary);

      return {
        jobId: job.id,
        title: job.title,
        department: job.department,
        headcount: roleEmployees.length,
        openPositions,
        payroll,
        baseSalary: Number(job.base_salary),
      };
    })
    .sort((a, b) => {
      if (b.payroll !== a.payroll) return b.payroll - a.payroll;
      if (b.openPositions !== a.openPositions) return b.openPositions - a.openPositions;
      return b.baseSalary - a.baseSalary;
    });

  // Urgent operational alerts
  const now = new Date();
  const expiredCandidates = candidates.filter(
    (c) =>
      (c.pipeline_stage === 'proposta' || c.pipeline_stage === 'aprovado') &&
      new Date(c.token_expires_at) < now
  );

  const pendingReviewDocs = documents.filter((d) => d.status === 'pending_review');
  const approvedCandidates = candidates.filter((c) => c.pipeline_stage === 'aprovado');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <ModuleBanner
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 text-[#f5a90e] text-[10px] font-bold">
            Painel da Diretoria e Gestão de Pessoas
          </span>
        }
        title={`Resumo Gerencial · ${companyName}`}
        subtitle="Acompanhamento consolidado do quadro de colaboradores, folha de pagamento, contratações e documentos."
        actions={
          <>
            <button
              onClick={() => onNavigateTab('recruitment')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#f5a90e] hover:bg-[#e59b05] text-[#082175] font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Processo Seletivo</span>
            </button>
            <button
              onClick={() => onNavigateTab('payroll')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-[#f5a90e]" />
              <span>Folha de Pagamento</span>
            </button>
            <button
              onClick={() => onNavigateTab('employees')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#f5a90e]" />
              <span>Ver Funcionários</span>
            </button>
          </>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Quadro de Colaboradores</span>
            <div className="w-8 h-8 rounded-lg bg-[#E0F4F7] text-[#03416A] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            {metrics.totalHeadcount}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-700">
              {metrics.activeHeadcount} trabalhando
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#9F8548]">
              {metrics.vacationHeadcount} em férias
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Folha de Pagamento Mensal</span>
            <div className="w-8 h-8 rounded-lg bg-[#9F8548]/12 text-[#9F8548] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            R$ {metrics.totalPayroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Salário médio:{' '}
            <strong className="text-[#03416A] font-mono tabular-nums">
              R$ {metrics.averageSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Vagas Abertas</span>
            <div className="w-8 h-8 rounded-lg bg-[#082175]/8 text-[#082175] flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            {metrics.activeVacanciesCount}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <span>Portais:</span>
            <span className="font-semibold text-[#03416A]">LinkedIn, Indeed, Site Próprio</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Candidatos em Seleção</span>
            <div className="w-8 h-8 rounded-lg bg-[#c7d2fe]/60 text-[#082175] flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            {metrics.candidatesInPipelineCount}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-700">
              {approvedCandidates.length} aprovados
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#03416A]">
              {candidates.filter((c) => c.pipeline_stage === 'proposta').length} em proposta
            </span>
          </div>
        </div>
      </div>

      {/* Operational Alerts & Action Items */}
      {(expiredCandidates.length > 0 || pendingReviewDocs.length > 0 || approvedCandidates.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-[#082175] font-bold text-xs tracking-wide">
            <AlertTriangle className="w-4 h-4 text-[#9F8548]" />
            <span>Avisos e Pendências Operacionais do RH</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {expiredCandidates.length > 0 && (
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-bold text-[#03416A]">
                    {expiredCandidates.length} link(s) de envio de documentos vencido(s)
                  </span>
                  <p className="text-slate-600 mt-1 text-[11px]">
                    Candidatos em fase de contratação não conseguem anexar os documentos pelo celular ou computador.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await Promise.all(
                      expiredCandidates.map((c) => reissueCandidateToken(c.id))
                    );
                    alert('Todos os links vencidos foram renovados por mais 7 dias!');
                  }}
                  className="mt-2.5 text-xs font-bold text-[#9F8548] hover:text-[#082175] flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Renovar Validade (+7 dias)</span>
                </button>
              </div>
            )}

            {pendingReviewDocs.length > 0 && (
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-bold text-[#03416A]">
                    {pendingReviewDocs.length} documento(s) aguardando conferência
                  </span>
                  <p className="text-slate-600 mt-1 text-[11px]">
                    RG, CPF ou comprovante de residência enviados pelos candidatos aguardando aprovação do RH.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('recruitment')}
                  className="mt-2.5 text-xs font-bold text-[#082175] hover:text-[#9F8548] flex items-center gap-1 transition-colors"
                >
                  <span>Conferir em Recrutamento</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {approvedCandidates.length > 0 && (
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-bold text-[#03416A]">
                    {approvedCandidates.length} candidato(s) pronto(s) para admissão
                  </span>
                  <p className="text-slate-600 mt-1 text-[11px]">
                    Documentação completa. Conclua a contratação e adicione ao organograma da empresa.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('recruitment')}
                  className="mt-2.5 text-xs font-bold text-[#082175] hover:text-[#9F8548] flex items-center gap-1 transition-colors"
                >
                  <span>Efetivar Admissão</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quadro e Custos por Cargo / Departamento */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-[#082175] text-sm">
                {breakdownMode === 'role'
                  ? 'Distribuição de Funcionários e Salários por Cargo'
                  : 'Distribuição de Funcionários e Salários por Departamento'}
              </h3>
              <p className="text-xs text-slate-500">
                {breakdownMode === 'role'
                  ? 'Alinhamento de colaboradores, vagas abertas e folha mensal por cargo cadastrado'
                  : 'Quantidade de colaboradores e total de salários pagos mensalmente por setor'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setBreakdownMode('role')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    breakdownMode === 'role'
                      ? 'bg-[#082175] text-white'
                      : 'text-slate-600 hover:text-[#082175]'
                  }`}
                >
                  Por Cargo
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownMode('department')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    breakdownMode === 'department'
                      ? 'bg-[#082175] text-white'
                      : 'text-slate-600 hover:text-[#082175]'
                  }`}
                >
                  Por Departamento
                </button>
              </div>

              <button
                onClick={() => onNavigateTab('employees')}
                className="text-xs font-semibold text-[#03416A] hover:text-[#9F8548] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Ver Funcionários</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {breakdownMode === 'role' ? (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Cargo</th>
                    <th className="py-2.5 px-3 text-center">Vagas Abertas</th>
                    <th className="py-2.5 px-3 text-center">Colaboradores</th>
                    <th className="py-2.5 px-3 text-right">Folha Mensal</th>
                    <th className="py-2.5 px-3 text-right">Salário Base</th>
                    <th className="py-2.5 px-3 text-right">Participação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {roleBreakdown.map((role) => {
                    const pct =
                      metrics.totalPayroll > 0
                        ? (role.payroll / metrics.totalPayroll) * 100
                        : 0;

                    return (
                      <tr key={role.jobId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#03416A]">{role.title}</div>
                          <div className="text-[10px] text-slate-400">{role.department}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                          {role.openPositions > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#082175]/8 text-[#082175] font-semibold text-[11px]">
                              {role.openPositions}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-medium">
                          {role.headcount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#082175]">
                          R$ {role.payroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                          R$ {role.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2 font-mono tabular-nums text-xs">
                            <span className="font-semibold text-slate-700">{pct.toFixed(0)}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#082175] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Departamento</th>
                    <th className="py-2.5 px-3 text-center">Colaboradores</th>
                    <th className="py-2.5 px-3 text-right">Folha Mensal</th>
                    <th className="py-2.5 px-3 text-right">Salário Médio</th>
                    <th className="py-2.5 px-3 text-right">Participação na Folha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {departmentBreakdown.map((dept) => {
                    const pct =
                      metrics.totalPayroll > 0
                        ? (dept.payroll / metrics.totalPayroll) * 100
                        : 0;

                    return (
                      <tr key={dept.department} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-[#03416A]">
                          {dept.department}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums font-medium">
                          {dept.headcount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#082175]">
                          R$ {dept.payroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                          R$ {dept.avgSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2 font-mono tabular-nums text-xs">
                            <span className="font-semibold text-slate-700">{pct.toFixed(0)}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#082175] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
      </div>
    </div>
  );
};
