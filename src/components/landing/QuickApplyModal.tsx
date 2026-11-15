import React, { useState, useEffect } from 'react';
import { CheckCircle2, FileCheck, Link2, Upload, UserPlus, X } from 'lucide-react';
import { Vacancy } from '../../types/database';
import { CandidateApplicationInput } from '../../context/CcbContext';
import { lookupCep } from '../../utils/geocoding';

interface QuickApplyModalProps {
  isOpen: boolean;
  applyingVacancy: Vacancy | null;
  openVacancies: Vacancy[];
  allVacancies: Vacancy[];
  initialVacancyId: string;
  onClose: () => void;
  onApply: (input: CandidateApplicationInput) => Promise<{ document_token: string }>;
  onOpenCandidatePortal: (token?: string) => void;
}

export const QuickApplyModal: React.FC<QuickApplyModalProps> = ({
  isOpen,
  applyingVacancy,
  openVacancies,
  allVacancies,
  initialVacancyId,
  onClose,
  onApply,
  onOpenCandidatePortal,
}) => {
  const [selectedVacancyId, setSelectedVacancyId] = useState(initialVacancyId);
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candLinkedin, setCandLinkedin] = useState('');
  const [candCep, setCandCep] = useState('');
  const [candEndereco, setCandEndereco] = useState('');
  const [candNumero, setCandNumero] = useState('');
  const [candBairro, setCandBairro] = useState('');
  const [candCidade, setCandCidade] = useState('');
  const [candEstado, setCandEstado] = useState('SP');
  const [candResumeName, setCandResumeName] = useState('');
  const [candResumeFile, setCandResumeFile] = useState<File | null>(null);
  const [candSubmitting, setCandSubmitting] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [candError, setCandError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedVacancyId(initialVacancyId);
      setCreatedToken(null);
      setCandError(null);
    }
  }, [isOpen, initialVacancyId]);

  if (!isOpen) return null;

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCandResumeFile(file);
    setCandResumeName(file.name);
    setCandError(null);
  };

  const handleCepChange = async (raw: string) => {
    setCandCep(raw);
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 8) {
      const addr = await lookupCep(digits);
      if (addr) {
        setCandEndereco(addr.logradouro || '');
        setCandBairro(addr.bairro || '');
        setCandCidade(addr.localidade || '');
        setCandEstado(addr.uf || 'SP');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCandError(null);

    if (!candName.trim() || !candEmail.trim() || !candPhone.trim()) {
      setCandError('Preencha nome completo, e-mail e telefone para concluir o cadastro.');
      return;
    }
    if (!candEndereco.trim() || !candCidade.trim()) {
      setCandError('Informe seu endereço e cidade para mapeamento de localização da vaga.');
      return;
    }
    if (!candResumeName.trim()) {
      setCandError('Anexe seu currículo (PDF, DOC ou DOCX) para concluir a candidatura.');
      return;
    }

    const targetVac =
      allVacancies.find((v) => v.id === selectedVacancyId) || openVacancies[0] || allVacancies[0];
    if (!targetVac) {
      setCandError('Nenhuma vaga disponível para vínculo no momento.');
      return;
    }

    const normalizedLinkedin = candLinkedin.trim()
      ? candLinkedin.trim().startsWith('http')
        ? candLinkedin.trim()
        : `https://${candLinkedin.trim()}`
      : '';

    setCandSubmitting(true);
    try {
      const created = await onApply({
        vacancyId: targetVac.id,
        tenantId: targetVac.tenant_id,
        fullName: candName.trim(),
        email: candEmail.trim(),
        phone: candPhone.trim(),
        resumeFileName: candResumeName.trim(),
        resumeFile: candResumeFile,
        linkedinUrl: normalizedLinkedin || undefined,
        cep: candCep.trim() || undefined,
        endereco: candEndereco.trim(),
        numero: candNumero.trim() || undefined,
        bairro: candBairro.trim() || undefined,
        cidade: candCidade.trim(),
        estado: candEstado.trim() || 'SP',
      });
      setCreatedToken(created.document_token);
      setCandName('');
      setCandEmail('');
      setCandPhone('');
      setCandLinkedin('');
      setCandCep('');
      setCandEndereco('');
      setCandNumero('');
      setCandBairro('');
      setCandCidade('');
      setCandResumeName('');
      setCandResumeFile(null);
    } catch (err) {
      setCandError(err instanceof Error ? err.message : 'Erro ao enviar candidatura.');
    } finally {
      setCandSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold text-[#9F8548] uppercase">
              {applyingVacancy ? 'Candidatura Direta' : 'Banco de Talentos CCB'}
            </p>
            <h3 className="text-lg font-bold text-[#03416A] mt-0.5">
              {applyingVacancy ? applyingVacancy.title : 'Cadastrar meu currículo'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdToken ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-bold mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Cadastro realizado com sucesso!</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-800">
                Seu currículo foi recebido e seu perfil já está no funil de seleção da empresa.
              </p>
              <p className="mt-2 font-mono text-[11px] bg-white px-2.5 py-1.5 rounded border border-emerald-200 break-all">
                {createdToken}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCandidatePortal(createdToken);
                }}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a]"
              >
                Enviar Documentos Agora
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-full border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!applyingVacancy && openVacancies.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#03416A] mb-1">
                  Vaga de interesse
                </label>
                <select
                  value={selectedVacancyId}
                  onChange={(e) => setSelectedVacancyId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                >
                  {openVacancies.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#03416A] mb-1">
                Nome completo *
              </label>
              <input
                type="text"
                required
                value={candName}
                onChange={(e) => setCandName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#03416A] mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={candEmail}
                onChange={(e) => setCandEmail(e.target.value)}
                placeholder="seuemail@exemplo.com.br"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#03416A] mb-1">
                WhatsApp / Telefone *
              </label>
              <input
                type="tel"
                required
                value={candPhone}
                onChange={(e) => setCandPhone(e.target.value)}
                placeholder="(11) 99999-0000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#03416A] mb-1">LinkedIn</label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={candLinkedin}
                  onChange={(e) => setCandLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/seuperfil"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#03416A] mb-1">CEP</label>
                <input
                  type="text"
                  value={candCep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-[#03416A] mb-1">
                  Endereço / Rua *
                </label>
                <input
                  type="text"
                  required
                  value={candEndereco}
                  onChange={(e) => setCandEndereco(e.target.value)}
                  placeholder="Rua / Av."
                  className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#03416A] mb-1">Nº</label>
                <input
                  type="text"
                  value={candNumero}
                  onChange={(e) => setCandNumero(e.target.value)}
                  placeholder="123"
                  className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#03416A] mb-1">Cidade *</label>
                <input
                  type="text"
                  required
                  value={candCidade}
                  onChange={(e) => setCandCidade(e.target.value)}
                  placeholder="Cidade"
                  className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#03416A] mb-1">UF *</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={candEstado}
                  onChange={(e) => setCandEstado(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#03416A] mb-1">
                Currículo (PDF, DOC ou DOCX) *
              </label>
              <label className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-100 text-slate-600 cursor-pointer">
                <div className="flex items-center gap-2 min-w-0">
                  {candResumeName ? (
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Upload className="w-4 h-4 text-[#082175] shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate">
                    {candResumeName || 'Clique para anexar seu currículo *'}
                  </span>
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {candError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 font-medium">
                {candError}
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={candSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a] disabled:opacity-60"
              >
                <UserPlus className="w-4 h-4" />
                <span>{candSubmitting ? 'Enviando...' : 'Concluir Cadastro'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
