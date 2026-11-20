import React, { useEffect, useState } from 'react';
import type { Employee, Job } from '../../types/database';
import {
  ESOCIAL_TABELA_18_MOTIVOS_AFAST,
  ESOCIAL_TABELA_19_MOTIVOS_DESLIG,
} from '../../utils/esocial/catalogs';
import { ShieldCheck } from 'lucide-react';

export interface NonPeriodicIndividualInput {
  mode: 'S-2200' | 'S-2206' | 'S-2230' | 'S-2299';
  employeeId: string;
  altSalaryValue: number;
  altDate: string;
  altReason: string;
  afastMotivo: string;
  afastStart: string;
  afastEnd: string;
  desligMotivo: string;
  desligDate: string;
}

interface EsocialNonPeriodicTabProps {
  cltEmployees: Employee[];
  pjEmployeesCount: number;
  jobs: Job[];
  busyAction: string | null;
  onEmitIndividual: (input: NonPeriodicIndividualInput) => Promise<void>;
}

export const EsocialNonPeriodicTab: React.FC<EsocialNonPeriodicTabProps> = ({
  cltEmployees,
  pjEmployeesCount,
  jobs,
  busyAction,
  onEmitIndividual,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [altSalaryValue, setAltSalaryValue] = useState<string>('');
  const [altDate, setAltDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [altReason, setAltReason] = useState<string>('Reajuste salarial / enquadramento de cargo');
  const [afastMotivo, setAfastMotivo] = useState<string>('15');
  const [afastStart, setAfastStart] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [afastEnd, setAfastEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [desligMotivo, setDesligMotivo] = useState<string>('02');
  const [desligDate, setDesligDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!selectedEmpId && cltEmployees.length > 0) {
      setSelectedEmpId(cltEmployees[0].id);
      const job = jobs.find((j) => j.id === cltEmployees[0].job_id);
      setAltSalaryValue(String(cltEmployees[0].salary_override ?? job?.base_salary ?? 3000));
    }
  }, [cltEmployees, selectedEmpId, jobs]);

  const handleEmit = (mode: NonPeriodicIndividualInput['mode']) => {
    const emp = cltEmployees.find((e) => e.id === selectedEmpId);
    const job = jobs.find((j) => j.id === emp?.job_id);
    const fallbackSalary = Number(emp?.salary_override ?? job?.base_salary ?? 0);

    void onEmitIndividual({
      mode,
      employeeId: selectedEmpId,
      altSalaryValue: Number(altSalaryValue) || fallbackSalary,
      altDate,
      altReason,
      afastMotivo,
      afastStart,
      afastEnd,
      desligMotivo,
      desligDate,
    });
  };

  return (
    <div className="space-y-4">
      {pjEmployeesCount > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3 text-xs text-purple-950">
          <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              Nota Técnica de Conformidade (REGRA_COMPATIB_CATEG_EVENTO · Prestadores PJ B2B):
            </p>
            <p className="text-[11px] text-purple-800 mt-0.5">
              Esta empresa possui <strong>{pjEmployeesCount} prestador(es) PJ (NFS-e)</strong>.
              Pessoas Jurídicas contratadas via nota fiscal B2B não integram o evento{' '}
              <strong>S-2200 (Vínculo CLT)</strong>; suas retenções tributárias na fonte (IRRF,
              CSLL, PIS/COFINS) são escrituradas na{' '}
              <strong>EFD-Reinf (Série R-4000 / R-4020)</strong>. Caso haja contratação de autônomo
              pessoa física ou sócio com pró-labore, utiliza-se o evento{' '}
              <strong>S-2300 (TSVE · Categorias 701/723 da Tabela 01)</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#082175]">
              Emissor Individual de Eventos Não Periódicos (S-2200, S-2206, S-2230 e S-2299)
            </h2>
            <p className="text-[11px] text-slate-500">
              Selecione o colaborador CLT para gerar o XML oficial S-1.3 de Contratação, Reajuste
              Salarial/Cargo, Férias/Afastamento ou Rescisão.
            </p>
          </div>

          <select
            value={selectedEmpId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedEmpId(id);
              const emp = cltEmployees.find((item) => item.id === id);
              const job = jobs.find((j) => j.id === emp?.job_id);
              if (emp) {
                setAltSalaryValue(String(emp.salary_override ?? job?.base_salary ?? 0));
              }
            }}
            className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-[#082175]"
          >
            {cltEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} (CPF: {emp.cpf || 'Pendente'} · Adm: {emp.hire_date})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Card 1: S-2200 Admissão */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded bg-[#082175] text-white font-mono font-bold text-[10px]">
                S-2200 · Admissão CLT (Cat. 101 Tabela 01)
              </span>
              <h3 className="font-bold text-[#082175] text-sm">
                Cadastramento Inicial do Vínculo e Admissão
              </h3>
              <p className="text-[11px] text-slate-600">
                Envia os dados pessoais, endereço, dependentes IRRF (Tabela 07), data de admissão,
                CBO do cargo, salário contratual (<code className="font-mono">vrSalFx</code>) e
                jornada semanal de 44h para a CTPS Digital.
              </p>
            </div>
            <button
              type="button"
              disabled={!selectedEmpId || busyAction !== null}
              onClick={() => handleEmit('S-2200')}
              className="min-h-[40px] w-full rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              Gerar Evento S-2200 (Contratação CLT)
            </button>
          </div>

          {/* Card 2: S-2206 Alteração Salarial / Contratual */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded bg-[#082175] text-white font-mono font-bold text-[10px]">
                S-2206 · Alteração Salarial e Contratual
              </span>
              <h3 className="font-bold text-[#082175] text-sm">
                Reajuste de Salário (<code className="font-mono">vrSalFx</code>) ou Mudança de Cargo
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Novo Salário Base (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={altSalaryValue}
                  onChange={(e) => setAltSalaryValue(e.target.value)}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Data de Efeito (dtEf)
                </label>
                <input
                  type="date"
                  value={altDate}
                  onChange={(e) => setAltDate(e.target.value)}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Motivo / Instrumento (dscAlt)
              </label>
              <input
                type="text"
                value={altReason}
                onChange={(e) => setAltReason(e.target.value)}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
            <button
              type="button"
              disabled={!selectedEmpId || busyAction !== null}
              onClick={() => handleEmit('S-2206')}
              className="min-h-[40px] w-full rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              Gerar Evento S-2206 (Alteração Salarial)
            </button>
          </div>

          {/* Card 3: S-2230 Afastamento Temporário */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded bg-[#082175] text-white font-mono font-bold text-[10px]">
                S-2230 · Afastamento Temporário (Tabela 18)
              </span>
              <h3 className="font-bold text-[#082175] text-sm">
                Comunicação de Férias (Motivo 15) ou Licença Médica/Maternidade
              </h3>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Motivo do Afastamento (Tabela 18 do Anexo I)
              </label>
              <select
                value={afastMotivo}
                onChange={(e) => setAfastMotivo(e.target.value)}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                {ESOCIAL_TABELA_18_MOTIVOS_AFAST.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Início (dtIniAfast)
                </label>
                <input
                  type="date"
                  value={afastStart}
                  onChange={(e) => setAfastStart(e.target.value)}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Término (dtTermAfast)
                </label>
                <input
                  type="date"
                  value={afastEnd}
                  onChange={(e) => setAfastEnd(e.target.value)}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!selectedEmpId || busyAction !== null}
              onClick={() => handleEmit('S-2230')}
              className="min-h-[40px] w-full rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              Gerar Evento S-2230 (Férias / Afastamento)
            </button>
          </div>

          {/* Card 4: S-2299 Desligamento */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded bg-rose-700 text-white font-mono font-bold text-[10px]">
                S-2299 · Desligamento / Rescisão (Tabela 19)
              </span>
              <h3 className="font-bold text-[#082175] text-sm">
                Encerramento de Vínculo e Baixa na CTPS Digital
              </h3>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Motivo do Desligamento (Tabela 19 do Anexo I)
              </label>
              <select
                value={desligMotivo}
                onChange={(e) => setDesligMotivo(e.target.value)}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                {ESOCIAL_TABELA_19_MOTIVOS_DESLIG.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Data do Desligamento (dtDeslig)
              </label>
              <input
                type="date"
                value={desligDate}
                onChange={(e) => setDesligDate(e.target.value)}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
            <button
              type="button"
              disabled={!selectedEmpId || busyAction !== null}
              onClick={() => handleEmit('S-2299')}
              className="min-h-[40px] w-full rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              Gerar Evento S-2299 (Desligamento)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
