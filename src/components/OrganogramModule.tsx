import React, { useState, useEffect } from 'react';
import { useHireGrid } from '../context/HireGridContext';
import { Employee } from '../types/database';
import {
  UserPlus,
  Layers,
  List,
  X,
  Search,
} from 'lucide-react';

export const OrganogramModule: React.FC = () => {
  const {
    employees,
    jobs,
    currentTenantId,
    addNewEmployee,
    addNewJob,
  } = useHireGrid();

  const [viewMode, setViewMode] = useState<'tree' | 'directory'>('tree');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Employee Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newJobId, setNewJobId] = useState(jobs[0]?.id || '');
  const [customJobTitle, setCustomJobTitle] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [customSalary, setCustomSalary] = useState('');
  const [newReportsTo, setNewReportsTo] = useState('');
  const [newHireDate, setNewHireDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    setNewJobId(jobs[0]?.id || '');
    setNewReportsTo('');
  }, [currentTenantId, jobs]);

  const filteredEmployees = employees.filter((e) => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const job = jobs.find((j) => j.id === e.job_id);
      if (
        !e.full_name.toLowerCase().includes(q) &&
        !e.email.toLowerCase().includes(q) &&
        !job?.title.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const rootEmployees = filteredEmployees.filter((e) => !e.reports_to);

  const getDirectReports = (managerId: string) => {
    return filteredEmployees.filter((e) => e.reports_to === managerId);
  };

  const getJobDetails = (jobId: string) => {
    return jobs.find((j) => j.id === jobId);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0]?.substring(0, 2).toUpperCase() || 'EM';
  };

  const renderTreeNode = (emp: Employee, depth: number = 0) => {
    const reports = getDirectReports(emp.id);
    const job = getJobDetails(emp.job_id);

    return (
      <div key={emp.id} className="relative flex flex-col items-center">
        {/* Node Card */}
        <div className="z-10 w-72 p-4 rounded-xl bg-white border border-slate-200 hover:border-[#082175] hover:shadow-md transition-all shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#082175] text-[#f5a90e] font-bold flex items-center justify-center shrink-0 font-mono text-xs">
              {getInitials(emp.full_name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-xs text-[#082175] truncate">
                  {emp.full_name}
                </h4>
                <span
                  className={`text-[10px] font-semibold shrink-0 ${
                    emp.status === 'active'
                      ? 'text-emerald-700'
                      : emp.status === 'vacation'
                      ? 'text-[#9F8548]'
                      : 'text-slate-500'
                  }`}
                >
                  {emp.status === 'active' ? 'Ativo' : emp.status === 'vacation' ? 'Férias' : 'Inativo'}
                </span>
              </div>

              <p className="text-[11px] text-[#03416A] font-semibold truncate mt-0.5">
                {job?.title || 'Cargo não localizado'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {job?.department || 'Departamento'}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono tabular-nums text-[#082175] font-bold">
              R$ {job?.base_salary ? Number(job.base_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </span>
            <span className="text-[#9F8548] font-mono tabular-nums text-[10px] font-semibold">
              {reports.length} liderado(s) direto(s)
            </span>
          </div>
        </div>

        {/* Tree Connectors */}
        {reports.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-6 bg-[#03416A]/30" />
            <div className="flex items-start justify-center gap-6 relative pt-2 border-t-2 border-[#03416A]/30">
              {reports.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548] tracking-wide">
            Quadro Funcional e Hierarquia
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] tracking-tight mt-1">
            Cadastro de Funcionários e Organograma
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão da estrutura organizacional, cargos cadastrados e cadeia de liderança direta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Situação:</span>
            <select
              aria-label="Filtrar por Situação"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#082175]"
            >
              <option value="all">Todos ({employees.length})</option>
              <option value="active">Ativos</option>
              <option value="vacation">Férias</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'tree'
                  ? 'bg-white text-[#082175] shadow-xs'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Organograma</span>
            </button>
            <button
              onClick={() => setViewMode('directory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'directory'
                  ? 'bg-white text-[#082175] shadow-xs'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Diretório</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#f5a90e]" />
            <span>Cadastrar Funcionário</span>
          </button>
        </div>
      </div>

      {viewMode === 'tree' ? (
        <div className="p-8 rounded-xl bg-white border border-slate-200 overflow-x-auto min-h-[520px] shadow-xs">
          <div className="flex justify-center gap-12 min-w-max pb-8">
            {rootEmployees.length === 0 ? (
              <div className="text-slate-400 text-xs py-12 text-center">
                Nenhum colaborador encontrado com os filtros selecionados.
              </div>
            ) : (
              rootEmployees.map((root) => renderTreeNode(root, 0))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-5">
          <div className="flex items-center justify-between pb-2">
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar funcionário por nome, cargo ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
              />
            </div>
            <span className="text-xs text-slate-500">
              <strong className="text-[#082175]">{filteredEmployees.length}</strong> colaboradores listados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Nome e E-mail</th>
                  <th className="py-2.5 px-3">Cargo e Departamento</th>
                  <th className="py-2.5 px-3">Liderança Direta</th>
                  <th className="py-2.5 px-3 text-center">Situação</th>
                  <th className="py-2.5 px-3 text-right">Data de Admissão</th>
                  <th className="py-2.5 px-3 text-right">Salário Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.map((emp) => {
                  const job = getJobDetails(emp.job_id);
                  const manager = employees.find((m) => m.id === emp.reports_to);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#082175] text-xs sm:text-sm">
                          {emp.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500">{emp.email}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#03416A]">{job?.title || 'Cargo'}</div>
                        <div className="text-[11px] text-slate-500">{job?.department || 'Departamento'}</div>
                      </td>

                      <td className="py-3 px-3">
                        {manager ? (
                          <span className="text-[#03416A] font-medium">
                            {manager.full_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            Diretoria Executiva
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-xs font-semibold ${
                            emp.status === 'active'
                              ? 'text-emerald-700'
                              : emp.status === 'vacation'
                              ? 'text-[#9F8548]'
                              : 'text-slate-500'
                          }`}
                        >
                          {emp.status === 'active' ? 'Ativo' : emp.status === 'vacation' ? 'Férias' : 'Inativo'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                        {emp.hire_date}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[#082175]">
                        R$ {job?.base_salary ? Number(job.base_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#082175]">Cadastrar Novo Funcionário</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName || !newEmail) return;
                let resolvedJobId = newJobId;
                if (!resolvedJobId && customJobTitle.trim()) {
                  const createdJob = addNewJob({
                    title: customJobTitle.trim(),
                    department: customDepartment.trim() || 'Geral',
                    base_salary: Number(customSalary) || 3500,
                  });
                  resolvedJobId = createdJob.id;
                }
                if (!resolvedJobId) return;

                addNewEmployee({
                  job_id: resolvedJobId,
                  reports_to: newReportsTo || null,
                  full_name: newName,
                  email: newEmail,
                  status: 'active',
                  hire_date: newHireDate,
                  resignation_date: null,
                });
                setShowAddModal(false);
                setNewName('');
                setNewEmail('');
                setCustomJobTitle('');
                setCustomDepartment('');
                setCustomSalary('');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#03416A] font-semibold mb-1">Nome Completo:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Gabriel Rezende"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#03416A] font-semibold mb-1">E-mail Corporativo:</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="gabriel@empresa.com.br"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                />
              </div>

              {jobs.length > 0 ? (
                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">Cargo e Faixa Salarial:</label>
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
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-[11px] font-bold text-[#082175]">
                    Criar primeiro cargo e salário desta empresa:
                  </p>
                  <input
                    type="text"
                    required
                    value={customJobTitle}
                    onChange={(e) => setCustomJobTitle(e.target.value)}
                    placeholder="Cargo (ex: Gerente Administrativo)"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      placeholder="Departamento"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                    />
                    <input
                      type="number"
                      required
                      value={customSalary}
                      onChange={(e) => setCustomSalary(e.target.value)}
                      placeholder="Salário Base (R$)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[#03416A] font-semibold mb-1">Liderança Direta:</label>
                <select
                  value={newReportsTo}
                  onChange={(e) => setNewReportsTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                >
                  <option value="">Diretoria Geral (Sem gestor intermediário)</option>
                  {employees.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#03416A] font-semibold mb-1">Data de Admissão:</label>
                <input
                  type="date"
                  value={newHireDate}
                  onChange={(e) => setNewHireDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
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
                  Cadastrar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
