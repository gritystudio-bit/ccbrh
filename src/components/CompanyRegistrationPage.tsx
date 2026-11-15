import React, { useState } from 'react';
import { useCcb } from '../context/CcbContext';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  FileCheck,
  Gift,
  MapPin,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

interface CompanyRegistrationPageProps {
  onBackToLanding: () => void;
}

interface BranchEntry {
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
}

interface VacancyEntry {
  cargo: string;
  area: string;
  salario: string;
  vagas_disponiveis: number;
  tipo_contratacao: 'clt' | 'pj' | 'temporario' | 'estagio';
  regime: 'presencial' | 'hibrido' | 'remoto';
  cidade: string;
  estado: string;
  descricao: string;
  requisitos: string;
}

interface CompanyFormData {
  nome: string;
  cnpj: string;
  area_atuacao: string;
  email: string;
  telefone: string;
  porte: 'micro' | 'pequena' | 'media' | 'grande';
  descricao: string;
  logoName: string;
  logoPreview: string;
  regulamentoName: string;
  codigoCondutaName: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  tem_filiais: boolean;
  filiais: BranchEntry[];
  responsavel_nome: string;
  responsavel_cargo: string;
  beneficios: string[];
}

const BENEFICIOS_OPTIONS = [
  'Assistência Médica',
  'Assistência Odontológica',
  'VR',
  'VT',
  'VA',
  'Refeição',
  'Desenvolvimento Profissional',
  'Seguro de Vida',
  'Plano de Previdência Privada',
  'Desconto de Produtos',
  'Premiações',
  'PLR',
  'Auxílio Creche',
];

const INITIAL_COMPANY: CompanyFormData = {
  nome: '',
  cnpj: '',
  area_atuacao: '',
  email: '',
  telefone: '',
  porte: 'pequena',
  descricao: '',
  logoName: '',
  logoPreview: '',
  regulamentoName: '',
  codigoCondutaName: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cep: '',
  cidade: '',
  estado: '',
  tem_filiais: false,
  filiais: [],
  responsavel_nome: '',
  responsavel_cargo: '',
  beneficios: [],
};

const INITIAL_VACANCY: VacancyEntry = {
  cargo: '',
  area: '',
  salario: '',
  vagas_disponiveis: 1,
  tipo_contratacao: 'clt',
  regime: 'presencial',
  cidade: '',
  estado: '',
  descricao: '',
  requisitos: '',
};

