import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Baby,
  BookOpen,
  Bus,
  CheckCircle2,
  Gift,
  HeartPulse,
  Info,
  Laptop,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wallet,
} from 'lucide-react';
import type {
  Company,
  Employee,
  EmployeeBenefitRecord,
  EmployeeBenefitType,
  Job,
  PayrollParameters,
} from '../../types/database';
import {
  BENEFIT_TYPE_CATALOG,
  buildDefaultCompanyPayrollParameters,
  calculateSingleBenefitMonthlyImpact,
  summarizeEmployeeBenefits,
} from '../../utils/payrollCalculator';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const BENEFIT_ICON_MAP: Record<EmployeeBenefitType, React.FC<{ className?: string }>> = {
  vale_transporte: Bus,
  vale_refeicao: Utensils,
  vale_alimentacao: Utensils,
  plano_saude: HeartPulse,
  plano_odontologico: HeartPulse,
  auxilio_creche: Baby,
  auxilio_home_office: Laptop,
  seguro_vida: ShieldCheck,
  previdencia_privada: PiggyBank,
  vale_cultura: Sparkles,
  auxilio_educacao: BookOpen,
  outros: Gift,
};

interface EmployeeBenefitsTabProps {
  employee: Employee;
  job?: Job;
  company?: Company | null;
  benefits: EmployeeBenefitRecord[];
  payrollParameters?: PayrollParameters;
}

function mapCompanyBenefitLabelToType(label: string): EmployeeBenefitType {
  const clean = label.toLowerCase();
  if (clean.includes('transporte') || clean.includes('vt')) return 'vale_transporte';
  if (clean.includes('refei')) return 'vale_refeicao';
  if (clean.includes('aliment') || clean.includes('cesta')) return 'vale_alimentacao';
  if (clean.includes('odonto')) return 'plano_odontologico';
  if (clean.includes('saúde') || clean.includes('saude') || clean.includes('médic')) {
    return 'plano_saude';
  }
  if (clean.includes('creche')) return 'auxilio_creche';
  if (clean.includes('home') || clean.includes('teletrabalho')) return 'auxilio_home_office';
  if (clean.includes('seguro')) return 'seguro_vida';
  if (clean.includes('previd')) return 'previdencia_privada';
  if (clean.includes('cultura')) return 'vale_cultura';
  if (clean.includes('educa')) return 'auxilio_educacao';
  return 'outros';
}

/**
 * Visão consolidada e somente-leitura dos benefícios do colaborador no Perfil ("Meus Benefícios").
 * Amarrada automaticamente aos parâmetros contratuais do colaborador (VT, VR/VA, Saúde),
 * dependentes e pacote corporativo da empresa, sem botões de inclusão ou importação manual.
 */
