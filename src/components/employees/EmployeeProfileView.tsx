import React, { useState, useRef } from 'react';
import {
  Company,
  DocumentRecord,
  DocumentStatus,
  DocumentType,
  Employee,
  Job,
  PayrollEntry,
} from '../../types/database';
import { processAvatarImageFile } from '../../utils/avatarImage';
import { EmployeePersonalSection } from './EmployeePersonalSection';
import {
  EmployeeAdditionalTab,
  EmployeeAddressTab,
  EmployeeDependentsTab,
  EmployeeDocumentsTab,
} from './EmployeeOtherTabs';
import {
  EmployeeAccessGrantModal,
  EmployeePayslipsTab,
} from './EmployeePayslipsTab';
import {
  ArrowLeft,
  ArrowUp,
  Camera,
  CheckCircle2,
  DollarSign,
  Eye,
  EyeOff,
  FileEdit,
  FileSpreadsheet,
  Home,
  KeyRound,
  Loader2,
  Paperclip,
  Pencil,
  Trash2,
  User,
  Users,
} from 'lucide-react';

export type EmployeeProfileTab =
  | 'personal'
  | 'address'
  | 'dependents'
  | 'additional'
  | 'payslips'
  | 'documents';

interface EmployeeProfileViewProps {
  employee: Employee;
  job?: Job;
  manager?: Employee;
  documents: DocumentRecord[];
  payrollEntries?: PayrollEntry[];
  company?: Company | null;
  isSelfServiceView?: boolean;
  onBack: () => void;
  onEditContractModal: (emp: Employee) => void;
  onSaveEmployeePatch: (patch: Partial<Employee>, successMessage: string) => Promise<void>;
  onUploadDocument: (docType: DocumentType, file: File) => Promise<DocumentRecord>;
  onUpdateDocumentStatus: (docId: string, status: DocumentStatus) => Promise<void>;
  onDeleteDocument: (docId: string, storagePath: string) => Promise<void>;
  onOpenDocument: (storagePath: string) => Promise<void>;
}

const formatLongDateBR = (iso?: string | null) => {
  if (!iso) return '-';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const mIdx = Number(parts[1]) - 1;
  return `${parts[2]} de ${months[mIdx] || parts[1]} de ${parts[0]}`;
};

