import React, { useState } from 'react';
import {
  DocumentRecord,
  DocumentStatus,
  DocumentType,
  Employee,
  EmployeeAdditionalInfo,
  EmployeeAddressInfo,
  EmployeeDependentItem,
} from '../../types/database';
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  RG: 'Documento de Identidade (RG)',
  CPF: 'Cadastro de Pessoa Física (CPF)',
  Comprovante_Residencia: 'Comprovante de Residência',
  Curriculo: 'Currículo',
  Contrato: 'Contrato de Trabalho / Prestação PJ',
  Carteira_Trabalho: 'Carteira de Trabalho Digital (CTPS)',
  ASO: 'Atestado de Saúde Ocupacional (ASO)',
  Diploma_Certificado: 'Diploma / Certificado Acadêmico',
  Comprovante_Bancario: 'Comprovante de Conta Bancária',
  Outros: 'Outros Documentos',
};

interface AddressTabProps {
  employee: Employee;
  onSaveEmployeePatch: (patch: Partial<Employee>, successMessage: string) => Promise<void>;
}

export const EmployeeAddressTab: React.FC<AddressTabProps> = ({
  employee,
  onSaveEmployeePatch,
}) => {
  const addr: EmployeeAddressInfo = employee.address_info || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState(employee.phone || '');
  const [personalEmail, setPersonalEmail] = useState(addr.personal_email || '');
  const [cep, setCep] = useState(addr.cep || '');
  const [endereco, setEndereco] = useState(addr.endereco || '');
  const [numero, setNumero] = useState(addr.numero || '');
  const [complemento, setComplemento] = useState(addr.complemento || '');
  const [bairro, setBairro] = useState(addr.bairro || '');
  const [cidade, setCidade] = useState(addr.cidade || '');
  const [estado, setEstado] = useState(addr.estado || '');
  const [emergencyName, setEmergencyName] = useState(addr.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(addr.emergency_contact_phone || '');
  const [emergencyRelation, setEmergencyRelation] = useState(addr.emergency_contact_relation || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveEmployeePatch(
        {
          phone: phone.trim() || null,
          address_info: {
            cep: cep.trim(),
            endereco: endereco.trim(),
            numero: numero.trim(),
            complemento: complemento.trim(),
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            estado: estado.trim(),
            personal_email: personalEmail.trim(),
            emergency_contact_name: emergencyName.trim(),
            emergency_contact_phone: emergencyPhone.trim(),
            emergency_contact_relation: emergencyRelation.trim(),
          },
        },
        'Endereços e contatos atualizados com sucesso.'
      );
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (label: string, value?: string | null) => (
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
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-[#082175]">Endereços e Contatos</h3>
          <div className="w-12 h-0.5 bg-[#f5a90e] mt-1 rounded-full" />
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#082175] cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">E-mail Pessoal</label>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">CEP</label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">Logradouro / Rua</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Número</label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Complemento</label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Bairro</label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Estado (UF)</label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Contato de Emergência</label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Nome do familiar"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Telefone de Emergência</label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Parentesco</label>
              <input
                type="text"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="Cônjuge, Mãe, Pai..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-[#082175] text-white font-semibold"
            >
              {saving ? 'Salvando...' : 'Salvar Endereço e Contatos'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 divide-y divide-slate-50">
          {renderRow('E-mail Corporativo', employee.email)}
          {renderRow('E-mail Pessoal', addr.personal_email)}
          {renderRow('Telefone / WhatsApp', employee.phone)}
          {renderRow('CEP', addr.cep)}
          {renderRow('Logradouro', addr.endereco)}
          {renderRow('Número', addr.numero)}
          {renderRow('Complemento', addr.complemento)}
          {renderRow('Bairro', addr.bairro)}
          {renderRow('Cidade / UF', [addr.cidade, addr.estado].filter(Boolean).join(' - '))}
          {renderRow('Contato de Emergência', addr.emergency_contact_name)}
          {renderRow('Telefone Emergência', addr.emergency_contact_phone)}
          {renderRow('Parentesco', addr.emergency_contact_relation)}
        </div>
      )}
    </div>
  );
};

interface DependentsTabProps {
  employee: Employee;
  onSaveEmployeePatch: (patch: Partial<Employee>, successMessage: string) => Promise<void>;
}

export const EmployeeDependentsTab: React.FC<DependentsTabProps> = ({
  employee,
  onSaveEmployeePatch,
}) => {
  const dependents: EmployeeDependentItem[] = employee.dependents_list || [];
  const [showModal, setShowModal] = useState(false);
  const [depName, setDepName] = useState('');
  const [relationship, setRelationship] =
    useState<EmployeeDependentItem['relationship']>('Filho(a) / Enteado(a)');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [irrfDependent, setIrrfDependent] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depName.trim()) return;
    setSaving(true);
    try {
      const nextList: EmployeeDependentItem[] = [
        ...dependents,
        {
          id: crypto.randomUUID(),
          full_name: depName.trim(),
          relationship,
          birth_date: birthDate,
          cpf: cpf.trim(),
          irrf_dependent: irrfDependent,
        },
      ];
      const irrfCount = nextList.filter((d) => d.irrf_dependent).length;
      await onSaveEmployeePatch(
        {
          dependents_list: nextList,
          dependents_count: irrfCount,
        },
        `Dependente adicionado. Total de dependentes IRRF sincronizado (${irrfCount}) com a Folha de Pagamento.`
      );
      setDepName('');
      setBirthDate('');
      setCpf('');
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDependent = async (id: string) => {
    const nextList = dependents.filter((d) => d.id !== id);
    const irrfCount = nextList.filter((d) => d.irrf_dependent).length;
    await onSaveEmployeePatch(
      {
        dependents_list: nextList,
        dependents_count: irrfCount,
      },
      `Dependente removido. Folha em rascunho sincronizada (${irrfCount} dependente(s) IRRF).`
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-[#082175]">Dependentes</h3>
          <div className="w-12 h-0.5 bg-[#f5a90e] mt-1 rounded-full" />
          <p className="text-xs text-slate-500 mt-1">
            Dependentes marcados para dedução de IRRF refletem automaticamente no cálculo da Folha de Pagamento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f5a90e] hover:bg-[#d99208] text-[#082175] font-bold text-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ADICIONAR</span>
        </button>
      </div>

      {dependents.length === 0 ? (
        <div className="py-10 text-center space-y-2 text-xs text-slate-400">
          <Users className="w-8 h-8 mx-auto text-slate-300" />
          <p>
            Nenhum dependente listado ({employee.dependents_count || 0} dependente(s) configurado(s) para IRRF).
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {dependents.map((dep) => (
            <div key={dep.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#082175]">{dep.full_name}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    {dep.relationship}
                  </span>
                  {dep.irrf_dependent && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Dedução IRRF
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  CPF: {dep.cpf || '-'} · Nascimento:{' '}
                  {dep.birth_date ? dep.birth_date.split('-').reverse().join('/') : '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveDependent(dep.id)}
                className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-[#082175]">Adicionar Dependente</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDependent} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={depName}
                  onChange={(e) => setDepName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parentesco</label>
                  <select
                    value={relationship}
                    onChange={(e) =>
                      setRelationship(e.target.value as EmployeeDependentItem['relationship'])
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="Filho(a) / Enteado(a)">Filho(a) / Enteado(a)</option>
                    <option value="Cônjuge / Companheiro(a)">Cônjuge / Companheiro(a)</option>
                    <option value="Pais / Avós">Pais / Avós</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPF do Dependente</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <label className="flex items-center gap-2 font-semibold text-[#082175] pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={irrfDependent}
                  onChange={(e) => setIrrfDependent(e.target.checked)}
                />
                <span>Elegível para dedução legal de IRRF na Folha (R$ 189,59/mês)</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#082175] text-white font-semibold"
                >
                  {saving ? 'Salvando...' : 'Adicionar Dependente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface AdditionalTabProps {
  employee: Employee;
  onSaveEmployeePatch: (patch: Partial<Employee>, successMessage: string) => Promise<void>;
}

export const EmployeeAdditionalTab: React.FC<AdditionalTabProps> = ({
  employee,
  onSaveEmployeePatch,
}) => {
  const add: EmployeeAdditionalInfo = employee.additional_info || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [authorizeBirthday, setAuthorizeBirthday] = useState(
    add.authorize_birthday_disclosure || ''
  );
  const [hasChildren, setHasChildren] = useState(add.has_children || '');
  const [childrenInfo, setChildrenInfo] = useState(add.children_info || '');
  const [pets, setPets] = useState(add.pets || '');
  const [languages, setLanguages] = useState(add.languages || '');
  const [dietaryRestriction, setDietaryRestriction] = useState(add.dietary_restriction || '');
  const [shirtSize, setShirtSize] = useState(add.shirt_size || '');
  const [hobbies, setHobbies] = useState(add.hobbies || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveEmployeePatch(
        {
          additional_info: {
            authorize_birthday_disclosure: authorizeBirthday,
            has_children: hasChildren,
            children_info: childrenInfo,
            pets,
            languages,
            dietary_restriction: dietaryRestriction,
            shirt_size: shirtSize,
            hobbies,
          },
        },
        'Informações adicionais atualizadas.'
      );
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (label: string, value?: string | null) => (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 py-2.5 border-b border-slate-50 last:border-0 items-baseline">
      <span className="sm:col-span-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-right">
        {label}
      </span>
      <span className="sm:col-span-7 text-xs font-medium text-slate-800">
        {value && value.trim() ? value : '-'}
      </span>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-[#082175]">Informações adicionais</h3>
          <div className="w-12 h-0.5 bg-[#f5a90e] mt-1 rounded-full" />
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#082175] cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Autoriza a divulgação do seu aniversário pelo RH?
              </label>
              <select
                value={authorizeBirthday}
                onChange={(e) => setAuthorizeBirthday(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="">-</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Possui filhos?</label>
              <select
                value={hasChildren}
                onChange={(e) => setHasChildren(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="">-</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">
                Informações sobre filhos
              </label>
              <input
                type="text"
                value={childrenInfo}
                onChange={(e) => setChildrenInfo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Pets</label>
              <input
                type="text"
                value={pets}
                onChange={(e) => setPets(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Idiomas e nível</label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="Ex: Inglês Intermediário, Espanhol Básico"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Restrição alimentar</label>
              <input
                type="text"
                value={dietaryRestriction}
                onChange={(e) => setDietaryRestriction(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Tamanho de camiseta</label>
              <select
                value={shirtSize}
                onChange={(e) => setShirtSize(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="">-</option>
                <option value="PP">PP</option>
                <option value="P">P</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="GG">GG</option>
                <option value="XG">XG</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">
                Hobbies e interesses
              </label>
              <input
                type="text"
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-[#082175] text-white font-semibold"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 divide-y divide-slate-50">
          {renderRow(
            'Autoriza a divulgação do seu aniversário pelo RH?',
            add.authorize_birthday_disclosure
          )}
          {renderRow('Possui filhos?', add.has_children)}
          {renderRow('Informações sobre filhos', add.children_info)}
          {renderRow('Pets', add.pets)}
          {renderRow('Idiomas e nível', add.languages)}
          {renderRow('Restrição alimentar', add.dietary_restriction)}
          {renderRow('Tamanho de camiseta', add.shirt_size)}
          {renderRow('Hobbies e interesses', add.hobbies)}
        </div>
      )}
    </div>
  );
};

interface DocumentsTabProps {
  employee: Employee;
  documents: DocumentRecord[];
  onUploadDocument: (docType: DocumentType, file: File) => Promise<DocumentRecord>;
  onUpdateStatus: (docId: string, status: DocumentStatus) => Promise<void>;
  onDeleteDocument: (docId: string, storagePath: string) => Promise<void>;
  onOpenDocument: (storagePath: string) => Promise<void>;
}

export const EmployeeDocumentsTab: React.FC<DocumentsTabProps> = ({
  documents,
  onUploadDocument,
  onUpdateStatus,
  onDeleteDocument,
  onOpenDocument,
}) => {
  const [selectedType, setSelectedType] = useState<DocumentType>('RG');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      await onUploadDocument(selectedType, selectedFile);
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário para Anexar Novo Documento ao Prontuário */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#082175]">
            Prontuário Digital & Documentos da Contratação
          </h3>
          <div className="w-12 h-0.5 bg-[#f5a90e] mt-1 rounded-full" />
          <p className="text-xs text-slate-500 mt-1">
            Documentos enviados pelo candidato aprovado na Etapa 4 são migrados automaticamente para este prontuário.
          </p>
        </div>

        <form
          onSubmit={handleUpload}
          className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs"
        >
          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Documento</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DocumentType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
            >
              {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((type) => (
                <option key={type} value={type}>
                  {DOC_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5">
            <label className="block font-semibold text-slate-700 mb-1">Arquivo (PDF, Imagem ou DOC)</label>
            <input
              type="file"
              required
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#f5a90e]" />
              <span>{uploading ? 'Enviando...' : 'Anexar ao Prontuário'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Documentos do Funcionário */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Arquivos Vinculados ({documents.length})
        </h4>

        {documents.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 space-y-1">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">Nenhum documento anexado a este funcionário.</p>
            <p>Utilize o formulário acima para anexar RG, CPF, ASO, Contrato ou certificados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => {
              const fileName = doc.storage_path.split('/').pop() || doc.storage_path;
              return (
                <div
                  key={doc.id}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#E0F4F7] text-[#03416A] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#082175]">
                          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </span>
                        {doc.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Validado
                          </span>
                        )}
                        {doc.status === 'pending_review' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> Em Análise
                          </span>
                        )}
                        {doc.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                            <XCircle className="w-3 h-3" /> Rejeitado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {fileName} · Enviado em{' '}
                        {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenDocument(doc.storage_path)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[#082175] hover:bg-slate-50 font-semibold cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </button>
                    {doc.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(doc.id, 'approved')}
                        title="Aprovar documento"
                        className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.id, doc.storage_path)}
                      title="Excluir documento"
                      className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
