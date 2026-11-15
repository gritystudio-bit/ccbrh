import React, { useState, useEffect } from 'react';
import { useCcb } from '../context/CcbContext';
import { ApiSource, Job, Vacancy, VacancyStatus } from '../types/database';
import {
  Briefcase,
  Plus,
  Filter,
  DollarSign,
  TrendingUp,
  Globe,
  X,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';

export const VacanciesModule: React.FC = () => {
  const {
    vacancies,
    jobs,
    candidates,
    branches,
    currentTenantId,
    currentCompany,
    addNewVacancy,
    updateVacancy,
    deleteVacancy,
    addNewJob,
    updateJob,
    deleteJob,
    addCompanyBranch,
  } = useCcb();

  const [activeSection, setActiveSection] = useState<'vacancies' | 'jobs'>('vacancies');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [savingVacancy, setSavingVacancy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New / Edit Job Modal
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [jobDeptInput, setJobDeptInput] = useState('');
  const [jobSalaryInput, setJobSalaryInput] = useState('');
  const [jobDescInput, setJobDescInput] = useState('');
  const [savingJob, setSavingJob] = useState(false);

  // New / Edit Vacancy Form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newJobId, setNewJobId] = useState(jobs[0]?.id || '');
  const [newBranchId, setNewBranchId] = useState(branches[0]?.id || '');
  const [showInlineBranchForm, setShowInlineBranchForm] = useState(false);
  const [newBranchLabel, setNewBranchLabel] = useState('');
  const [newBranchCnpj, setNewBranchCnpj] = useState('');
  const [newBranchEndereco, setNewBranchEndereco] = useState('');
  const [newBranchCidade, setNewBranchCidade] = useState('');
  const [newBranchEstado, setNewBranchEstado] = useState('SP');
  const [newVacanciesCount, setNewVacanciesCount] = useState(1);
  const [customDepartment, setCustomDepartment] = useState('');
  const [customSalary, setCustomSalary] = useState('');
  const [newApiSource, setNewApiSource] = useState<ApiSource>('internal');
  const [newStatus, setNewStatus] = useState<VacancyStatus>('open');

  const resetVacancyForm = () => {
    setEditingVacancy(null);
    setNewTitle('');
    setNewDescription('');
    setNewJobId(jobs[0]?.id || '');
    setNewBranchId(branches[0]?.id || '');
    setCustomDepartment('');
    setCustomSalary('');
    setNewBranchLabel('');
    setNewBranchCnpj('');
    setNewBranchEndereco('');
    setNewBranchCidade('');
    setNewBranchEstado('SP');
    setShowInlineBranchForm(false);
    setNewVacanciesCount(1);
    setNewApiSource('internal');
    setNewStatus('open');
  };

  const openEditVacancy = (vac: Vacancy) => {
    setEditingVacancy(vac);
    setNewTitle(vac.title);
    setNewDescription(vac.description || '');
    setNewJobId(vac.job_id || '');
    setNewBranchId(vac.branch_id || '');
    setNewVacanciesCount(vac.vacancies_count || 1);
    setNewApiSource(vac.api_source);
    setNewStatus(vac.status);
    setShowInlineBranchForm(false);
    setShowAddModal(true);
  };

  useEffect(() => {
    setNewJobId(jobs[0]?.id || '');
    setNewBranchId(branches[0]?.id || '');
    setShowInlineBranchForm(false);
  }, [currentTenantId, jobs, branches]);

  // Helper metrics
  const totalOpen = vacancies.filter((v) => v.status === 'open').length;
  const totalPaused = vacancies.filter((v) => v.status === 'paused').length;
  const totalCandidateApplications = candidates.length;

  // Filtered vacancies
  const filteredVacancies = vacancies.filter((v) => {
    if (filterSource !== 'all' && v.api_source !== filterSource) return false;
    const job = jobs.find((j) => j.id === v.job_id);
    if (filterDepartment !== 'all' && job?.department !== filterDepartment) return false;
    return true;
  });

  // Calculate salary stats from vacancies
  const totalBudgetSalary = vacancies.reduce((acc, v) => {
    const job = jobs.find((j) => j.id === v.job_id);
    return acc + (job ? Number(job.base_salary) : 0);
  }, 0);

  const avgSalary = vacancies.length > 0 ? totalBudgetSalary / vacancies.length : 0;

  const apiStats = [
    {
      source: 'linkedin',
      name: 'LinkedIn Vagas e Recrutamento',
      count: vacancies.filter((v) => v.api_source === 'linkedin').length,
      apps: candidates.filter((c) => {
        const v = vacancies.find((vac) => vac.id === c.vacancy_id);
        return v?.api_source === 'linkedin';
      }).length,
      accent: 'text-[#082175]',
    },
    {
      source: 'indeed',
      name: 'Portal Indeed Brasil',
      count: vacancies.filter((v) => v.api_source === 'indeed').length,
      apps: candidates.filter((c) => {
        const v = vacancies.find((vac) => vac.id === c.vacancy_id);
        return v?.api_source === 'indeed';
      }).length,
      accent: 'text-[#03416A]',
    },
    {
      source: 'internal',
      name: 'Site da Empresa e Vagas Internas',
      count: vacancies.filter((v) => v.api_source === 'internal').length,
      apps: candidates.filter((c) => {
        const v = vacancies.find((vac) => vac.id === c.vacancy_id);
        return v?.api_source === 'internal';
      }).length,
      accent: 'text-[#9F8548]',
    },
  ];

  const departmentsList = Array.from(new Set(jobs.map((j) => j.department)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {feedback && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548] tracking-wide">
            Gestão de Vagas e Cargos
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] tracking-tight mt-1">
            Vagas, Cargos e Portais Integrados
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gerencie vagas abertas, estrutura de cargos/salários base e portais públicos de vagas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setActiveSection('vacancies')}
              className={`px-3 py-1.5 rounded-md font-semibold ${
                activeSection === 'vacancies'
                  ? 'bg-[#082175] text-white'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              Vagas ({vacancies.length})
            </button>
            <button
              onClick={() => setActiveSection('jobs')}
              className={`px-3 py-1.5 rounded-md font-semibold ${
                activeSection === 'jobs'
                  ? 'bg-[#082175] text-white'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              Cargos e Salários ({jobs.length})
            </button>
          </div>

          {activeSection === 'vacancies' ? (
            <button
              onClick={() => {
                resetVacancyForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4 text-[#f5a90e]" />
              <span>Publicar Nova Vaga</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingJob(null);
                setJobTitleInput('');
                setJobDeptInput('');
                setJobSalaryInput('');
                setJobDescInput('');
                setShowJobModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4 text-[#f5a90e]" />
              <span>Novo Cargo</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total de Vagas Ativas</span>
            <div className="w-8 h-8 rounded-lg bg-[#E0F4F7] text-[#03416A] flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            {totalOpen}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {totalPaused} vagas pausadas no período
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Candidaturas via Portais</span>
            <div className="w-8 h-8 rounded-lg bg-[#082175]/8 text-[#082175] flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            {totalCandidateApplications}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Fluxo sincronizado automaticamente
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Salário Médio por Cargo</span>
            <div className="w-8 h-8 rounded-lg bg-[#9F8548]/12 text-[#9F8548] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            R$ {avgSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Base salarial prevista nas vagas
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Orçamento Total Previsto</span>
            <div className="w-8 h-8 rounded-lg bg-[#c7d2fe]/60 text-[#082175] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            R$ {totalBudgetSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Impacto mensal das vagas abertas
          </div>
        </div>
      </div>

      {/* Portals Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {apiStats.map((api) => (
          <div
            key={api.source}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className={`text-[11px] font-bold uppercase tracking-wide ${api.accent}`}>
                Canal · {api.source}
              </p>
              <h4 className="text-sm font-bold text-[#03416A]">{api.name}</h4>
              <p className="text-xs text-slate-500">
                {api.count} vaga(s) conectada(s)
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-[#082175] font-mono tabular-nums">
                {api.apps}
              </div>
              <div className="text-[11px] text-slate-400">candidaturas</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#9F8548]" />
            <span className="font-semibold text-[#03416A]">Filtros:</span>

            <select
              aria-label="Filtrar por Portal"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[#082175]"
            >
              <option value="all">Todos os Portais</option>
              <option value="linkedin">LinkedIn Vagas</option>
              <option value="indeed">Indeed Brasil</option>
              <option value="internal">Site da Empresa</option>
            </select>

            <select
              aria-label="Filtrar por Departamento"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[#082175]"
            >
              <option value="all">Todos os Departamentos</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Exibindo <strong className="text-[#082175]">{filteredVacancies.length}</strong> de {vacancies.length} vagas
          </span>
        </div>

        {/* Vacancies vs Jobs Section */}
        {activeSection === 'jobs' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Cargo</th>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3 text-right">Salário Base</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#082175]">{job.title}</div>
                    </td>
                    <td className="py-3 px-3 text-[#03416A] font-medium">{job.department}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#082175]">
                      R$ {Number(job.base_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingJob(job);
                            setJobTitleInput(job.title);
                            setJobDeptInput(job.department);
                            setJobSalaryInput(String(job.base_salary));
                            setShowJobModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#082175] hover:bg-slate-50"
                          title="Editar cargo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Excluir o cargo "${job.title}"?`)) return;
                            try {
                              await deleteJob(job.id);
                              setFeedback({ type: 'success', text: `Cargo "${job.title}" removido.` });
                            } catch (err) {
                              setFeedback({
                                type: 'error',
                                text: err instanceof Error ? err.message : 'Erro ao excluir cargo.',
                              });
                            }
                          }}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                          title="Excluir cargo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Vaga e Descrição</th>
                <th className="py-2.5 px-3">Cargo Vinculado</th>
                <th className="py-2.5 px-3">Unidade / Filial</th>
                <th className="py-2.5 px-3">Origem</th>
                <th className="py-2.5 px-3 text-right">Salário Base</th>
                <th className="py-2.5 px-3 text-center">Candidatos</th>
                <th className="py-2.5 px-3 text-center">Situação</th>
                <th className="py-2.5 px-3 text-right">Publicação</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredVacancies.map((vac) => {
                const job = jobs.find((j) => j.id === vac.job_id);
                const branch = branches.find((b) => b.id === vac.branch_id);
                const candidatesCount = candidates.filter((c) => c.vacancy_id === vac.id).length;

                return (
                  <tr key={vac.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#082175] text-xs sm:text-sm">
                        {vac.title}
                        {vac.vacancies_count && vac.vacancies_count > 1 && (
                          <span className="ml-2 text-[11px] font-mono font-semibold text-[#9F8548]">
                            ({vac.vacancies_count} vagas)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {vac.description}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#03416A]">{job?.title || 'Cargo'}</div>
                      <div className="text-[11px] text-slate-500">{job?.department || 'Departamento'}</div>
                    </td>

                    <td className="py-3 px-3">
                      {branch ? (
                        <div>
                          <div className="font-semibold text-[#03416A]">{branch.label}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {(branch.cnpj || '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          {[vac.city || currentCompany?.cidade, vac.state || currentCompany?.estado]
                            .filter(Boolean)
                            .join('/') || 'Matriz'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-xs">
                      <span className="font-semibold text-[#03416A] capitalize">
                        {vac.api_source === 'internal' ? 'Interna' : vac.api_source}
                      </span>
                      {vac.api_external_id && (
                        <span
                          title={vac.api_external_id}
                          className="block text-[10px] text-slate-400 font-mono truncate max-w-[120px]"
                        >
                          {vac.api_external_id}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[#082175]">
                      R$ {job?.base_salary ? Number(job.base_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                    </td>

                    <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-[#03416A]">
                      {candidatesCount}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <select
                        aria-label={`Situação da vaga ${vac.title}`}
                        value={vac.status}
                        onChange={async (e) => {
                          try {
                            await updateVacancy(vac.id, {
                              status: e.target.value as VacancyStatus,
                            });
                          } catch (err) {
                            setFeedback({
                              type: 'error',
                              text: err instanceof Error ? err.message : 'Erro ao atualizar status.',
                            });
                          }
                        }}
                        className={`rounded-md border px-2 py-1 text-xs font-semibold outline-none ${
                          vac.status === 'open'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : vac.status === 'paused'
                            ? 'bg-amber-50 border-amber-200 text-[#9F8548]'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        <option value="open">Aberta</option>
                        <option value="paused">Pausada</option>
                        <option value="closed">Fechada</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-right text-slate-500 font-mono tabular-nums">
                      {new Date(vac.created_at).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditVacancy(vac)}
                          title="Editar vaga"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#082175] hover:bg-slate-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Excluir a vaga "${vac.title}"?`)) return;
                            try {
                              await deleteVacancy(vac.id);
                              setFeedback({ type: 'success', text: `Vaga "${vac.title}" removida.` });
                            } catch (err) {
                              setFeedback({
                                type: 'error',
                                text: err instanceof Error ? err.message : 'Erro ao excluir vaga.',
                              });
                            }
                          }}
                          title="Excluir vaga"
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* New / Edit Vacancy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#082175]">
                {editingVacancy ? 'Editar Vaga' : 'Publicar Nova Vaga'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetVacancyForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTitle.trim()) return;
                setSavingVacancy(true);
                try {
                  let resolvedJobId = newJobId;
                  if (!resolvedJobId) {
                    const createdJob = await addNewJob({
                      title: newTitle.trim(),
                      department: customDepartment.trim() || 'Operações',
                      base_salary: Number(customSalary) || 3500,
                    });
                    resolvedJobId = createdJob.id;
                  }

                  let resolvedBranchId: string | null = newBranchId || null;
                  let resolvedCity = currentCompany?.cidade;
                  let resolvedState = currentCompany?.estado;

                  if (showInlineBranchForm && newBranchLabel.trim()) {
                    const createdBranch = await addCompanyBranch(currentTenantId, {
                      label: newBranchLabel.trim(),
                      cnpj: newBranchCnpj.trim() || currentCompany?.cnpj || '',
                      endereco: newBranchEndereco.trim() || undefined,
                      cidade: newBranchCidade.trim() || currentCompany?.cidade,
                      estado: newBranchEstado.trim() || currentCompany?.estado,
                      is_headquarters: false,
                    });
                    resolvedBranchId = createdBranch.id;
                    resolvedCity = createdBranch.cidade;
                    resolvedState = createdBranch.estado;
                  } else if (resolvedBranchId) {
                    const selectedBranch = branches.find((b) => b.id === resolvedBranchId);
                    if (selectedBranch) {
                      resolvedCity = selectedBranch.cidade || resolvedCity;
                      resolvedState = selectedBranch.estado || resolvedState;
                    }
                  }

                  if (editingVacancy) {
                    await updateVacancy(editingVacancy.id, {
                      job_id: resolvedJobId,
                      branch_id: resolvedBranchId,
                      title: newTitle.trim(),
                      description: newDescription.trim(),
                      vacancies_count: Number(newVacanciesCount) || 1,
                      city: resolvedCity,
                      state: resolvedState,
                      api_source: newApiSource,
                      status: newStatus,
                    });
                    setFeedback({ type: 'success', text: `Vaga "${newTitle.trim()}" atualizada.` });
                  } else {
                    await addNewVacancy({
                      job_id: resolvedJobId,
                      branch_id: resolvedBranchId,
                      title: newTitle.trim(),
                      description: newDescription.trim(),
                      vacancies_count: Number(newVacanciesCount) || 1,
                      city: resolvedCity,
                      state: resolvedState,
                      show_salary: true,
                      api_source: newApiSource,
                      api_external_id: `ext-${newApiSource}-${Date.now().toString(36)}`,
                      status: newStatus,
                    });
                    setFeedback({ type: 'success', text: `Vaga "${newTitle.trim()}" publicada com sucesso.` });
                  }

                  setShowAddModal(false);
                  resetVacancyForm();
                } catch (err) {
                  setFeedback({
                    type: 'error',
                    text: err instanceof Error ? err.message : 'Erro ao salvar vaga.',
                  });
                } finally {
                  setSavingVacancy(false);
                }
              }}
              className="space-y-3 text-xs max-h-[75vh] overflow-y-auto pr-1"
            >
              <div>
                <label className="block text-[#03416A] font-semibold mb-1">
                  Título da Vaga:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Analista de Recursos Humanos Sênior"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                />
              </div>

              {/* Seletor ou Cadastro Rápido de Unidade / Filial */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-[#03416A] font-semibold">
                    Unidade / Filial da Vaga:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInlineBranchForm((prev) => !prev)}
                    className="text-[11px] font-bold text-[#082175] hover:text-[#9F8548] cursor-pointer"
                  >
                    {showInlineBranchForm ? 'Selecionar existente' : '+ Cadastrar Nova Filial'}
                  </button>
                </div>

                {!showInlineBranchForm ? (
                  <select
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                  >
                    <option value="">Sede / Matriz padrão</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label} ({(b.cnpj || '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={newBranchLabel}
                        onChange={(e) => setNewBranchLabel(e.target.value)}
                        placeholder="Nome da Filial (ex: Filial Moema)"
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                      />
                      <input
                        type="text"
                        required
                        value={newBranchCnpj}
                        onChange={(e) => setNewBranchCnpj(e.target.value)}
                        placeholder="CNPJ da Filial"
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newBranchEndereco}
                        onChange={(e) => setNewBranchEndereco(e.target.value)}
                        placeholder="Endereço completo"
                        className="col-span-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                      />
                      <input
                        type="text"
                        value={newBranchCidade}
                        onChange={(e) => setNewBranchCidade(e.target.value)}
                        placeholder="Cidade"
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                      />
                      <input
                        type="text"
                        value={newBranchEstado}
                        onChange={(e) => setNewBranchEstado(e.target.value)}
                        placeholder="UF"
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {jobs.length > 0 ? (
                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">
                    Cargo e Salário Base Vinculado:
                  </label>
                  <select
                    required
                    value={newJobId}
                    onChange={(e) => setNewJobId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                  >
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.department}) - R$ {Number(j.base_salary).toLocaleString('pt-BR')}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#03416A] font-semibold mb-1">
                      Departamento:
                    </label>
                    <input
                      type="text"
                      required
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      placeholder="Ex: Comercial"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[#03416A] font-semibold mb-1">
                      Salário Base (R$):
                    </label>
                    <input
                      type="number"
                      required
                      value={customSalary}
                      onChange={(e) => setCustomSalary(e.target.value)}
                      placeholder="4500"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">
                    Canal de Divulgação:
                  </label>
                  <select
                    value={newApiSource}
                    onChange={(e) => setNewApiSource(e.target.value as ApiSource)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                  >
                    <option value="internal">Portal ccbrh / Vaga Interna</option>
                    <option value="linkedin">LinkedIn Vagas e Recrutamento</option>
                    <option value="indeed">Portal Indeed Brasil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">
                    Quantidade de Posições:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newVacanciesCount}
                    onChange={(e) => setNewVacanciesCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#03416A] font-semibold mb-1">
                  Descrição e Requisitos:
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Responsabilidades, requisitos técnicos e benefícios..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetVacancyForm();
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingVacancy}
                  className="px-4 py-2 bg-[#082175] hover:bg-[#0a2a8a] text-white rounded-lg font-semibold shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingVacancy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {savingVacancy
                      ? 'Salvando...'
                      : editingVacancy
                      ? 'Salvar Alterações'
                      : 'Publicar Vaga'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New / Edit Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#082175]">
                {editingJob ? 'Editar Cargo' : 'Cadastrar Novo Cargo'}
              </h3>
              <button onClick={() => setShowJobModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!jobTitleInput.trim()) return;
                setSavingJob(true);
                try {
                  if (editingJob) {
                    await updateJob(editingJob.id, {
                      title: jobTitleInput.trim(),
                      department: jobDeptInput.trim() || 'Operações',
                      base_salary: Number(jobSalaryInput) || 2500,
                    });
                    setFeedback({ type: 'success', text: `Cargo "${jobTitleInput.trim()}" atualizado.` });
                  } else {
                    await addNewJob({
                      title: jobTitleInput.trim(),
                      department: jobDeptInput.trim() || 'Operações',
                      base_salary: Number(jobSalaryInput) || 2500,
                    });
                    setFeedback({ type: 'success', text: `Cargo "${jobTitleInput.trim()}" criado.` });
                  }
                  setShowJobModal(false);
                } catch (err) {
                  setFeedback({
                    type: 'error',
                    text: err instanceof Error ? err.message : 'Erro ao salvar cargo.',
                  });
                } finally {
                  setSavingJob(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#03416A] font-semibold mb-1">Nome do Cargo *</label>
                <input
                  type="text"
                  required
                  value={jobTitleInput}
                  onChange={(e) => setJobTitleInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#082175]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">Departamento *</label>
                  <input
                    type="text"
                    required
                    value={jobDeptInput}
                    onChange={(e) => setJobDeptInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#082175]"
                  />
                </div>
                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">Salário Base (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={jobSalaryInput}
                    onChange={(e) => setJobSalaryInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#082175]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#03416A] font-semibold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={jobDescInput}
                  onChange={(e) => setJobDescInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#082175] resize-none"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingJob}
                  className="px-4 py-2 bg-[#082175] text-white rounded-lg font-semibold"
                >
                  {savingJob ? 'Salvando...' : 'Salvar Cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
