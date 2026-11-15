import React, { useState, useEffect } from 'react';
import {
  CalendarHeart,
  FileText,
  Loader2,
  Palmtree,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import { PayrollParameters } from '../../types/database';
import {
  buildDefaultCompanyPayrollParameters,
  getPayrollRules,
} from '../../utils/payrollCalculator';

interface PayrollSettingsModalProps {
  isOpen: boolean;
  tenantId: string;
  companyName: string;
  currentParameters: PayrollParameters;
  onClose: () => void;
  onSave: (params: Omit<PayrollParameters, 'id' | 'tenant_id' | 'updated_at'>) => Promise<void>;
}

export const PayrollSettingsModal: React.FC<PayrollSettingsModalProps> = ({
  isOpen,
  tenantId,
  companyName,
  currentParameters,
  onClose,
  onSave,
}) => {
  const rules = getPayrollRules();
  const [tab, setTab] = useState<'pf_taxes' | 'pf_vacations_leaves' | 'pj'>('pf_taxes');
  const [saving, setSaving] = useState(false);

  // Aba 1: Encargos & IRRF (PF / CLT)
  const [minimumWage, setMinimumWage] = useState(currentParameters.minimum_wage);
  const [patronalRate, setPatronalRate] = useState(currentParameters.patronal_inss_rate);
  const [fgtsRate, setFgtsRate] = useState(currentParameters.fgts_rate);
  const [vtCapRate, setVtCapRate] = useState(currentParameters.vt_discount_cap_rate);
  const [defaultVtOptedIn, setDefaultVtOptedIn] = useState(currentParameters.default_vt_opted_in);
  const [defaultVrDiscount, setDefaultVrDiscount] = useState(currentParameters.default_vr_discount);
  const [applyLei15270, setApplyLei15270] = useState(currentParameters.apply_lei_15270);

  // Aba 2: Férias, Licenças & 13º (CLT + Reforma Trabalhista)
  const [vacationThirdRate, setVacationThirdRate] = useState(
    currentParameters.vacation_constitutional_third_rate ??
      rules.vacation_rules.constitutional_third_rate
  );
  const [vacationAbonoMaxDays, setVacationAbonoMaxDays] = useState(
    currentParameters.vacation_abono_max_days ?? rules.vacation_rules.abono_pecuniario_max_days
  );
  const [vacationMinFirstSplit, setVacationMinFirstSplit] = useState(
    currentParameters.vacation_min_first_split_days ?? rules.vacation_rules.min_first_split_days
  );
  const [vacationMinOtherSplit, setVacationMinOtherSplit] = useState(
    currentParameters.vacation_min_other_split_days ?? rules.vacation_rules.min_other_split_days
  );
  const [medicalCompanyPaidDays, setMedicalCompanyPaidDays] = useState(
    currentParameters.medical_leave_company_paid_days ??
      rules.leave_rules.medical_leave_company_paid_days
  );
  const [maternityLeaveDays, setMaternityLeaveDays] = useState(
    currentParameters.maternity_leave_days ?? rules.leave_rules.maternity_leave_days
  );
  const [paternityLeaveDays, setPaternityLeaveDays] = useState(
    currentParameters.paternity_leave_days ?? rules.leave_rules.paternity_leave_days
  );
  const [marriageLeaveDays, setMarriageLeaveDays] = useState(
    currentParameters.marriage_leave_days ?? rules.leave_rules.marriage_leave_days
  );
  const [bereavementLeaveDays, setBereavementLeaveDays] = useState(
    currentParameters.bereavement_leave_days ?? rules.leave_rules.bereavement_leave_days
  );
  const [accidentKeepFgts, setAccidentKeepFgts] = useState(
    currentParameters.accident_leave_keep_fgts ?? rules.leave_rules.accident_leave_keep_fgts
  );
  const [maternityOffsetInss, setMaternityOffsetInss] = useState(
    currentParameters.maternity_offset_inss_patronal ??
      rules.leave_rules.maternity_offset_inss_patronal
  );

  // Aba 3: Contratos PJ & NFS-e
  const [pjIssRate, setPjIssRate] = useState(currentParameters.pj_default_iss_rate);
  const [pjIrrfRate, setPjIrrfRate] = useState(currentParameters.pj_default_irrf_rate);
  const [pjPccRate, setPjPccRate] = useState(currentParameters.pj_default_pcc_rate);
  const [pjRequireNfse, setPjRequireNfse] = useState(currentParameters.pj_require_nfse);
  const [pjNfseDueDay, setPjNfseDueDay] = useState(currentParameters.pj_nfse_due_day);
  const [pjAutoProportional, setPjAutoProportional] = useState(
    currentParameters.pj_auto_proportional_dates
  );

  useEffect(() => {
    if (!isOpen) return;
    setMinimumWage(currentParameters.minimum_wage);
    setPatronalRate(currentParameters.patronal_inss_rate);
    setFgtsRate(currentParameters.fgts_rate);
    setVtCapRate(currentParameters.vt_discount_cap_rate);
    setDefaultVtOptedIn(currentParameters.default_vt_opted_in);
    setDefaultVrDiscount(currentParameters.default_vr_discount);
    setApplyLei15270(currentParameters.apply_lei_15270);

    setVacationThirdRate(
      currentParameters.vacation_constitutional_third_rate ??
        rules.vacation_rules.constitutional_third_rate
    );
    setVacationAbonoMaxDays(
      currentParameters.vacation_abono_max_days ?? rules.vacation_rules.abono_pecuniario_max_days
    );
    setVacationMinFirstSplit(
      currentParameters.vacation_min_first_split_days ?? rules.vacation_rules.min_first_split_days
    );
    setVacationMinOtherSplit(
      currentParameters.vacation_min_other_split_days ?? rules.vacation_rules.min_other_split_days
    );
    setMedicalCompanyPaidDays(
      currentParameters.medical_leave_company_paid_days ??
        rules.leave_rules.medical_leave_company_paid_days
    );
    setMaternityLeaveDays(
      currentParameters.maternity_leave_days ?? rules.leave_rules.maternity_leave_days
    );
    setPaternityLeaveDays(
      currentParameters.paternity_leave_days ?? rules.leave_rules.paternity_leave_days
    );
    setMarriageLeaveDays(
      currentParameters.marriage_leave_days ?? rules.leave_rules.marriage_leave_days
    );
    setBereavementLeaveDays(
      currentParameters.bereavement_leave_days ?? rules.leave_rules.bereavement_leave_days
    );
    setAccidentKeepFgts(
      currentParameters.accident_leave_keep_fgts ?? rules.leave_rules.accident_leave_keep_fgts
    );
    setMaternityOffsetInss(
      currentParameters.maternity_offset_inss_patronal ??
        rules.leave_rules.maternity_offset_inss_patronal
    );

    setPjIssRate(currentParameters.pj_default_iss_rate);
    setPjIrrfRate(currentParameters.pj_default_irrf_rate);
    setPjPccRate(currentParameters.pj_default_pcc_rate);
    setPjRequireNfse(currentParameters.pj_require_nfse);
    setPjNfseDueDay(currentParameters.pj_nfse_due_day);
    setPjAutoProportional(currentParameters.pj_auto_proportional_dates);
  }, [isOpen, currentParameters, rules]);

  if (!isOpen) return null;

  const handleResetOfficialDefaults = () => {
    const def = buildDefaultCompanyPayrollParameters(tenantId);
    setMinimumWage(def.minimum_wage);
    setPatronalRate(def.patronal_inss_rate);
    setFgtsRate(def.fgts_rate);
    setVtCapRate(def.vt_discount_cap_rate);
    setDefaultVtOptedIn(def.default_vt_opted_in);
    setDefaultVrDiscount(def.default_vr_discount);
    setApplyLei15270(def.apply_lei_15270);

    setVacationThirdRate(def.vacation_constitutional_third_rate ?? 0.3333);
    setVacationAbonoMaxDays(def.vacation_abono_max_days ?? 10);
    setVacationMinFirstSplit(def.vacation_min_first_split_days ?? 14);
    setVacationMinOtherSplit(def.vacation_min_other_split_days ?? 5);
    setMedicalCompanyPaidDays(def.medical_leave_company_paid_days ?? 15);
    setMaternityLeaveDays(def.maternity_leave_days ?? 120);
    setPaternityLeaveDays(def.paternity_leave_days ?? 5);
    setMarriageLeaveDays(def.marriage_leave_days ?? 3);
    setBereavementLeaveDays(def.bereavement_leave_days ?? 2);
    setAccidentKeepFgts(def.accident_leave_keep_fgts ?? true);
    setMaternityOffsetInss(def.maternity_offset_inss_patronal ?? true);

    setPjIssRate(def.pj_default_iss_rate);
    setPjIrrfRate(def.pj_default_irrf_rate);
    setPjPccRate(def.pj_default_pcc_rate);
    setPjRequireNfse(def.pj_require_nfse);
    setPjNfseDueDay(def.pj_nfse_due_day);
    setPjAutoProportional(def.pj_auto_proportional_dates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        minimum_wage: minimumWage,
        patronal_inss_rate: patronalRate,
        fgts_rate: fgtsRate,
        vt_discount_cap_rate: vtCapRate,
        default_vt_opted_in: defaultVtOptedIn,
        default_vr_discount: defaultVrDiscount,
        apply_lei_15270: applyLei15270,
        vacation_constitutional_third_rate: vacationThirdRate,
        vacation_abono_max_days: vacationAbonoMaxDays,
        vacation_min_first_split_days: vacationMinFirstSplit,
        vacation_min_other_split_days: vacationMinOtherSplit,
        medical_leave_company_paid_days: medicalCompanyPaidDays,
        maternity_leave_days: maternityLeaveDays,
        paternity_leave_days: paternityLeaveDays,
        marriage_leave_days: marriageLeaveDays,
        bereavement_leave_days: bereavementLeaveDays,
        accident_leave_keep_fgts: accidentKeepFgts,
        maternity_offset_inss_patronal: maternityOffsetInss,
        pj_default_iss_rate: pjIssRate,
        pj_default_irrf_rate: pjIrrfRate,
        pj_default_pcc_rate: pjPccRate,
        pj_require_nfse: pjRequireNfse,
        pj_nfse_due_day: pjNfseDueDay,
        pj_auto_proportional_dates: pjAutoProportional,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9F8548]">
              Parametrização Trabalhista & Fiscal · Base Legal CCB RH
            </p>
            <h3 className="text-lg font-bold text-[#082175] mt-0.5 flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              <span>Parâmetros de Cálculo PF (CLT) e PJ</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Regras globais aplicadas automaticamente à folha de{' '}
              <strong className="text-slate-700">{companyName}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação em 3 Abas Claras */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-4 bg-slate-100 p-1.5 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('pf_taxes')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-all cursor-pointer ${
              tab === 'pf_taxes'
                ? 'bg-white text-[#082175] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>1. Encargos & IRRF (PF)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('pf_vacations_leaves')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-all cursor-pointer ${
              tab === 'pf_vacations_leaves'
                ? 'bg-white text-[#082175] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palmtree className="w-4 h-4 text-amber-600 shrink-0" />
            <span>2. Férias, Licenças & 13º</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('pj')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-all cursor-pointer ${
              tab === 'pj'
                ? 'bg-white text-purple-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600 shrink-0" />
            <span>3. Contratos PJ & NFS-e</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mt-5 text-xs">
          {tab === 'pf_taxes' && (
            <div className="space-y-4">
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs">
                    Piso Salarial, Encargos Patronais e Benefícios
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-500">
                    CLT · Decreto-Lei nº 5.452/1943
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Salário Mínimo Vigente (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={minimumWage}
                      onChange={(e) => setMinimumWage(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Regime Tributário (INSS Patronal)
                    </label>
                    <select
                      value={patronalRate}
                      onChange={(e) => setPatronalRate(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    >
                      <option value={0.2}>Lucro Presumido / Real (20%)</option>
                      <option value={0}>Simples Nacional Anexos I, II, III e V (0%)</option>
                      <option value={0.225}>Personalizado c/ RAT/FAP (22,5%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Alíquota FGTS Mensal (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={20}
                      value={Number((fgtsRate * 100).toFixed(2))}
                      onChange={(e) => setFgtsRate((Number(e.target.value) || 0) / 100)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Teto Legal Vale-Transporte (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={10}
                      value={Number((vtCapRate * 100).toFixed(2))}
                      onChange={(e) => setVtCapRate((Number(e.target.value) || 0) / 100)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Desconto Padrão VR/VA (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={defaultVrDiscount}
                      onChange={(e) => setDefaultVrDiscount(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={defaultVtOptedIn}
                        onChange={(e) => setDefaultVtOptedIn(e.target.checked)}
                      />
                      <span>Optante por Vale-Transporte (padrão)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <label className="flex items-center gap-2 font-bold text-[#082175] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyLei15270}
                    onChange={(e) => setApplyLei15270(e.target.checked)}
                  />
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Aplicar Isenção de IRRF até R$ 5.000,00 — Lei nº 15.270/2025 (Folha e 13º)
                  </span>
                </label>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  <strong>Regra ativa (Arts. 2º e 3º da Lei 15.270/2025):</strong> rendimentos
                  tributáveis mensais e de 13º salário até{' '}
                  <strong>
                    R${' '}
                    {rules.irrf_lei_15270_reduction.full_exemption_limit.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>{' '}
                  são 100% isentos (redução de até R${' '}
                  {rules.irrf_lei_15270_reduction.max_reduction_amount
                    .toFixed(2)
                    .replace('.', ',')}
                  ). Entre R$ 5.000,01 e R${' '}
                  {rules.irrf_lei_15270_reduction.transition_upper_limit.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                  , aplica redução linear decrescente.
                </p>
              </div>
            </div>
          )}

          {tab === 'pf_vacations_leaves' && (
            <div className="space-y-4">
              {/* Bloco 1: Férias & Abono Pecuniário */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Palmtree className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-slate-900 text-xs">
                      Férias, Terço Constitucional & Abono Pecuniário
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Arts. 129 a 145 CLT + Lei 13.467/2017
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Terço Constitucional (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      value={Number((vacationThirdRate * 100).toFixed(2))}
                      onChange={(e) => setVacationThirdRate((Number(e.target.value) || 0) / 100)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Padrão legal: 33,33% (1/3)</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Máx. Venda (Abono)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={vacationAbonoMaxDays}
                      onChange={(e) => setVacationAbonoMaxDays(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Art. 143 CLT: até 10 dias</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mín. 1º Período (dias)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={30}
                      value={vacationMinFirstSplit}
                      onChange={(e) => setVacationMinFirstSplit(Number(e.target.value) || 14)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Art. 134 §1º: mín. 14 dias</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mín. Demais Períodos
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={15}
                      value={vacationMinOtherSplit}
                      onChange={(e) => setVacationMinOtherSplit(Number(e.target.value) || 5)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Art. 134 §1º: mín. 5 dias</span>
                  </div>
                </div>

                {/* Escala de Faltas x Direito de Férias (Art. 130 CLT) */}
                <div className="bg-white/90 border border-amber-200/70 rounded-lg p-2.5">
                  <p className="text-[11px] font-bold text-slate-700 mb-1.5">
                    Escala Automática de Redução de Férias por Faltas Injustificadas (Art. 130 CLT):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px] text-center">
                    <div className="bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                      <span className="block font-bold text-emerald-900">Até 5 faltas</span>
                      <span className="text-emerald-700">30 dias de férias</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                      <span className="block font-bold text-slate-800">6 a 14 faltas</span>
                      <span className="text-slate-600">24 dias de férias</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                      <span className="block font-bold text-slate-800">15 a 23 faltas</span>
                      <span className="text-slate-600">18 dias de férias</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      <span className="block font-bold text-amber-900">24 a 32 faltas</span>
                      <span className="text-amber-700">12 dias de férias</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded px-2 py-1">
                      <span className="block font-bold text-rose-900">&gt; 32 faltas</span>
                      <span className="text-rose-700">Perde o direito</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Licenças e Afastamentos Legais */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-[#082175]" />
                    <h4 className="font-bold text-slate-900 text-xs">
                      Licenças Remuneradas e Afastamentos Previdenciários (INSS)
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full">
                    Arts. 392, 473 e 476 CLT + Lei 8.213/1991
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Doença/Acidente (Empresa)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={medicalCompanyPaidDays}
                      onChange={(e) => setMedicalCompanyPaidDays(Number(e.target.value) || 15)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Primeiros 15 dias</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Maternidade (dias)
                    </label>
                    <input
                      type="number"
                      min={120}
                      max={180}
                      value={maternityLeaveDays}
                      onChange={(e) => setMaternityLeaveDays(Number(e.target.value) || 120)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Art. 392 CLT (120d)</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Paternidade (dias)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={paternityLeaveDays}
                      onChange={(e) => setPaternityLeaveDays(Number(e.target.value) || 5)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Art. 473 III (5d)</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Casamento / Gala
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={marriageLeaveDays}
                      onChange={(e) => setMarriageLeaveDays(Number(e.target.value) || 3)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Art. 473 II (3d)</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nojo / Falecimento
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={bereavementLeaveDays}
                      onChange={(e) => setBereavementLeaveDays(Number(e.target.value) || 2)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Art. 473 I (2d)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <label className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accidentKeepFgts}
                      onChange={(e) => setAccidentKeepFgts(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        Manter FGTS (8%) em Acidente de Trabalho
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Art. 15 §5º Lei 8.036/90: recolhe FGTS mesmo após o 15º dia de afastamento.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maternityOffsetInss}
                      onChange={(e) => setMaternityOffsetInss(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        Compensar Salário-Maternidade no INSS Patronal
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Art. 72 §1º Lei 8.213/91: abate o salário-maternidade da guia previdenciária.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {tab === 'pj' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-purple-50/40 border border-purple-200/80 rounded-xl p-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ISS Retido na Fonte Padrão (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={Number((pjIssRate * 100).toFixed(2))}
                    onChange={(e) => setPjIssRate((Number(e.target.value) || 0) / 100)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    IRRF PJ Retido na Fonte (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={15}
                    value={Number((pjIrrfRate * 100).toFixed(2))}
                    onChange={(e) => setPjIrrfRate((Number(e.target.value) || 0) / 100)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    PCC / CSRF Retido (PIS/COFINS/CSLL %)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min={0}
                    max={15}
                    value={Number((pjPccRate * 100).toFixed(2))}
                    onChange={(e) => setPjPccRate((Number(e.target.value) || 0) / 100)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dia Limite Padrão Recebimento NFS-e
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={pjNfseDueDay}
                    onChange={(e) =>
                      setPjNfseDueDay(Math.min(28, Math.max(1, Number(e.target.value) || 5)))
                    }
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2.5 p-4 rounded-xl bg-purple-50 border border-purple-200">
                <label className="flex items-center gap-2 font-semibold text-purple-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pjRequireNfse}
                    onChange={(e) => setPjRequireNfse(e.target.checked)}
                  />
                  <span>Exigir controle de emissão de NFS-e nos lançamentos PJ</span>
                </label>
                <label className="flex items-center gap-2 font-semibold text-purple-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pjAutoProportional}
                    onChange={(e) => setPjAutoProportional(e.target.checked)}
                  />
                  <span>
                    Calcular valor proporcional por data de início/encerramento do contrato PJ
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetOfficialDefaults}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão Legal</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Salvar Parâmetros Globais</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