export const EmployeeBenefitsTab: React.FC<EmployeeBenefitsTabProps> = ({
  employee,
  job,
  company = null,
  benefits,
  payrollParameters,
}) => {
  const isPj = employee.contract_type === 'pj';
  const resolvedParams = useMemo(
    () => payrollParameters || buildDefaultCompanyPayrollParameters(employee.tenant_id),
    [payrollParameters, employee.tenant_id]
  );

  const baseSalary = Number(
    (isPj ? employee.pj_monthly_value ?? employee.salary_override : employee.salary_override) ??
      job?.base_salary ??
      0
  );

  const dependentsCount =
    (employee.dependents_list || []).length || Number(employee.dependents_count || 0);

  // Consolida benefícios persistidos com os benefícios derivados do contrato do funcionário e da empresa
  const effectiveBenefits = useMemo<EmployeeBenefitRecord[]>(() => {
    const persisted = [...benefits].filter((b) => b.employee_id === employee.id);
    const presentTypes = new Set<EmployeeBenefitType>(persisted.map((b) => b.benefit_type));
    const derived: EmployeeBenefitRecord[] = [...persisted];
    const hireDate = employee.hire_date || new Date().toISOString().slice(0, 10);

    if (!isPj) {
      if (employee.vt_opted_in && !presentTypes.has('vale_transporte')) {
        presentTypes.add('vale_transporte');
        derived.push({
          id: `contract-vt-${employee.id}`,
          tenant_id: employee.tenant_id,
          employee_id: employee.id,
          benefit_type: 'vale_transporte',
          provider_name: 'Mobilidade Urbana CLT',
          plan_name: 'Vale-Transporte (Optante no Contrato)',
          card_or_policy_number: null,
          monthly_employer_value: 0,
          employee_discount_mode: 'percent_salary',
          employee_discount_value: Number((resolvedParams.vt_discount_cap_rate * 100).toFixed(2)),
          coparticipation_value: 0,
          dependents_covered: 0,
          include_in_payroll: true,
          is_taxable: false,
          status: 'active',
          start_date: hireDate,
          end_date: null,
          notes: 'Vinculado ao contrato CLT do colaborador.',
          created_at: hireDate,
          updated_at: hireDate,
        });
      }

      const vrDiscount = Number(employee.vr_discount ?? resolvedParams.default_vr_discount ?? 0);
      if (vrDiscount > 0 && !presentTypes.has('vale_refeicao') && !presentTypes.has('vale_alimentacao')) {
        presentTypes.add('vale_refeicao');
        derived.push({
          id: `contract-vr-${employee.id}`,
          tenant_id: employee.tenant_id,
          employee_id: employee.id,
          benefit_type: 'vale_refeicao',
          provider_name: 'Programa de Alimentação do Trabalhador (PAT)',
          plan_name: 'Vale-Refeição / Alimentação',
          card_or_policy_number: null,
          monthly_employer_value: vrDiscount * 5,
          employee_discount_mode: 'fixed',
          employee_discount_value: vrDiscount,
          coparticipation_value: 0,
          dependents_covered: 0,
          include_in_payroll: true,
          is_taxable: false,
          status: 'active',
          start_date: hireDate,
          end_date: null,
          notes: 'Participação do colaborador configurada no contrato.',
          created_at: hireDate,
          updated_at: hireDate,
        });
      }

      const healthDiscount = Number(employee.health_plan_discount ?? 0);
      if (healthDiscount > 0 && !presentTypes.has('plano_saude')) {
        presentTypes.add('plano_saude');
        derived.push({
          id: `contract-health-${employee.id}`,
          tenant_id: employee.tenant_id,
          employee_id: employee.id,
          benefit_type: 'plano_saude',
          provider_name: 'Assistência Médica Corporativa',
          plan_name: 'Plano de Saúde Empresarial',
          card_or_policy_number: null,
          monthly_employer_value: healthDiscount,
          employee_discount_mode: 'fixed',
          employee_discount_value: healthDiscount,
          coparticipation_value: 0,
          dependents_covered: dependentsCount,
          include_in_payroll: true,
          is_taxable: false,
          status: 'active',
          start_date: hireDate,
          end_date: null,
          notes: 'Vinculado ao contrato e dependentes cadastrados.',
          created_at: hireDate,
          updated_at: hireDate,
        });
      }

      for (const rawLabel of company?.beneficios || []) {
        const mappedType = mapCompanyBenefitLabelToType(rawLabel);
        if (presentTypes.has(mappedType)) continue;
        presentTypes.add(mappedType);
        derived.push({
          id: `company-benefit-${mappedType}-${employee.id}`,
          tenant_id: employee.tenant_id,
          employee_id: employee.id,
          benefit_type: mappedType,
          provider_name: company?.name || 'Pacote Corporativo',
          plan_name: rawLabel,
          card_or_policy_number: null,
          monthly_employer_value: 0,
          employee_discount_mode: 'none',
          employee_discount_value: 0,
          coparticipation_value: 0,
          dependents_covered:
            mappedType === 'plano_saude' || mappedType === 'plano_odontologico'
              ? dependentsCount
              : 0,
          include_in_payroll: true,
          is_taxable: false,
          status: 'active',
          start_date: hireDate,
          end_date: null,
          notes: 'Concedido pela política de benefícios da empresa.',
          created_at: hireDate,
          updated_at: hireDate,
        });
      }
    }

    return derived;
  }, [benefits, employee, isPj, resolvedParams, company, dependentsCount]);

  const summary = useMemo(
    () => summarizeEmployeeBenefits(effectiveBenefits, baseSalary, resolvedParams),
    [effectiveBenefits, baseSalary, resolvedParams]
  );

  return (
    <div className="space-y-5">
      {/* Cabeçalho informativo (sem botões de inclusão ou importação na visão do funcionário) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#082175] flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#f5a90e]" />
            <span>Meus Benefícios & Remuneração Indireta</span>
          </h3>
          <div className="w-12 h-0.5 bg-[#f5a90e] mt-1.5 rounded-full" />
          <p className="text-xs text-slate-500 mt-1.5">
            Benefícios vinculados ao seu contrato e à política corporativa de{' '}
            <strong className="text-slate-700">{company?.name || 'sua empresa'}</strong>, com
            reflexo automático na Folha de Pagamento.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E0F4F7] text-[#03416A] text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#082175]" />
          <span>Sincronizado com Contrato & Folha</span>
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Benefícios Ativos
          </p>
          <p className="text-2xl font-extrabold text-[#082175] mt-1">{summary.activeCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isPj ? 'Regime PJ (B2B)' : 'Amarrados ao contrato CLT'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Subsídio Empresa / Mês
          </p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formatBRL(summary.totalEmployerCost)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Natureza não salarial (Art. 457/458 CLT)</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Desconto em Folha / Mês
          </p>
          <p className="text-2xl font-extrabold text-[#03416A] mt-1">
            {formatBRL(summary.totalEmployeeDiscount)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            VT {formatBRL(summary.vtDiscount)} · VR/VA {formatBRL(summary.vrVaDiscount)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Dependentes Vinculados
          </p>
          <p className="text-2xl font-extrabold text-[#082175] mt-1">{dependentsCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Elegíveis à cobertura assistencial e IRRF
          </p>
        </div>
      </div>

      {/* Conformidade Trabalhista */}
      {summary.complianceWarnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1.5 text-amber-900 text-xs">
          <p className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
            <span>Observações de Limite Legal (VT / PAT)</span>
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
            {summary.complianceWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-[#c8e8ed] bg-[#E0F4F7]/50 p-4 flex items-start gap-3 text-[#03416A] text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#082175]" />
          <p className="leading-relaxed">
            <strong>Enquadramento Legal:</strong> seus benefícios seguem os Arts. 457 §2º e 458
            §§2º/5º da CLT, Lei nº 7.418/1985 (Vale-Transporte limitado a 6% do salário-base ou ao
            custo efetivo) e Decreto nº 10.854/2021 (PAT limitado a 20% do benefício), sem integrar
            base de INSS ou FGTS.
          </p>
        </div>
      )}

      {/* Lista de Benefícios do Funcionário (Somente Consulta) */}
      {effectiveBenefits.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl py-12 px-4 text-center space-y-2">
          <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            Nenhum benefício ativo vinculado ao contrato no momento
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto flex items-center justify-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>
              A concessão e alteração de parâmetros de benefícios são realizadas pelo RH na gestão
              contratual.
            </span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {effectiveBenefits.map((benefit) => {
            const meta = BENEFIT_TYPE_CATALOG[benefit.benefit_type] || BENEFIT_TYPE_CATALOG.outros;
            const Icon = BENEFIT_ICON_MAP[benefit.benefit_type] || Gift;
            const impact = calculateSingleBenefitMonthlyImpact(benefit, baseSalary, resolvedParams);
            const isActive = benefit.status === 'active';

            return (
              <article
                key={benefit.id}
                className={`rounded-xl border p-5 bg-white shadow-xs flex flex-col justify-between gap-4 ${
                  isActive ? 'border-slate-200' : 'border-slate-200 opacity-75 bg-slate-50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#082175] text-[#f5a90e] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#082175]">{meta.label}</h4>
                        <p className="text-xs text-slate-600">
                          {[benefit.provider_name, benefit.plan_name].filter(Boolean).join(' · ') ||
                            'Benefício corporativo'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        benefit.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : benefit.status === 'suspended'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {benefit.status === 'active'
                        ? 'Ativo'
                        : benefit.status === 'suspended'
                        ? 'Suspenso'
                        : 'Cancelado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 bg-slate-50 rounded-xl p-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">
                        Custeio Empresa
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {impact.employerCost > 0
                          ? formatBRL(impact.employerCost)
                          : 'Conforme política'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">
                        Desconto em Folha
                      </span>
                      <span className="font-mono font-bold text-[#082175]">
                        {impact.totalEmployeeDeduction > 0
                          ? `-${formatBRL(impact.totalEmployeeDeduction)}`
                          : 'Isento (R$ 0,00)'}
                      </span>
                    </div>
                    {benefit.card_or_policy_number && (
                      <div className="col-span-2 text-[11px] text-slate-500 font-mono">
                        Cartão / Apólice: {benefit.card_or_policy_number}
                      </div>
                    )}
                    {benefit.dependents_covered > 0 && (
                      <div className="col-span-2 text-[11px] text-slate-600">
                        Dependentes cobertos: <strong>{benefit.dependents_covered}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {meta.nonSalaryNature && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                        Verba Não Salarial (Isento INSS/FGTS)
                      </span>
                    )}
                    {benefit.include_in_payroll && !isPj && (
                      <span className="px-2 py-0.5 rounded bg-[#E0F4F7] text-[#03416A] font-semibold border border-[#c8e8ed]">
                        Vinculado à Folha de Pagamento
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">{meta.legalBasis}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