export const CompanyRegistrationPage: React.FC<CompanyRegistrationPageProps> = ({
  onBackToLanding,
}) => {
  const { submitPublicCompanyRegistration } = useCcb();
  const [form, setForm] = useState<CompanyFormData>(INITIAL_COMPANY);
  const [vagas, setVagas] = useState<VacancyEntry[]>([{ ...INITIAL_VACANCY }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const updateField = <K extends keyof CompanyFormData>(key: K, value: CompanyFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        logoName: file.name,
        logoPreview: typeof reader.result === 'string' ? reader.result : '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'regulamentoName' | 'codigoCondutaName'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateField(target, file.name);
  };

  const toggleBeneficio = (item: string) => {
    setForm((prev) => ({
      ...prev,
      beneficios: prev.beneficios.includes(item)
        ? prev.beneficios.filter((b) => b !== item)
        : [...prev.beneficios, item],
    }));
  };

  const addFilial = () => {
    setForm((prev) => ({
      ...prev,
      filiais: [...prev.filiais, { endereco: '', cidade: '', estado: '', cep: '' }],
    }));
  };

  const updateFilial = (index: number, field: keyof BranchEntry, value: string) => {
    setForm((prev) => ({
      ...prev,
      filiais: prev.filiais.map((f, idx) => (idx === index ? { ...f, [field]: value } : f)),
    }));
  };

  const removeFilial = (index: number) => {
    setForm((prev) => ({
      ...prev,
      filiais: prev.filiais.filter((_, idx) => idx !== index),
    }));
  };

  const addVaga = () => {
    setVagas((prev) => [...prev, { ...INITIAL_VACANCY }]);
  };

  const updateVaga = <K extends keyof VacancyEntry>(
    index: number,
    field: K,
    value: VacancyEntry[K]
  ) => {
    setVagas((prev) => prev.map((v, idx) => (idx === index ? { ...v, [field]: value } : v)));
  };

  const removeVaga = (index: number) => {
    setVagas((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.nome.trim() || !form.email.trim()) {
      setError('Preencha os campos obrigatórios: Nome da Empresa e E-mail.');
      return;
    }

    const validVacancy = vagas.some((v) => v.cargo.trim().length > 0);
    if (!validVacancy) {
      setError('Informe o cargo de pelo menos uma vaga disponível.');
      return;
    }

    setSubmitting(true);
    try {
      await submitPublicCompanyRegistration({
        company: {
          name: form.nome,
          cnpj: form.cnpj,
          email: form.email,
          telefone: form.telefone,
          area_atuacao: form.area_atuacao,
          porte: form.porte,
          descricao: form.descricao,
          endereco: form.endereco,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cep: form.cep,
          cidade: form.cidade,
          estado: form.estado,
          tem_filiais: form.tem_filiais,
          responsavel_nome: form.responsavel_nome,
          responsavel_cargo: form.responsavel_cargo,
          beneficios: form.beneficios,
          status: 'pending_review',
        },
        branches: form.tem_filiais ? form.filiais : [],
        vacancies: vagas,
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro de conexão ao enviar o cadastro. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-20 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Cadastro realizado!</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-8">
            Sua empresa foi cadastrada com sucesso. Nossa equipe entrará em contato em breve para
            confirmar os dados e iniciar o processo de seleção de talentos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={onBackToLanding}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setForm(INITIAL_COMPANY);
                setVagas([{ ...INITIAL_VACANCY }]);
              }}
              className="px-6 py-2.5 rounded-lg bg-[#082175] text-white text-sm font-semibold hover:bg-[#0a2a8a] transition-colors cursor-pointer"
            >
              Novo Cadastro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-[#082175] selection:text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-[#082175] flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-[#9F8548]" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Cadastro de Empresa</h1>
        </div>
        <p className="text-slate-600 mb-10 sm:pl-15">
          Preencha os dados da sua empresa e cadastre as vagas que precisa preencher.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Dados da Empresa */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Dados da Empresa</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Logotipo (PNG)</label>
                <div className="mt-1.5 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-700">Anexar Logotipo</span>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  {form.logoPreview ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={form.logoPreview}
                        alt="Logo da empresa"
                        className="h-12 w-auto rounded border border-slate-200 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, logoName: '', logoPreview: '' }))
                        }
                        className="text-red-500 hover:text-red-700 text-sm cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Formato PNG</span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => updateField('nome', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">CNPJ</label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => updateField('cnpj', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175] font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Área de Atuação
                </label>
                <input
                  type="text"
                  value={form.area_atuacao}
                  onChange={(e) => updateField('area_atuacao', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">E-mail *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => updateField('telefone', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Porte da Empresa
                </label>
                <select
                  value={form.porte}
                  onChange={(e) =>
                    updateField('porte', e.target.value as CompanyFormData['porte'])
                  }
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                >
                  <option value="micro">Microempresa</option>
                  <option value="pequena">Pequena</option>
                  <option value="media">Média</option>
                  <option value="grande">Grande</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Descrição da Empresa
                </label>
                <textarea
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => updateField('descricao', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
            </div>
          </section>

          {/* 2. Documentos */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Documentos</h2>
            <p className="text-sm text-slate-500 mb-6">
              Anexe os documentos institucionais da empresa (PDF, DOC, DOCX).
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Regulamento Interno
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-700">Anexar Regulamento</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleDocumentChange(e, 'regulamentoName')}
                      className="hidden"
                    />
                  </label>
                  {form.regulamentoName && (
                    <span className="flex items-center gap-1.5 text-sm text-green-600">
                      <FileCheck className="w-4 h-4 shrink-0" />
                      <span>Regulamento anexado</span>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Código de Conduta
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-700">Anexar Código de Conduta</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleDocumentChange(e, 'codigoCondutaName')}
                      className="hidden"
                    />
                  </label>
                  {form.codigoCondutaName && (
                    <span className="flex items-center gap-1.5 text-sm text-green-600">
                      <FileCheck className="w-4 h-4 shrink-0" />
                      <span>Código anexado</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Endereço Completo */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Endereço Completo</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Logradouro</label>
                <input
                  type="text"
                  placeholder="Rua, Avenida..."
                  value={form.endereco}
                  onChange={(e) => updateField('endereco', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Número</label>
                <input
                  type="text"
                  value={form.numero}
                  onChange={(e) => updateField('numero', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Complemento</label>
                <input
                  type="text"
                  placeholder="Sala, andar..."
                  value={form.complemento}
                  onChange={(e) => updateField('complemento', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Bairro</label>
                <input
                  type="text"
                  value={form.bairro}
                  onChange={(e) => updateField('bairro', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">CEP</label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={(e) => updateField('cep', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175] font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Cidade</label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(e) => updateField('cidade', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Estado</label>
                <input
                  type="text"
                  value={form.estado}
                  onChange={(e) => updateField('estado', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
            </div>
          </section>

          {/* 4. Filiais */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Filiais</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tem_filiais}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      tem_filiais: checked,
                      filiais:
                        checked && prev.filiais.length === 0
                          ? [{ endereco: '', cidade: '', estado: '', cep: '' }]
                          : prev.filiais,
                    }));
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-[#082175] focus:ring-[#082175]"
                />
                <span className="text-sm text-slate-600">A empresa possui outras filiais</span>
              </label>
            </div>

            {form.tem_filiais ? (
              <div className="space-y-6">
                {form.filiais.map((filial, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 p-5 bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#082175]" />
                        <span>Filial {index + 1}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFilial(index)}
                        className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer"
                        aria-label={`Remover Filial ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Endereço
                        </label>
                        <input
                          type="text"
                          placeholder="Logradouro, número..."
                          value={filial.endereco}
                          onChange={(e) => updateFilial(index, 'endereco', e.target.value)}
                          className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Cidade</label>
                        <input
                          type="text"
                          value={filial.cidade}
                          onChange={(e) => updateFilial(index, 'cidade', e.target.value)}
                          className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Estado</label>
                        <input
                          type="text"
                          value={filial.estado}
                          onChange={(e) => updateFilial(index, 'estado', e.target.value)}
                          className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">CEP</label>
                        <input
                          type="text"
                          value={filial.cep}
                          onChange={(e) => updateFilial(index, 'cep', e.target.value)}
                          className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addFilial}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Filial</span>
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Marque a opção acima se a empresa possui outras unidades/filiais.
              </p>
            )}
          </section>

          {/* 5. Responsável */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Responsável</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  value={form.responsavel_nome}
                  onChange={(e) => updateField('responsavel_nome', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Cargo</label>
                <input
                  type="text"
                  value={form.responsavel_cargo}
                  onChange={(e) => updateField('responsavel_cargo', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
            </div>
          </section>

          {/* 6. Benefícios Oferecidos */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-[#082175]" />
              <h2 className="text-lg font-semibold text-slate-900">Benefícios Oferecidos</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Marque os benefícios que a empresa oferece aos colaboradores.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BENEFICIOS_OPTIONS.map((item) => {
                const selected = form.beneficios.includes(item);
                return (
                  <label
                    key={item}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selected
                        ? 'border-[#082175] bg-[#082175]/5'
                        : 'border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleBeneficio(item)}
                      className="w-4 h-4 rounded border-slate-300 text-[#082175] focus:ring-[#082175]"
                    />
                    <span
                      className={`text-sm ${
                        selected ? 'text-[#082175] font-medium' : 'text-slate-700'
                      }`}
                    >
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* 7. Vagas Disponíveis */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#082175]" />
                <h2 className="text-lg font-semibold text-slate-900">Vagas Disponíveis</h2>
              </div>
              <button
                type="button"
                onClick={addVaga}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Vaga</span>
              </button>
            </div>

            <div className="space-y-6">
              {vagas.map((vaga, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 p-5 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-slate-700">Vaga {idx + 1}</span>
                    {vagas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVaga(idx)}
                        className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer"
                        aria-label={`Remover Vaga ${idx + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Cargo *</label>
                      <input
                        type="text"
                        required
                        value={vaga.cargo}
                        onChange={(e) => updateVaga(idx, 'cargo', e.target.value)}
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Área</label>
                      <input
                        type="text"
                        value={vaga.area}
                        onChange={(e) => updateVaga(idx, 'area', e.target.value)}
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Salário (R$)
                      </label>
                      <input
                        type="number"
                        value={vaga.salario}
                        onChange={(e) => updateVaga(idx, 'salario', e.target.value)}
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175] font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Vagas Disponíveis
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={vaga.vagas_disponiveis}
                        onChange={(e) =>
                          updateVaga(idx, 'vagas_disponiveis', Number(e.target.value) || 1)
                        }
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175] font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Tipo de Contratação
                      </label>
                      <select
                        value={vaga.tipo_contratacao}
                        onChange={(e) =>
                          updateVaga(
                            idx,
                            'tipo_contratacao',
                            e.target.value as VacancyEntry['tipo_contratacao']
                          )
                        }
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                      >
                        <option value="clt">CLT</option>
                        <option value="pj">PJ</option>
                        <option value="temporario">Temporário</option>
                        <option value="estagio">Estágio</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Regime</label>
                      <select
                        value={vaga.regime}
                        onChange={(e) =>
                          updateVaga(idx, 'regime', e.target.value as VacancyEntry['regime'])
                        }
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                      >
                        <option value="presencial">Presencial</option>
                        <option value="hibrido">Híbrido</option>
                        <option value="remoto">Remoto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Cidade</label>
                      <input
                        type="text"
                        value={vaga.cidade}
                        onChange={(e) => updateVaga(idx, 'cidade', e.target.value)}
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Estado</label>
                      <input
                        type="text"
                        value={vaga.estado}
                        onChange={(e) => updateVaga(idx, 'estado', e.target.value)}
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Descrição da Vaga
                      </label>
                      <textarea
                        rows={2}
                        value={vaga.descricao}
                        onChange={(e) => updateVaga(idx, 'descricao', e.target.value)}
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Requisitos
                      </label>
                      <textarea
                        rows={2}
                        value={vaga.requisitos}
                        onChange={(e) => updateVaga(idx, 'requisitos', e.target.value)}
                        className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={onBackToLanding}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 rounded-lg bg-[#082175] text-white text-sm font-semibold hover:bg-[#0a2a8a] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Cadastrando...' : 'Finalizar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
