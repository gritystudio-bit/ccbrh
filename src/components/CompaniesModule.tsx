import React, { useState } from 'react';
import { useHireGrid } from '../context/HireGridContext';
import {
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  Users,
  DollarSign,
  Briefcase,
  ArrowRight,
  X,
  Search,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

interface CompaniesModuleProps {
  onSelectCompanyAndGoDashboard: (companyId: string) => void;
}

export const CompaniesModule: React.FC<CompaniesModuleProps> = ({
  onSelectCompanyAndGoDashboard,
}) => {
  const {
    database,
    currentTenantId,
    setCurrentTenantId,
    registerClientCompany,
    approveCompanyStatus,
    addCompanyBranch,
  } = useHireGrid();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending_review'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal de nova filial para empresa existente
  const [branchModalCompanyId, setBranchModalCompanyId] = useState<string | null>(null);
  const [branchLabel, setBranchLabel] = useState('');
  const [branchCnpj, setBranchCnpj] = useState('');
  const [branchEndereco, setBranchEndereco] = useState('');
  const [branchCidade, setBranchCidade] = useState('');
  const [branchEstado, setBranchEstado] = useState('SP');

  // Form states para cadastrar nova empresa cliente diretamente pela equipe CCB
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjRoot, setCnpjRoot] = useState('');
  const [areaAtuacao, setAreaAtuacao] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [responsavelCargo, setResponsavelCargo] = useState('');
  const [initialJobTitle, setInitialJobTitle] = useState('');
  const [initialJobArea, setInitialJobArea] = useState('');
  const [initialJobSalary, setInitialJobSalary] = useState('');

  const formatCnpj = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 8) return digits.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3');
    if (digits.length !== 14) return raw;
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatCurrency = (val: number) =>
    `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const companiesWithStats = database.companies.map((comp) => {
    const compJobs = database.jobs.filter((j) => j.tenant_id === comp.id);
    const compEmployees = database.employees.filter(
      (e) => e.tenant_id === comp.id && (e.status === 'active' || e.status === 'vacation')
    );
    const compVacancies = database.vacancies.filter(
      (v) => v.tenant_id === comp.id && v.status === 'open'
    );
    const compCandidates = database.candidates.filter((c) => c.tenant_id === comp.id);
    const payroll = compEmployees.reduce((sum, emp) => {
      const job = compJobs.find((j) => j.id === emp.job_id);
      return sum + (job ? Number(job.base_salary) : 0);
    }, 0);

    return {
      ...comp,
      status: comp.status || 'active',
      employeesCount: compEmployees.length,
      vacanciesCount: compVacancies.length,
      candidatesCount: compCandidates.length,
      payroll,
    };
  });

  const filteredCompanies = companiesWithStats.filter((c) => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.cnpj.toLowerCase().includes(q) ||
        (c.area_atuacao || '').toLowerCase().includes(q) ||
        (c.cidade || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = companiesWithStats.filter((c) => c.status === 'pending_review').length;
  const activeCount = companiesWithStats.filter((c) => c.status === 'active').length;
  const totalConsolidatedPayroll = companiesWithStats.reduce((s, c) => s + c.payroll, 0);

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const created = registerClientCompany({
      company: {
        name: name.trim(),
        cnpj: cnpj.trim() || `${Date.now()}`.slice(0, 14),
        cnpj_root: cnpjRoot.trim() || undefined,
        area_atuacao: areaAtuacao.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        cidade: cidade.trim() || undefined,
        estado: estado.trim() || undefined,
        responsavel_nome: responsavelNome.trim() || undefined,
        responsavel_cargo: responsavelCargo.trim() || undefined,
        status: 'active',
      },
      vacancies: initialJobTitle.trim()
        ? [
            {
              cargo: initialJobTitle.trim(),
              area: initialJobArea.trim() || areaAtuacao.trim() || 'Operações',
              salario: initialJobSalary.trim() || '4000',
            },
          ]
        : [],
    });

    setCurrentTenantId(created.id);
    setName('');
    setCnpj('');
    setCnpjRoot('');
    setAreaAtuacao('');
    setEmail('');
    setTelefone('');
    setCidade('');
    setEstado('');
    setResponsavelNome('');
    setResponsavelCargo('');
    setInitialJobTitle('');
    setInitialJobArea('');
    setInitialJobSalary('');
    setShowAddModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548] tracking-wide">
            Carteira Exclusiva CCB · Gestão Multi-Empresa
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] tracking-tight mt-1">
            Empresas Clientes Cadastradas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Selecione qualquer empresa abaixo para que a equipe CCB administre seus colaboradores,
            folha de pagamento, vagas e processo seletivo em ambiente de dados isolado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#082175] text-white text-xs sm:text-sm font-semibold hover:bg-[#0a2a8a] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#f5a90e]" />
          <span>Cadastrar Empresa Cliente</span>
        </button>
      </div>

      {/* KPIs Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Empresas Ativas sob Gestão</span>
            <div className="w-8 h-8 rounded-lg bg-[#E0F4F7] text-[#03416A] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            {activeCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cada empresa possui base própria isolada por CNPJ
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Cadastros Pendentes (Site)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#9F8548] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#9F8548] mt-2 font-mono tabular-nums">
            {pendingCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Solicitações recebidas via formulário de empresa
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Folha Consolidada da Carteira</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            {formatCurrency(totalConsolidatedPayroll)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Soma de salários-base acompanhados pela CCB
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar empresa por nome, CNPJ, área ou cidade..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {[
            { id: 'all', label: `Todas (${companiesWithStats.length})` },
            { id: 'active', label: `Ativas (${activeCount})` },
            { id: 'pending_review', label: `Pendentes (${pendingCount})` },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilterStatus(opt.id as 'all' | 'active' | 'pending_review')}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors cursor-pointer ${
                filterStatus === opt.id
                  ? 'bg-[#082175] text-white border-[#082175]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Empresas Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCompanies.map((comp) => {
          const isSelected = comp.id === currentTenantId;
          const isPending = comp.status === 'pending_review';

          return (
            <div
              key={comp.id}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-[#082175] ring-2 ring-[#082175]/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                        isSelected
                          ? 'bg-[#082175] text-[#f5a90e]'
                          : 'bg-[#E0F4F7] text-[#03416A]'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#082175] truncate" title={comp.name}>
                        {comp.name}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500">
                        {comp.cnpj_root
                          ? `Raiz CNPJ: ${formatCnpj(comp.cnpj_root)}`
                          : `CNPJ: ${formatCnpj(comp.cnpj)}`}
                      </p>
                    </div>
                  </div>

                  {isPending ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-[#9F8548] border border-amber-200 shrink-0">
                      Pendente
                    </span>
                  ) : isSelected ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#E0F4F7] text-[#03416A] shrink-0">
                      Em Gestão
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 shrink-0">
                      Ativa
                    </span>
                  )}
                </div>

                {(comp.area_atuacao || comp.cidade || comp.responsavel_nome) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                    {comp.area_atuacao && (
                      <p className="truncate">
                        <span className="font-semibold text-[#03416A]">Ramo:</span>{' '}
                        {comp.area_atuacao}
                      </p>
                    )}
                    {(comp.cidade || comp.estado) && (
                      <p className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {[comp.cidade, comp.estado].filter(Boolean).join(' - ')}
                        </span>
                      </p>
                    )}
                    {comp.responsavel_nome && (
                      <p className="truncate">
                        <span className="font-semibold text-[#03416A]">Contato:</span>{' '}
                        {comp.responsavel_nome}
                      </p>
                    )}
                  </div>
                )}

                {/* Unidades / Filiais vinculadas */}
                {(() => {
                  const compBranches = (database.branches || []).filter(
                    (b) => b.company_id === comp.id
                  );
                  return (
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-semibold text-[#03416A]">
                          Unidades ({compBranches.length || 1})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setBranchModalCompanyId(comp.id);
                            setBranchLabel('');
                            setBranchCnpj(comp.cnpj_root ? `${comp.cnpj_root}` : '');
                            setBranchEndereco('');
                            setBranchCidade(comp.cidade || '');
                            setBranchEstado(comp.estado || 'SP');
                          }}
                          className="text-[11px] font-bold text-[#082175] hover:text-[#9F8548] cursor-pointer"
                        >
                          + Filial
                        </button>
                      </div>
                      {compBranches.length > 0 ? (
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {compBranches.map((b) => (
                            <div
                              key={b.id}
                              className="text-[10px] bg-slate-50 rounded px-2 py-1 flex items-center justify-between gap-2"
                            >
                              <span className="font-medium text-slate-700 truncate">
                                {b.label}
                              </span>
                              <span className="font-mono text-slate-500 shrink-0">
                                {formatCnpj(b.cnpj)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          Matriz: {formatCnpj(comp.cnpj)}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Métricas isoladas da empresa */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Equipe</span>
                    </div>
                    <div className="text-sm font-extrabold text-[#082175] font-mono mt-0.5">
                      {comp.employeesCount}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      <span>Vagas</span>
                    </div>
                    <div className="text-sm font-extrabold text-[#082175] font-mono mt-0.5">
                      {comp.vacanciesCount}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-[10px] text-slate-500">Candidatos</div>
                    <div className="text-sm font-extrabold text-[#082175] font-mono mt-0.5">
                      {comp.candidatesCount}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg">
                  <span className="text-slate-500 font-medium">Folha Mensal Base</span>
                  <span className="font-bold text-[#03416A] font-mono">
                    {formatCurrency(comp.payroll)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                {isPending && (
                  <button
                    type="button"
                    onClick={() => approveCompanyStatus(comp.id, 'active')}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ativar Cliente</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectCompanyAndGoDashboard(comp.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#E0F4F7] text-[#082175] hover:bg-[#d2edf2]'
                      : 'bg-[#082175] text-white hover:bg-[#0a2a8a]'
                  }`}
                >
                  <span>{isSelected ? 'Abrir Resumo Gerencial' : 'Gerenciar esta Empresa'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Aviso de Governança CCB */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-xs text-slate-600">
        <ShieldCheck className="w-4 h-4 text-[#9F8548] shrink-0" />
        <span>
          <strong>Isolamento por Empresa:</strong> Ao alternar ou cadastrar uma empresa cliente,
          cargos, folha salarial, organograma, vagas, pipeline e documentos permanecem separados
          por CNPJ para uso exclusivo da equipe CCB.
        </span>
      </div>

      {/* Modal: Cadastrar Nova Empresa Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-[#082175]">
                  Cadastrar Empresa Cliente na CCB
                </h2>
                <p className="text-xs text-slate-500">
                  Cria um novo ambiente isolado para gestão de pessoas, vagas e folha.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    Razão Social / Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Grupo Horizonte Alimentos Ltda."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    Raiz do CNPJ (para empresas com filiais)
                  </label>
                  <input
                    type="text"
                    value={cnpjRoot}
                    onChange={(e) => setCnpjRoot(e.target.value)}
                    placeholder="Ex: 62.498.365"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    CNPJ Matriz (Completo)
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    Área de Atuação
                  </label>
                  <input
                    type="text"
                    value={areaAtuacao}
                    onChange={(e) => setAreaAtuacao(e.target.value)}
                    placeholder="Ex: Varejo, Indústria, Saúde"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    E-mail do Contato Cliente
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@cliente.com.br"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">Cidade</label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">Estado</label>
                  <input
                    type="text"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    placeholder="SP"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    Responsável pela Empresa
                  </label>
                  <input
                    type="text"
                    value={responsavelNome}
                    onChange={(e) => setResponsavelNome(e.target.value)}
                    placeholder="Nome do contato"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    Cargo do Responsável
                  </label>
                  <input
                    type="text"
                    value={responsavelCargo}
                    onChange={(e) => setResponsavelCargo(e.target.value)}
                    placeholder="Diretor / Sócio"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-[#082175] mb-2">
                  Cargo / Vaga Inicial (Opcional)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={initialJobTitle}
                    onChange={(e) => setInitialJobTitle(e.target.value)}
                    placeholder="Cargo (ex: Analista DP)"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                  <input
                    type="text"
                    value={initialJobArea}
                    onChange={(e) => setInitialJobArea(e.target.value)}
                    placeholder="Departamento"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                  <input
                    type="text"
                    value={initialJobSalary}
                    onChange={(e) => setInitialJobSalary(e.target.value)}
                    placeholder="Salário base (R$)"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a] cursor-pointer"
                >
                  Cadastrar e Gerenciar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Nova Filial para Empresa Existente */}
      {branchModalCompanyId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-[#082175]">Cadastrar Nova Unidade / Filial</h3>
                <p className="text-xs text-slate-500">
                  {database.companies.find((c) => c.id === branchModalCompanyId)?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBranchModalCompanyId(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!branchLabel.trim() || !branchCnpj.trim()) return;
                addCompanyBranch(branchModalCompanyId, {
                  label: branchLabel.trim(),
                  cnpj: branchCnpj.trim(),
                  endereco: branchEndereco.trim() || undefined,
                  cidade: branchCidade.trim() || undefined,
                  estado: branchEstado.trim() || undefined,
                  is_headquarters: false,
                });
                setBranchModalCompanyId(null);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#03416A] mb-1">
                  Nome da Unidade / Filial *
                </label>
                <input
                  type="text"
                  required
                  value={branchLabel}
                  onChange={(e) => setBranchLabel(e.target.value)}
                  placeholder="Ex: Filial · Pátio Paulista"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#03416A] mb-1">
                  CNPJ da Unidade *
                </label>
                <input
                  type="text"
                  required
                  value={branchCnpj}
                  onChange={(e) => setBranchCnpj(e.target.value)}
                  placeholder="62.498.365/0004-98"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#03416A] mb-1">Endereço</label>
                <input
                  type="text"
                  value={branchEndereco}
                  onChange={(e) => setBranchEndereco(e.target.value)}
                  placeholder="Rua, número e bairro"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#03416A] mb-1">Cidade</label>
                  <input
                    type="text"
                    value={branchCidade}
                    onChange={(e) => setBranchCidade(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#03416A] mb-1">Estado</label>
                  <input
                    type="text"
                    value={branchEstado}
                    onChange={(e) => setBranchEstado(e.target.value)}
                    placeholder="SP"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBranchModalCompanyId(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 font-semibold text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#082175] text-white font-semibold cursor-pointer"
                >
                  Salvar Filial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
