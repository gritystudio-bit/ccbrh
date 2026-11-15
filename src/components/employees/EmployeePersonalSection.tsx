import React, { useState } from 'react';
import {
  DocumentRecord,
  DocumentType,
  Employee,
  EmployeeBankAccount,
  EmployeeEducationItem,
  EmployeePersonalInfo,
} from '../../types/database';
import {
  GraduationCap,
  Landmark,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

interface EmployeePersonalSectionProps {
  employee: Employee;
  employeeDocuments: DocumentRecord[];
  onSaveEmployeePatch: (patch: Partial<Employee>, successMessage: string) => Promise<void>;
  onUploadAttachment: (docType: DocumentType, file: File) => Promise<DocumentRecord>;
  onOpenDocument: (storagePath: string) => Promise<void>;
}

export const EmployeePersonalSection: React.FC<EmployeePersonalSectionProps> = ({
  employee,
  employeeDocuments,
  onSaveEmployeePatch,
  onUploadAttachment,
  onOpenDocument,
}) => {
  const info: EmployeePersonalInfo = employee.personal_info || {};
  const bankAccounts: EmployeeBankAccount[] = employee.bank_accounts || [];
  const educationList: EmployeeEducationItem[] = employee.education_history || [];

  // Edit Personal Info state
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [fullName, setFullName] = useState(employee.full_name);
  const [cpf, setCpf] = useState(employee.cpf || '');
  const [pjCnpj, setPjCnpj] = useState(employee.pj_cnpj || '');
  const [nationality, setNationality] = useState(info.nationality || 'Brasil');
  const [birthState, setBirthState] = useState(info.birth_state || 'São Paulo');
  const [birthCity, setBirthCity] = useState(info.birth_city || 'São Paulo');
  const [ethnicity, setEthnicity] = useState(info.ethnicity || '');
  const [gender, setGender] = useState(info.gender || '');
  const [docGender, setDocGender] = useState(info.document_gender || '');
  const [socialName, setSocialName] = useState(info.social_name || '');
  const [maritalStatus, setMaritalStatus] = useState(info.marital_status || '');
  const [birthDate, setBirthDate] = useState(info.birth_date || '');
  const [motherName, setMotherName] = useState(info.mother_name || '');
  const [fatherName, setFatherName] = useState(info.father_name || '');
  const [teamName, setTeamName] = useState(info.team_name || '');
  const [registrationNumber, setRegistrationNumber] = useState(info.registration_number || '');

  // Edit PcD state
  const [editingPcd, setEditingPcd] = useState(false);
  const [hasDisability, setHasDisability] = useState(Boolean(info.has_disability));
  const [disabilityType, setDisabilityType] = useState(info.disability_type || '');
  const [disabilityNotes, setDisabilityNotes] = useState(info.disability_notes || '');

  // Bank Account Modal state
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<EmployeeBankAccount['account_type']>('Conta Corrente');
  const [branchNumber, setBranchNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [bankFile, setBankFile] = useState<File | null>(null);

  // Education Modal state
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);
  const [eduLevel, setEduLevel] = useState<EmployeeEducationItem['level']>('Educação Superior completa');
  const [institution, setInstitution] = useState('');
  const [course, setCourse] = useState('');
  const [conclusionYear, setConclusionYear] = useState('');
  const [eduFile, setEduFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedInfo: EmployeePersonalInfo = {
        ...info,
        nationality,
        birth_state: birthState,
        birth_city: birthCity,
        ethnicity,
        gender,
        document_gender: docGender,
        social_name: socialName,
        marital_status: maritalStatus,
        birth_date: birthDate,
        mother_name: motherName,
        father_name: fatherName,
        team_name: teamName,
        registration_number: registrationNumber,
      };
      await onSaveEmployeePatch(
        {
          full_name: fullName.trim() || employee.full_name,
          cpf: cpf.trim() || null,
          pj_cnpj: pjCnpj.trim() || null,
          personal_info: updatedInfo,
        },
        'Informações pessoais atualizadas com sucesso.'
      );
      setEditingPersonal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePcd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveEmployeePatch(
        {
          personal_info: {
            ...info,
            has_disability: hasDisability,
            disability_type: hasDisability ? disabilityType : '',
            disability_notes: hasDisability ? disabilityNotes : '',
          },
        },
        'Dados de acessibilidade/PcD atualizados.'
      );
      setEditingPcd(false);
    } finally {
      setSaving(false);
    }
  };

  const openNewBankModal = () => {
    setEditingBankId(null);
    setBankName('');
    setAccountType('Conta Corrente');
    setBranchNumber('');
    setAccountNumber('');
    setPixKey('');
    setBankFile(null);
    setShowBankModal(true);
  };

  const openEditBankModal = (b: EmployeeBankAccount) => {
    setEditingBankId(b.id);
    setBankName(b.bank_name);
    setAccountType(b.account_type);
    setBranchNumber(b.branch_number);
    setAccountNumber(b.account_number);
    setPixKey(b.pix_key || '');
    setBankFile(null);
    setShowBankModal(true);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) return;
    setSaving(true);
    try {
      let uploadedDocId: string | null | undefined = undefined;
      let uploadedName: string | undefined = undefined;
      if (bankFile) {
        const doc = await onUploadAttachment('Comprovante_Bancario', bankFile);
        uploadedDocId = doc.id;
        uploadedName = bankFile.name;
      }

      const nextList = editingBankId
        ? bankAccounts.map((b) =>
            b.id === editingBankId
              ? {
                  ...b,
                  bank_name: bankName.trim(),
                  account_type: accountType,
                  branch_number: branchNumber.trim(),
                  account_number: accountNumber.trim(),
                  pix_key: pixKey.trim(),
                  attachment_document_id:
                    uploadedDocId !== undefined ? uploadedDocId : b.attachment_document_id,
                  attachment_name: uploadedName || b.attachment_name,
                }
              : b
          )
        : [
            ...bankAccounts,
            {
              id: crypto.randomUUID(),
              bank_name: bankName.trim(),
              account_type: accountType,
              branch_number: branchNumber.trim(),
              account_number: accountNumber.trim(),
              pix_key: pixKey.trim(),
              attachment_document_id: uploadedDocId || null,
              attachment_name: uploadedName,
            },
          ];

      await onSaveEmployeePatch(
        { bank_accounts: nextList },
        'Dados bancários salvos no prontuário.'
      );
      setShowBankModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    const nextList = bankAccounts.filter((b) => b.id !== id);
    await onSaveEmployeePatch({ bank_accounts: nextList }, 'Conta bancária removida.');
  };

  const openNewEduModal = () => {
    setEditingEduId(null);
    setEduLevel('Educação Superior completa');
    setInstitution('');
    setCourse('');
    setConclusionYear('');
    setEduFile(null);
    setShowEduModal(true);
  };

  const openEditEduModal = (edu: EmployeeEducationItem) => {
    setEditingEduId(edu.id);
    setEduLevel(edu.level);
    setInstitution(edu.institution);
    setCourse(edu.course);
    setConclusionYear(edu.conclusion_year);
    setEduFile(null);
    setShowEduModal(true);
  };

  const handleSaveEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim() || !course.trim()) return;
    setSaving(true);
    try {
      let uploadedDocId: string | null | undefined = undefined;
      let uploadedName: string | undefined = undefined;
      if (eduFile) {
        const doc = await onUploadAttachment('Diploma_Certificado', eduFile);
        uploadedDocId = doc.id;
        uploadedName = eduFile.name;
      }

      const nextList = editingEduId
        ? educationList.map((ed) =>
            ed.id === editingEduId
              ? {
                  ...ed,
                  level: eduLevel,
                  institution: institution.trim(),
                  course: course.trim(),
                  conclusion_year: conclusionYear.trim(),
                  attachment_document_id:
                    uploadedDocId !== undefined ? uploadedDocId : ed.attachment_document_id,
                  attachment_name: uploadedName || ed.attachment_name,
                }
              : ed
          )
        : [
            ...educationList,
            {
              id: crypto.randomUUID(),
              level: eduLevel,
              institution: institution.trim(),
              course: course.trim(),
              conclusion_year: conclusionYear.trim(),
              attachment_document_id: uploadedDocId || null,
              attachment_name: uploadedName,
            },
          ];

      await onSaveEmployeePatch(
        { education_history: nextList },
        'Formação acadêmica atualizada com sucesso.'
      );
      setShowEduModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEdu = async (id: string) => {
    const nextList = educationList.filter((ed) => ed.id !== id);
    await onSaveEmployeePatch({ education_history: nextList }, 'Formação acadêmica removida.');
  };

  const renderFieldRow = (label: string, value?: string | null) => (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 py-2 border-b border-slate-50 last:border-0 items-baseline">
      <span className="sm:col-span-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-right">
        {label}
      </span>
      <span className="sm:col-span-8 text-xs font-medium text-slate-800">
        {value && value.trim() ? value : '-'}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Card Informações Pessoais */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-[#082175]">Informações Pessoais</h3>
            <div className="w-12 h-0.5 bg-[#f5a90e] mt-1 rounded-full" />
          </div>
          {!editingPersonal && (
            <button
              type="button"
              onClick={() => setEditingPersonal(true)}
              title="Editar Informações Pessoais"
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#082175] hover:bg-slate-50 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {editingPersonal ? (
          <form onSubmit={handleSavePersonal} className="mt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nacionalidade</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">UF Natal</label>
                <input
                  type="text"
                  value={birthState}
                  onChange={(e) => setBirthState(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Cidade Natal</label>
                <input
                  type="text"
                  value={birthCity}
                  onChange={(e) => setBirthCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Cor / Raça</label>
                <select
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="">Selecione...</option>
                  <option value="Branca">Branca</option>
                  <option value="Parda">Parda</option>
                  <option value="Preta">Preta</option>
                  <option value="Amarela">Amarela</option>
                  <option value="Indígena">Indígena</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Gênero</label>
                <input
                  type="text"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder="Ex: Homem / Mulher"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Gênero no Documento</label>
                <select
                  value={docGender}
                  onChange={(e) => setDocGender(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Estado Civil</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="">Selecione...</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="União Estável">União Estável</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nome Social</label>
                <input
                  type="text"
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nome da Mãe</label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nome do Pai</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">CNPJ PJ (se aplicável)</label>
                <input
                  type="text"
                  value={pjCnpj}
                  onChange={(e) => setPjCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Time / Squad</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Operações Loja"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Matrícula Interna</label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="Ex: 00042"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPersonal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#082175] text-white font-semibold disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 divide-y divide-slate-50">
            {renderFieldRow('Nome Completo', employee.full_name)}
            {renderFieldRow('Nacionalidade(s)', info.nationality || 'Brasil')}
            {renderFieldRow('UF Natal', info.birth_state)}
            {renderFieldRow('Cidade Natal', info.birth_city)}
            {renderFieldRow('Cor / Raça', info.ethnicity)}
            {renderFieldRow('Gênero', info.gender)}
            {renderFieldRow('Gênero no Documento', info.document_gender)}
            {renderFieldRow('Nome Social', info.social_name)}
            {renderFieldRow('Estado Civil', info.marital_status)}
            {renderFieldRow(
              'Data de Nascimento',
              info.birth_date
                ? info.birth_date.split('-').reverse().join('/')
                : undefined
            )}
            {renderFieldRow('Nome da Mãe', info.mother_name)}
            {renderFieldRow('Nome do Pai', info.father_name)}
            {renderFieldRow('CNPJ PJ', employee.pj_cnpj)}
          </div>
        )}
      </div>

      {/* 2. Card Dados Bancários */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-[#082175]">Dados Bancários</h3>
            <div className="w-12 h-0.5 bg-[#f5a90e] mt-1 rounded-full" />
          </div>
          <button
            type="button"
            onClick={openNewBankModal}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f5a90e] hover:bg-[#d99208] text-[#082175] font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADICIONAR</span>
          </button>
        </div>

        {bankAccounts.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            Nenhuma conta bancária ou chave PIX cadastrada para este colaborador.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {bankAccounts.map((bank) => {
              const linkedDoc = employeeDocuments.find(
                (d) => d.id === bank.attachment_document_id
              );
              return (
                <div key={bank.id} className="py-4 first:pt-1 last:pb-1">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-[#082175]">{bank.bank_name}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditBankModal(bank)}
                        className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#082175]"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBank(bank.id)}
                        className="w-7 h-7 rounded-full border border-red-100 flex items-center justify-center text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {renderFieldRow('Tipo de Conta', bank.account_type)}
                    {renderFieldRow('Agência', bank.branch_number)}
                    {renderFieldRow('Conta', bank.account_number)}
                    {renderFieldRow('Chave PIX', bank.pix_key)}
                    {(bank.attachment_name || linkedDoc) && (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 py-2 items-center">
                        <span className="sm:col-span-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-right">
                          Anexos
                        </span>
                        <div className="sm:col-span-8">
                          <button
                            type="button"
                            onClick={() =>
                              linkedDoc ? onOpenDocument(linkedDoc.storage_path) : undefined
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-[#E0F4F7] text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3 text-slate-500" />
                            <span className="truncate max-w-[220px]">
                              {bank.attachment_name || 'COMPROVANTE DE CONTA'}
                            </span>
                            {linkedDoc && <ExternalLink className="w-3 h-3 text-[#082175]" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Card Formação Acadêmica */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-[#082175]">Formação Acadêmica</h3>
            <div className="w-12 h-0.5 bg-[#f5a90e] mt-1 rounded-full" />
          </div>
          <button
            type="button"
            onClick={openNewEduModal}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f5a90e] hover:bg-[#d99208] text-[#082175] font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADICIONAR</span>
          </button>
        </div>

        {educationList.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            Nenhuma formação acadêmica registrada.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {educationList.map((edu) => {
              const linkedDoc = employeeDocuments.find(
                (d) => d.id === edu.attachment_document_id
              );
              return (
                <div key={edu.id} className="py-4 first:pt-1 last:pb-1">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm text-[#082175]">{edu.level}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditEduModal(edu)}
                        className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#082175]"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEdu(edu.id)}
                        className="w-7 h-7 rounded-full border border-red-100 flex items-center justify-center text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {renderFieldRow('Instituição de Ensino', edu.institution)}
                    {renderFieldRow('Curso', edu.course)}
                    {renderFieldRow('Ano de Conclusão', edu.conclusion_year)}
                    {(edu.attachment_name || linkedDoc) && (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 py-2 items-center">
                        <span className="sm:col-span-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-right">
                          Anexos
                        </span>
                        <div className="sm:col-span-8">
                          <button
                            type="button"
                            onClick={() =>
                              linkedDoc ? onOpenDocument(linkedDoc.storage_path) : undefined
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-[#E0F4F7] text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3 text-slate-500" />
                            <span className="truncate max-w-[220px]">
                              {edu.attachment_name || 'DIPLOMA / CERTIFICADO'}
                            </span>
                            {linkedDoc && <ExternalLink className="w-3 h-3 text-[#082175]" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Card Pessoa com Deficiência */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-[#082175]">Pessoa com Deficiência</h3>
            <div className="w-12 h-0.5 bg-[#f5a90e] mt-1 rounded-full" />
          </div>
          {!editingPcd && (
            <button
              type="button"
              onClick={() => setEditingPcd(true)}
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#082175] hover:bg-slate-50 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {editingPcd ? (
          <form onSubmit={handleSavePcd} className="mt-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Possui alguma deficiência?
                </label>
                <select
                  value={hasDisability ? 'sim' : 'nao'}
                  onChange={(e) => setHasDisability(e.target.value === 'sim')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>
              {hasDisability && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Tipo</label>
                    <input
                      type="text"
                      value={disabilityType}
                      onChange={(e) => setDisabilityType(e.target.value)}
                      placeholder="Física, Auditiva, Visual..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Observações</label>
                    <input
                      type="text"
                      value={disabilityNotes}
                      onChange={(e) => setDisabilityNotes(e.target.value)}
                      placeholder="CID / Adaptações necessárias"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPcd(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-[#082175] text-white font-semibold"
              >
                Salvar
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 divide-y divide-slate-50">
            {renderFieldRow('Possui alguma deficiência?', info.has_disability ? 'Sim' : 'Não')}
            {renderFieldRow('Tipo', info.disability_type)}
            {renderFieldRow('Observações', info.disability_notes)}
          </div>
        )}
      </div>

      {/* Modal Adicionar / Editar Conta Bancária */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-[#082175]">
                {editingBankId ? 'Editar Conta Bancária' : 'Adicionar Conta Bancária'}
              </h4>
              <button onClick={() => setShowBankModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBank} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Banco / Instituição Financeira *
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ex: Itaú, Bradesco, Nubank, DOCK IP S.A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Conta</label>
                  <select
                    value={accountType}
                    onChange={(e) =>
                      setAccountType(e.target.value as EmployeeBankAccount['account_type'])
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="Conta Corrente">Conta Corrente</option>
                    <option value="Conta Salário">Conta Salário</option>
                    <option value="Conta Poupança">Conta Poupança</option>
                    <option value="Conta Pagamento">Conta Pagamento</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={branchNumber}
                    onChange={(e) => setBranchNumber(e.target.value)}
                    placeholder="0001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Conta com Dígito</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="3119931-9"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chave PIX</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="CPF, CNPJ, E-mail ou Celular"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Comprovante Bancário (Opcional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setBankFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#082175] text-white font-semibold disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar / Editar Formação Acadêmica */}
      {showEduModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-[#082175]">
                {editingEduId ? 'Editar Formação Acadêmica' : 'Adicionar Formação Acadêmica'}
              </h4>
              <button onClick={() => setShowEduModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdu} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nível de Escolaridade</label>
                <select
                  value={eduLevel}
                  onChange={(e) => setEduLevel(e.target.value as EmployeeEducationItem['level'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="Ensino Médio completo">Ensino Médio completo</option>
                  <option value="Técnico completo">Técnico completo</option>
                  <option value="Educação Superior incompleta">Educação Superior incompleta</option>
                  <option value="Educação Superior completa">Educação Superior completa</option>
                  <option value="Pós-graduação / MBA">Pós-graduação / MBA</option>
                  <option value="Mestrado / Doutorado">Mestrado / Doutorado</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Instituição de Ensino *
                </label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ex: FATEC-SP, USP, Estácio, ETEC"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Curso *</label>
                  <input
                    type="text"
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="Ex: Ciências Contábeis, Administração"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ano de Conclusão</label>
                  <input
                    type="text"
                    value={conclusionYear}
                    onChange={(e) => setConclusionYear(e.target.value)}
                    placeholder="Ex: 2024"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Diploma / Declaração (Opcional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setEduFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEduModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#082175] text-white font-semibold disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Formação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
