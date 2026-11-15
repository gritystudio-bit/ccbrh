import React, { useState } from 'react';
import { useCcb } from '../context/CcbContext';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  FileCheck,
  Upload,
  UserPlus,
} from 'lucide-react';

interface TalentRegistrationPageProps {
  onBackToLanding: () => void;
  onViewVacancies: () => void;
}

interface TalentFormData {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  formacao: string;
  instituicao: string;
  area_formacao: string;
  experiencias: string;
  habilidades: string;
  idiomas: string;
  pretensao_salarial: string;
  cargo_desejado: string;
  area_interesse: string;
  disponibilidade: 'imediata' | '15_dias' | '30_dias' | '60_dias';
  regime_preferido: 'presencial' | 'hibrido' | 'remoto';
  linkedin: string;
  curriculoNome: string;
}

const INITIAL_FORM: TalentFormData = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  data_nascimento: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  formacao: '',
  instituicao: '',
  area_formacao: '',
  experiencias: '',
  habilidades: '',
  idiomas: '',
  pretensao_salarial: '',
  cargo_desejado: '',
  area_interesse: '',
  disponibilidade: 'imediata',
  regime_preferido: 'presencial',
  linkedin: '',
  curriculoNome: '',
};

export const TalentRegistrationPage: React.FC<TalentRegistrationPageProps> = ({
  onBackToLanding,
  onViewVacancies,
}) => {
  const { submitTalentRegistration } = useCcb();
  const [form, setForm] = useState<TalentFormData>(INITIAL_FORM);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const updateField = <K extends keyof TalentFormData>(key: K, value: TalentFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResumeFile(file);
    updateField('curriculoNome', file.name);
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.nome.trim() || !form.email.trim()) {
      setError('Preencha os campos obrigatórios: Nome Completo e E-mail.');
      return;
    }

    setSubmitting(true);
    try {
      await submitTalentRegistration(
        {
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim(),
          cpf: form.cpf.trim(),
          data_nascimento: form.data_nascimento || undefined,
          endereco: form.endereco.trim(),
          cidade: form.cidade.trim(),
          estado: form.estado.trim(),
          cep: form.cep.trim(),
          formacao: form.formacao.trim(),
          instituicao: form.instituicao.trim(),
          area_formacao: form.area_formacao.trim(),
          experiencias: form.experiencias.trim(),
          habilidades: form.habilidades.trim(),
          idiomas: form.idiomas.trim(),
          pretensao_salarial: form.pretensao_salarial ? Number(form.pretensao_salarial) : null,
          cargo_desejado: form.cargo_desejado.trim(),
          area_interesse: form.area_interesse.trim(),
          disponibilidade: form.disponibilidade,
          regime_preferido: form.regime_preferido,
          linkedin: form.linkedin.trim() || null,
          curriculo_url: null,
        },
        resumeFile
      );
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro de comunicação ao enviar o cadastro. Tente novamente.'
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
            Seu currículo foi cadastrado em nosso banco de talentos. Entraremos em contato quando
            houver oportunidades compatíveis com seu perfil.
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
              onClick={onViewVacancies}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg bg-[#082175] text-white text-sm font-semibold hover:bg-[#0a2a8a] transition-colors cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Ver Vagas e Candidatar</span>
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
            <UserPlus className="w-6 h-6 text-[#9F8548]" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Cadastro de Talento</h1>
        </div>
        <p className="text-slate-600 mb-10 sm:pl-15">
          Crie seu currículo digital e faça parte do nosso banco de talentos.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Dados Pessoais */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Dados Pessoais</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Nome Completo *
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
                <label className="block text-sm font-medium text-slate-700">E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
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
                <label className="block text-sm font-medium text-slate-700">CPF</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => updateField('cpf', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175] font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => updateField('data_nascimento', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Endereço</label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(e) => updateField('endereco', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
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

              <div>
                <label className="block text-sm font-medium text-slate-700">CEP</label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={(e) => updateField('cep', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175] font-mono"
                />
              </div>
            </div>
          </section>

          {/* 2. Formação & Experiência */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              Formação & Experiência
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">Escolaridade</label>
                <input
                  type="text"
                  placeholder="Ex: Ensino Superior Completo"
                  value={form.formacao}
                  onChange={(e) => updateField('formacao', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Instituição</label>
                <input
                  type="text"
                  value={form.instituicao}
                  onChange={(e) => updateField('instituicao', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Área de Formação
                </label>
                <input
                  type="text"
                  value={form.area_formacao}
                  onChange={(e) => updateField('area_formacao', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Experiências Profissionais
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva suas experiências anteriores, cargos, empresas e período..."
                  value={form.experiencias}
                  onChange={(e) => updateField('experiencias', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Habilidades</label>
                <textarea
                  rows={3}
                  placeholder="Liste suas principais habilidades e competências..."
                  value={form.habilidades}
                  onChange={(e) => updateField('habilidades', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Idiomas</label>
                <input
                  type="text"
                  placeholder="Ex: Português (Nativo), Inglês (Intermediário)"
                  value={form.idiomas}
                  onChange={(e) => updateField('idiomas', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
            </div>
          </section>

          {/* 3. Preferências Profissionais */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              Preferências Profissionais
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Pretensão Salarial (R$)
                </label>
                <input
                  type="number"
                  value={form.pretensao_salarial}
                  onChange={(e) => updateField('pretensao_salarial', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175] font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Cargo Desejado
                </label>
                <input
                  type="text"
                  value={form.cargo_desejado}
                  onChange={(e) => updateField('cargo_desejado', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Área de Interesse
                </label>
                <input
                  type="text"
                  value={form.area_interesse}
                  onChange={(e) => updateField('area_interesse', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Disponibilidade
                </label>
                <select
                  value={form.disponibilidade}
                  onChange={(e) =>
                    updateField(
                      'disponibilidade',
                      e.target.value as TalentFormData['disponibilidade']
                    )
                  }
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                >
                  <option value="imediata">Imediata</option>
                  <option value="15_dias">15 dias</option>
                  <option value="30_dias">30 dias</option>
                  <option value="60_dias">60 dias</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Regime Preferido
                </label>
                <select
                  value={form.regime_preferido}
                  onChange={(e) =>
                    updateField(
                      'regime_preferido',
                      e.target.value as TalentFormData['regime_preferido']
                    )
                  }
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#082175]"
                >
                  <option value="presencial">Presencial</option>
                  <option value="hibrido">Híbrido</option>
                  <option value="remoto">Remoto</option>
                </select>
              </div>
            </div>
          </section>

          {/* 4. Links & Anexos */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Links & Anexos</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">LinkedIn</label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/seuperfil"
                  value={form.linkedin}
                  onChange={(e) => updateField('linkedin', e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Currículo (PDF)
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50 transition-colors">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-700">
                      {uploading ? 'Enviando...' : 'Anexar Currículo'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      className="hidden"
                    />
                  </label>
                  {form.curriculoNome && (
                    <span className="flex items-center gap-1.5 text-sm text-green-600">
                      <FileCheck className="w-4 h-4 shrink-0" />
                      <span>Currículo anexado ({form.curriculoNome})</span>
                    </span>
                  )}
                </div>
              </div>
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