export const EmployeeProfileView: React.FC<EmployeeProfileViewProps> = ({
  employee,
  job,
  manager,
  documents,
  payrollEntries = [],
  company = null,
  isSelfServiceView = false,
  onBack,
  onEditContractModal,
  onSaveEmployeePatch,
  onUploadDocument,
  onUpdateDocumentStatus,
  onDeleteDocument,
  onOpenDocument,
}) => {
  const [activeTab, setActiveTab] = useState<EmployeeProfileTab>('personal');
  const [showSalary, setShowSalary] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const avatarUrl = employee.personal_info?.avatar_url || null;
  const employeePayslips = payrollEntries.filter((p) => p.employee_id === employee.id);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const processedDataUrl = await processAvatarImageFile(file, 320);
      await handlePatchWithFeedback(
        {
          personal_info: {
            ...(employee.personal_info || {}),
            avatar_url: processedDataUrl,
          },
        },
        'Foto do perfil atualizada com sucesso!'
      );
    } catch (err) {
      setBannerMsg(err instanceof Error ? err.message : 'Erro ao processar foto do perfil.');
      setTimeout(() => setBannerMsg(null), 4000);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingPhoto(true);
    try {
      await handlePatchWithFeedback(
        {
          personal_info: {
            ...(employee.personal_info || {}),
            avatar_url: null,
          },
        },
        'Foto do perfil removida.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const initials = employee.full_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const resolvedCompensation = Number(
    (employee.contract_type === 'pj'
      ? employee.pj_monthly_value ?? employee.salary_override
      : employee.salary_override) ??
      job?.base_salary ??
      0
  );

  const handlePatchWithFeedback = async (patch: Partial<Employee>, msg: string) => {
    await onSaveEmployeePatch(patch, msg);
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const tabs: Array<{
    id: EmployeeProfileTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'personal', label: 'INFORMAÇÕES PESSOAIS', icon: User },
    { id: 'address', label: 'ENDEREÇOS E CONTATOS', icon: Home },
    {
      id: 'dependents',
      label: 'DEPENDENTES',
      icon: Users,
      badge: (employee.dependents_list || []).length || employee.dependents_count || 0,
    },
    { id: 'additional', label: 'ADICIONAIS', icon: FileEdit },
    {
      id: 'payslips',
      label: 'RECIBOS & HOLERITES',
      icon: FileSpreadsheet,
      badge: employeePayslips.length,
    },
    {
      id: 'documents',
      label: 'DOCUMENTOS',
      icon: Paperclip,
      badge: documents.length,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!isSelfServiceView && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#082175] hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-bold text-[#082175]">
            <User className="w-4 h-4 text-[#f5a90e]" />
            <span>
              {isSelfServiceView
                ? `Meu Perfil & Recibos · ${employee.full_name}`
                : `Minhas Informações · ${employee.full_name}`}
            </span>
          </div>
        </div>

        {!isSelfServiceView && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAccessModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Liberar Acesso ao Perfil</span>
            </button>

            <button
              type="button"
              onClick={() => onEditContractModal(employee)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E0F4F7] hover:bg-[#cdebf0] text-[#03416A] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar Contrato ({employee.contract_type === 'pj' ? 'PJ' : 'CLT'}) & Cargo</span>
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Navigation Tabs (matching screenshots) */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-2 sm:gap-6 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3.5 px-2 border-b-2 text-[11px] font-bold tracking-wider transition-colors cursor-pointer ${
                  active
                    ? 'border-[#f5a90e] text-[#082175]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#f5a90e]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      active
                        ? 'bg-[#082175] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {bannerMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {/* Main Two-Column Profile Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sticky Profile Card (3 cols on lg) */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {/* Header Banner & Avatar (with blurred backdrop when avatar exists) */}
          <div className="relative h-28 bg-gradient-to-br from-[#082175] via-[#03416A] to-[#9F8548] flex items-end justify-center overflow-visible">
            {avatarUrl && (
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={avatarUrl}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover blur-md scale-125 opacity-60"
                />
                <div className="absolute inset-0 bg-[#082175]/35" />
              </div>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />

            <div className="relative translate-y-10 z-10 group">
              <div className="w-20 h-20 rounded-full bg-[#082175] border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-[#f5a90e] font-extrabold text-xl font-mono">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={employee.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
                title="Importar ou trocar foto do perfil"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#f5a90e] hover:bg-[#d99208] text-[#082175] border-2 border-white shadow-sm flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-12 pb-6 px-5 text-center border-b border-slate-100">
            <h2 className="font-bold text-sm text-[#082175]">{employee.full_name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{job?.title || 'Cargo'}</p>

            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[#082175] text-[10px] font-semibold transition-colors cursor-pointer"
              >
                <Camera className="w-3 h-3 text-[#9F8548]" />
                <span>{avatarUrl ? 'Trocar Foto' : 'Importar Foto'}</span>
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={handleRemoveAvatar}
                  title="Remover foto do perfil"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                  employee.contract_type === 'pj'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-[#E0F4F7] text-[#03416A] border-[#c8e8ed]'
                }`}
              >
                {employee.contract_type === 'pj' ? 'REGIME PJ' : 'REGIME CLT'}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  employee.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : employee.status === 'vacation'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {employee.status === 'active'
                  ? 'Ativo'
                  : employee.status === 'vacation'
                  ? 'Em Férias'
                  : 'Inativo'}
              </span>
            </div>
          </div>

          {/* Left Card Metadata Rows */}
          <div className="p-5 space-y-3.5 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Departamento
              </p>
              <p className="font-medium text-slate-800 mt-0.5">{job?.department || '-'}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Time
              </p>
              <p className="font-medium text-slate-800 mt-0.5">
                {employee.personal_info?.team_name || '-'}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Início do Contrato
              </p>
              <p className="font-medium text-slate-800 mt-0.5">
                {formatLongDateBR(employee.hire_date)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Matrícula
              </p>
              <p className="font-medium text-slate-800 mt-0.5">
                {employee.personal_info?.registration_number || '-'}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pessoa Gestora
              </p>
              <p className="font-medium text-slate-800 mt-0.5">
                {manager?.full_name || 'Diretoria / Sem Gestor Direto'}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                CPF
              </p>
              <p className="font-mono font-medium text-slate-800 mt-0.5">
                {employee.cpf || '-'}
              </p>
            </div>

            {employee.contract_type === 'pj' && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Razão Social / CNPJ PJ
                </p>
                <p className="font-medium text-slate-800 mt-0.5">
                  {employee.pj_company_name || '-'}
                  {employee.pj_cnpj ? ` (${employee.pj_cnpj})` : ''}
                </p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                E-mail
              </p>
              <p className="font-medium text-slate-800 mt-0.5 break-all">{employee.email}</p>
            </div>

            {/* Salary Pill with Eye Toggle (matching Screenshot 2) */}
            <div className="pt-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-full bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200/80 text-slate-600 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono font-bold text-xs text-[#082175]">
                    {showSalary
                      ? `R$ ${resolvedCompensation.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}`
                      : '•••'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSalary((prev) => !prev)}
                  title={showSalary ? 'Ocultar remuneração' : 'Mostrar remuneração'}
                  className="text-slate-400 hover:text-[#082175] cursor-pointer"
                >
                  {showSalary ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Tab Content (8-9 cols on lg) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {activeTab === 'personal' && (
            <EmployeePersonalSection
              employee={employee}
              employeeDocuments={documents}
              onSaveEmployeePatch={handlePatchWithFeedback}
              onUploadAttachment={(docType, file) => onUploadDocument(docType, file)}
              onOpenDocument={onOpenDocument}
            />
          )}

          {activeTab === 'address' && (
            <EmployeeAddressTab
              employee={employee}
              onSaveEmployeePatch={handlePatchWithFeedback}
            />
          )}

          {activeTab === 'dependents' && (
            <EmployeeDependentsTab
              employee={employee}
              onSaveEmployeePatch={handlePatchWithFeedback}
            />
          )}

          {activeTab === 'additional' && (
            <EmployeeAdditionalTab
              employee={employee}
              onSaveEmployeePatch={handlePatchWithFeedback}
            />
          )}

          {activeTab === 'payslips' && (
            <EmployeePayslipsTab
              employee={employee}
              job={job}
              company={company}
              payrollEntries={employeePayslips}
            />
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <EmployeePayslipsTab
                employee={employee}
                job={job}
                company={company}
                payrollEntries={employeePayslips}
              />
              <EmployeeDocumentsTab
                employee={employee}
                documents={documents}
                onUploadDocument={onUploadDocument}
                onUpdateStatus={onUpdateDocumentStatus}
                onDeleteDocument={onDeleteDocument}
                onOpenDocument={onOpenDocument}
              />
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#f5a90e] hover:bg-[#d99208] text-[#082175] font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>VOLTAR AO TOPO</span>
            </button>
          </div>
        </div>
      </div>

      {showAccessModal && (
        <EmployeeAccessGrantModal
          employee={employee}
          job={job}
          onClose={() => setShowAccessModal(false)}
          onSuccess={(msg) => {
            setBannerMsg(msg);
            setTimeout(() => setBannerMsg(null), 5000);
          }}
        />
      )}
    </div>
  );
};
