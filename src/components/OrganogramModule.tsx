import React, { useState, useEffect } from 'react';
import { useCcb } from '../context/CcbContext';
import { Employee, EmployeeContractType, EmployeeStatus } from '../types/database';
import { EmployeeProfileView } from './employees/EmployeeProfileView';
import { buildFallbackDocumentBlobUrl } from '../utils/documentViewer';
import {
  UserPlus,
  Layers,
  List,
  X,
  Search,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  UserCheck,
} from 'lucide-react';

export const OrganogramModule: React.FC = () => {
  const {
    employees,
    jobs,
    branches,
    documents,
    payrollEntries,
    employeeVacations,
    employeeBenefits,
    currentPayrollParameters,
    currentCompany,
    currentTenantId,
    addNewEmployee,
    updateEmployee,
    deleteEmployee,
    addNewJob,
    uploadEmployeeDocument,
    updateDocumentStatus,
    deleteDocument,
    getDocumentSignedUrl,
    addEmployeeVacation,
    updateEmployeeVacation,
    deleteEmployeeVacation,
    launchVacationToPayroll,
    addEmployeeBenefit,
    updateEmployeeBenefit,
    deleteEmployeeBenefit,
  } = useCcb();

  const [viewMode, setViewMode] = useState<'tree' | 'directory'>('directory');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New / Edit Employee Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newJobId, setNewJobId] = useState(jobs[0]?.id || '');
  const [newBranchId, setNewBranchId] = useState(branches[0]?.id || '');
  const [customJobTitle, setCustomJobTitle] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [customSalary, setCustomSalary] = useState('');
  const [newReportsTo, setNewReportsTo] = useState('');
  const [newStatus, setNewStatus] = useState<EmployeeStatus>('active');
  const [newHireDate, setNewHireDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newDependents, setNewDependents] = useState('0');
  const [newSalaryOverride, setNewSalaryOverride] = useState('');
  const [newVtOptedIn, setNewVtOptedIn] = useState(true);
  const [newVrDiscount, setNewVrDiscount] = useState('0');
  const [newHealthDiscount, setNewHealthDiscount] = useState('0');
  const [newContractType, setNewContractType] = useState<EmployeeContractType>('clt');
  const [newPjCompanyName, setNewPjCompanyName] = useState('');
  const [newPjCnpj, setNewPjCnpj] = useState('');
  const [newPjMonthlyValue, setNewPjMonthlyValue] = useState('');

  useEffect(() => {
    setNewJobId(jobs[0]?.id || '');
    setNewBranchId(branches[0]?.id || '');
    setNewReportsTo('');
    setSelectedEmployeeId(null);
  }, [currentTenantId, jobs, branches]);

  const handleOpenDocument = async (storagePath: string) => {
    const url = await getDocumentSignedUrl(storagePath);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const matchedDoc = documents.find((d) => d.storage_path === storagePath);
    const matchedEmployee = matchedDoc?.employee_id
      ? employees.find((e) => e.id === matchedDoc.employee_id)
      : undefined;

    const fallback = buildFallbackDocumentBlobUrl({
      storagePath,
      docLabel: matchedDoc?.document_type || 'Documento Digital',
      employee: matchedEmployee,
      companyName: currentCompany?.name,
    });

    window.open(fallback.url, '_blank', 'noopener,noreferrer');
  };

  const resetEmployeeForm = () => {
    setEditingEmployee(null);
    setNewName('');
    setNewEmail('');
    setNewCpf('');
    setNewJobId(jobs[0]?.id || '');
    setNewBranchId(branches[0]?.id || '');
    setCustomJobTitle('');
    setCustomDepartment('');
    setCustomSalary('');
    setNewReportsTo('');
    setNewStatus('active');
    setNewHireDate(new Date().toISOString().split('T')[0]);
    setNewDependents('0');
    setNewSalaryOverride('');
    setNewVtOptedIn(true);
    setNewVrDiscount('0');
    setNewHealthDiscount('0');
    setNewContractType('clt');
    setNewPjCompanyName('');
    setNewPjCnpj('');
    setNewPjMonthlyValue('');
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setNewName(emp.full_name);
    setNewEmail(emp.email);
    setNewCpf(emp.cpf || '');
    setNewJobId(emp.job_id);
    setNewBranchId(emp.branch_id || '');
    setNewReportsTo(emp.reports_to || '');
    setNewStatus(emp.status);
    setNewHireDate(emp.hire_date || new Date().toISOString().split('T')[0]);
    setNewDependents(String(emp.dependents_count ?? 0));
    setNewSalaryOverride(emp.salary_override ? String(emp.salary_override) : '');
    setNewVtOptedIn(emp.vt_opted_in !== false);
    setNewVrDiscount(String(emp.vr_discount ?? 0));
    setNewHealthDiscount(String(emp.health_plan_discount ?? 0));
    setNewContractType(emp.contract_type || 'clt');
    setNewPjCompanyName(emp.pj_company_name || '');
    setNewPjCnpj(emp.pj_cnpj || '');
    setNewPjMonthlyValue(emp.pj_monthly_value ? String(emp.pj_monthly_value) : '');
    setShowAddModal(true);
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`Deseja excluir o colaborador "${emp.full_name}"?`)) return;
    try {
      await deleteEmployee(emp.id);
      setFeedback({ type: 'success', text: `Colaborador "${emp.full_name}" removido.` });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao excluir colaborador.',
      });
    }
  };

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
        <div
          onClick={() => setSelectedEmployeeId(emp.id)}
          className="z-10 w-72 p-4 rounded-xl bg-white border border-slate-200 hover:border-[#082175] hover:shadow-md transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#082175] text-[#f5a90e] font-bold flex items-center justify-center shrink-0 font-mono text-xs overflow-hidden border border-slate-200">
              {emp.personal_info?.avatar_url ? (
                <img
                  src={emp.personal_info.avatar_url}
                  alt={emp.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(emp.full_name)
              )}
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
                  {(emp.contract_type || 'clt').toUpperCase()} ·{' '}
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
              R${' '}
              {Number(
                (emp.contract_type === 'pj'
                  ? emp.pj_monthly_value ?? emp.salary_override
                  : emp.salary_override) ??
                  job?.base_salary ??
                  0
              ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[#9F8548] font-mono tabular-nums text-[10px] font-semibold">
                {reports.length} liderado(s)
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEditEmployee(emp);
                }}
                title="Editar contrato/cargo"
                className="p-1 text-slate-400 hover:text-[#082175] rounded hover:bg-slate-100"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEmployee(emp);
                }}
                title="Excluir colaborador"
                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
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

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || null;

  return (
    <>
      {selectedEmployee ? (
        <EmployeeProfileView
          employee={selectedEmployee}
          job={getJobDetails(selectedEmployee.job_id)}
          manager={employees.find((m) => m.id === selectedEmployee.reports_to)}
          documents={documents.filter((d) => d.employee_id === selectedEmployee.id)}
          payrollEntries={payrollEntries.filter((p) => p.employee_id === selectedEmployee.id)}
          vacations={employeeVacations.filter((v) => v.employee_id === selectedEmployee.id)}
          benefits={employeeBenefits.filter((b) => b.employee_id === selectedEmployee.id)}
          payrollParameters={currentPayrollParameters}
          company={currentCompany}
          onBack={() => setSelectedEmployeeId(null)}
          onEditContractModal={(emp) => openEditEmployee(emp)}
          onSaveEmployeePatch={async (patch, successMessage) => {
            await updateEmployee(selectedEmployee.id, patch);
            setFeedback({ type: 'success', text: successMessage });
          }}
          onUploadDocument={(docType, file) =>
            uploadEmployeeDocument(selectedEmployee.id, docType, file)
          }
          onUpdateDocumentStatus={(docId, status) => updateDocumentStatus(docId, status)}
          onDeleteDocument={(docId, storagePath) => deleteDocument(docId, storagePath)}
          onOpenDocument={(storagePath) => handleOpenDocument(storagePath)}
          onCreateVacation={addEmployeeVacation}
          onUpdateVacation={updateEmployeeVacation}
          onDeleteVacation={deleteEmployeeVacation}
          onLaunchVacationToPayroll={launchVacationToPayroll}
          onCreateBenefit={addEmployeeBenefit}
          onUpdateBenefit={updateEmployeeBenefit}
          onDeleteBenefit={deleteEmployeeBenefit}
        />
      ) : (
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
            Dossiê Digital 360º, Documentos e Hierarquia
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] tracking-tight mt-1">
            Funcionários
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Clique em um funcionário para abrir seu perfil completo (Informações Pessoais, Dados Bancários, Formação, Dependentes e Documentos).
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
            onClick={() => {
              resetEmployeeForm();
              setShowAddModal(true);
            }}
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
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.map((emp) => {
                  const job = getJobDetails(emp.job_id);
                  const manager = employees.find((m) => m.id === emp.reports_to);
                  const empDocsCount = documents.filter((d) => d.employee_id === emp.id).length;

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#082175] text-[#f5a90e] font-bold flex items-center justify-center shrink-0 font-mono text-xs overflow-hidden border border-slate-200">
                            {emp.personal_info?.avatar_url ? (
                              <img
                                src={emp.personal_info.avatar_url}
                                alt={emp.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(emp.full_name)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#082175] text-xs sm:text-sm hover:underline">
                                {emp.full_name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  emp.contract_type === 'pj'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-[#E0F4F7] text-[#03416A] border-[#c8e8ed]'
                                }`}
                              >
                                {emp.contract_type === 'pj' ? 'PJ' : 'CLT'}
                              </span>
                              {empDocsCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                  <FileText className="w-2.5 h-2.5" />
                                  <span>{empDocsCount} doc(s)</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {emp.email}
                              {emp.contract_type === 'pj' && emp.pj_cnpj ? ` · CNPJ ${emp.pj_cnpj}` : ''}
                            </div>
                          </div>
                        </div>
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
                        R${' '}
                        {Number(
                          (emp.contract_type === 'pj'
                            ? emp.pj_monthly_value ?? emp.salary_override
                            : emp.salary_override) ??
                            job?.base_salary ??
                            0
                        ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setSelectedEmployeeId(emp.id)}
                            title="Abrir Perfil Completo"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#E0F4F7] text-[#082175] hover:bg-[#cdebf0] font-semibold text-[11px]"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Perfil</span>
                          </button>
                          <button
                            onClick={() => openEditEmployee(emp)}
                            title="Editar contrato/cargo"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#082175] hover:bg-slate-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp)}
                            title="Excluir colaborador"
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
        </div>
      )}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#082175]">
                {editingEmployee ? 'Editar Colaborador' : 'Cadastrar Novo Funcionário'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetEmployeeForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newName.trim() || !newEmail.trim()) return;
                setSavingEmployee(true);
                try {
                  let resolvedJobId = newJobId;
                  if (!resolvedJobId && customJobTitle.trim()) {
                    const createdJob = await addNewJob({
                      title: customJobTitle.trim(),
                      department: customDepartment.trim() || 'Geral',
                      base_salary: Number(customSalary) || 3500,
                    });
                    resolvedJobId = createdJob.id;
                  }
                  if (!resolvedJobId) {
                    setSavingEmployee(false);
                    return;
                  }

                  const isPj = newContractType === 'pj';
                  const payload = {
                    job_id: resolvedJobId,
                    branch_id: newBranchId || null,
                    reports_to: newReportsTo || null,
                    full_name: newName.trim(),
                    email: newEmail.trim(),
                    cpf: newCpf.trim() || null,
                    contract_type: newContractType,
                    pj_company_name: isPj ? newPjCompanyName.trim() || null : null,
                    pj_cnpj: isPj ? newPjCnpj.trim() || null : null,
                    pj_monthly_value: isPj && newPjMonthlyValue ? Number(newPjMonthlyValue) : null,
                    status: newStatus,
                    hire_date: newHireDate,
                    resignation_date: newStatus === 'inactive' ? new Date().toISOString().split('T')[0] : null,
                    dependents_count: isPj ? 0 : Math.max(0, Number(newDependents) || 0),
                    salary_override: !isPj && newSalaryOverride ? Number(newSalaryOverride) : null,
                    vt_opted_in: isPj ? false : newVtOptedIn,
                    vr_discount: isPj ? 0 : Math.max(0, Number(newVrDiscount) || 0),
                    health_plan_discount: isPj ? 0 : Math.max(0, Number(newHealthDiscount) || 0),
                  };

                  if (editingEmployee) {
                    await updateEmployee(editingEmployee.id, payload);
                    setFeedback({
                      type: 'success',
                      text: `Colaborador "${newName.trim()}" atualizado e folha em rascunho sincronizada (${isPj ? 'PJ' : 'CLT'}).`,
                    });
                  } else {
                    await addNewEmployee(payload);
                    setFeedback({ type: 'success', text: `Colaborador "${newName.trim()}" cadastrado.` });
                  }

                  setShowAddModal(false);
                  resetEmployeeForm();
                } catch (err) {
                  setFeedback({
                    type: 'error',
                    text: err instanceof Error ? err.message : 'Erro ao salvar colaborador.',
                  });
                } finally {
                  setSavingEmployee(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
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

                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">CPF (opcional):</label>
                  <input
                    type="text"
                    value={newCpf}
                    onChange={(e) => setNewCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                  />
                </div>
              </div>

              {branches.length > 0 && (
                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">Unidade / Filial:</label>
                  <select
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                  >
                    <option value="">Matriz / Geral</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">Data de Admissão:</label>
                  <input
                    type="date"
                    value={newHireDate}
                    onChange={(e) => setNewHireDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">Situação:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as EmployeeStatus)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-1 focus:ring-[#082175] outline-none"
                  >
                    <option value="active">Ativo</option>
                    <option value="vacation">Férias</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Tipo de Contratação: CLT vs PJ */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-[#082175] text-[11px]">
                    Tipo de Contratação e Parâmetros de Pagamento
                  </p>
                  <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setNewContractType('clt')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        newContractType === 'clt'
                          ? 'bg-[#082175] text-white shadow-xs'
                          : 'text-slate-600 hover:text-[#082175]'
                      }`}
                    >
                      CLT (PF)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewContractType('pj')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        newContractType === 'pj'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-purple-700'
                      }`}
                    >
                      PJ (NFS-e)
                    </button>
                  </div>
                </div>

                {newContractType === 'pj' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="sm:col-span-2">
                      <label className="block text-[#03416A] font-semibold mb-1">
                        Razão Social do Prestador PJ:
                      </label>
                      <input
                        type="text"
                        value={newPjCompanyName}
                        onChange={(e) => setNewPjCompanyName(e.target.value)}
                        placeholder="Ex: Silva Consultoria Digital LTDA"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[#03416A] font-semibold mb-1">CNPJ PJ:</label>
                      <input
                        type="text"
                        value={newPjCnpj}
                        onChange={(e) => setNewPjCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[#03416A] font-semibold mb-1">
                        Valor Mensal Contrato / NFS-e (R$):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={newPjMonthlyValue}
                        onChange={(e) => setNewPjMonthlyValue(e.target.value)}
                        placeholder="Usa valor base do cargo se vazio"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[#03416A] font-semibold mb-1">
                          Salário Combinado (opcional):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newSalaryOverride}
                          onChange={(e) => setNewSalaryOverride(e.target.value)}
                          placeholder="Usa base do cargo se vazio"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[#03416A] font-semibold mb-1">Dependentes IRRF:</label>
                        <input
                          type="number"
                          min={0}
                          value={newDependents}
                          onChange={(e) => setNewDependents(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[#03416A] font-semibold mb-1">Desconto VR/VA (R$):</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={newVrDiscount}
                          onChange={(e) => setNewVrDiscount(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[#03416A] font-semibold mb-1">Plano de Saúde (R$):</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={newHealthDiscount}
                          onChange={(e) => setNewHealthDiscount(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newVtOptedIn}
                        onChange={(e) => setNewVtOptedIn(e.target.checked)}
                        className="rounded border-slate-300 text-[#082175]"
                      />
                      <span className="text-slate-700 font-medium">
                        Optante por Vale-Transporte (desconto 6% limitado ao benefício)
                      </span>
                    </label>
                  </>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetEmployeeForm();
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEmployee}
                  className="px-4 py-2 bg-[#082175] hover:bg-[#0a2a8a] text-white rounded-lg font-semibold shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingEmployee && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {savingEmployee
                      ? 'Salvando...'
                      : editingEmployee
                      ? 'Salvar Alterações'
                      : 'Cadastrar Colaborador'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
