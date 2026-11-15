import React, { useState, useEffect } from 'react';
import { useHireGrid } from '../context/HireGridContext';
import { ApiSource, VacancyStatus } from '../types/database';
import {
  Briefcase,
  Plus,
  Filter,
  DollarSign,
  TrendingUp,
  Globe,
  X,
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
    addNewJob,
    addCompanyBranch,
  } = useHireGrid();

  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Vacancy Form
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
  const [newStatus] = useState<VacancyStatus>('open');

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
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548] tracking-wide">
            Gestão de Vagas e Atração de Talentos
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] tracking-tight mt-1">
            Vagas e Portais de Emprego Integrados
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe o nível quantitativo de vagas, portais conectados (LinkedIn, Indeed) e valores orçados por cargo.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold text-xs shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 text-[#f5a90e]" />
          <span>Publicar Nova Vaga</span>
        </button>
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

        {/* Vacancies Table */}
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
                            {branch.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          {[vac.city || currentCompany.cidade, vac.state || currentCompany.estado]
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
                      <span
                        className={`text-xs font-semibold ${
                          vac.status === 'open'
                            ? 'text-emerald-700'
                            : vac.status === 'paused'
                            ? 'text-[#9F8548]'
                            : 'text-slate-500'
                        }`}
                      >
                        {vac.status === 'open' ? 'Aberta' : vac.status === 'paused' ? 'Pausada' : 'Fechada'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right text-slate-500 font-mono tabular-nums">
                      {new Date(vac.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Vacancy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#082175]">
                Publicar Nova Vaga
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTitle) return;
                let resolvedJobId = newJobId;
                if (!resolvedJobId) {
                  const createdJob = addNewJob({
                    title: newTitle.trim(),
                    department: customDepartment.trim() || 'Operações',
                    base_salary: Number(customSalary) || 3500,
                  });
                  resolvedJobId = createdJob.id;
                }

                let resolvedBranchId: string | null = newBranchId || null;
                let resolvedCity = currentCompany.cidade;
                let resolvedState = currentCompany.estado;

                if (showInlineBranchForm && newBranchLabel.trim()) {
                  const createdBranch = addCompanyBranch(currentTenantId, {
                    label: newBranchLabel.trim(),
                    cnpj: newBranchCnpj.trim() || currentCompany.cnpj,
                    endereco: newBranchEndereco.trim() || undefined,
                    cidade: newBranchCidade.trim() || currentCompany.cidade,
                    estado: newBranchEstado.trim() || currentCompany.estado,
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

                addNewVacancy({
                  job_id: resolvedJobId,
                  branch_id: resolvedBranchId,
                  title: newTitle,
                  description: newDescription,
                  vacancies_count: Number(newVacanciesCount) || 1,
                  city: resolvedCity,
                  state: resolvedState,
                  show_salary: true,
                  api_source: newApiSource,
                  api_external_id: `ext-${newApiSource}-${Date.now().toString(36)}`,
                  status: newStatus,
                });

                setShowAddModal(false);
                setNewTitle('');
                setNewDescription('');
                setCustomDepartment('');
                setCustomSalary('');
                setNewBranchLabel('');
                setNewBranchCnpj('');
                setNewBranchEndereco('');
                setNewBranchCidade('');
                setShowInlineBranchForm(false);
                setNewVacanciesCount(1);
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
                        {b.label} ({b.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')})
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
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#082175] hover:bg-[#0a2a8a] text-white rounded-lg font-semibold shadow-xs"
                >
                  Publicar Vaga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
