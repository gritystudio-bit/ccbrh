import * as XLSX from 'xlsx';
import { Company, Employee, Job, PayrollEntry } from '../../types/database';
import {
  decomposePayrollEntryToS1200Items,
  deriveMatricula,
} from '../esocial/esocialS13Engine';

const STATUS_LABELS: Record<PayrollEntry['status'], string> = {
  draft: 'Rascunho',
  closed: 'Fechada',
  paid: 'Paga',
};

const SENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  failed: 'Falhou',
};

const NFSE_STATUS_LABELS: Record<string, string> = {
  not_applicable: 'N/A',
  awaiting_issue: 'Aguardando NFS-e',
  issued: 'NFS-e Emitida',
  approved: 'Conferida',
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function exportPayrollToExcel(params: {
  company: Company | null;
  competence: string;
  entries: PayrollEntry[];
  employees: Employee[];
  jobs: Job[];
}): void {
  const { company, competence, entries, employees, jobs } = params;

  const cltEntries = entries.filter((e) => {
    const emp = employees.find((x) => x.id === e.employee_id);
    return (e.contract_type || emp?.contract_type || 'clt') !== 'pj';
  });

  const pjEntries = entries.filter((e) => {
    const emp = employees.find((x) => x.id === e.employee_id);
    return (e.contract_type || emp?.contract_type || 'clt') === 'pj';
  });

  const cltRows = cltEntries.map((entry) => {
    const emp = employees.find((e) => e.id === entry.employee_id);
    const job = jobs.find((j) => j.id === emp?.job_id);
    const adicionais =
      Number(entry.overtime_amount) +
      Number(entry.dsr_amount) +
      Number(entry.night_shift_amount) +
      Number(entry.insalubrity_amount) +
      Number(entry.hazard_amount) +
      Number(entry.bonuses);
    const vrOutros =
      Number(entry.vt_discount_amount) +
      Number(entry.absence_discount_amount) +
      Number(entry.vr_discount) +
      Number(entry.other_discounts);

    return {
      Regime: 'CLT (PF)',
      Colaborador: emp?.full_name || 'Colaborador',
      'E-mail': emp?.email || '',
      CPF: emp?.cpf || '',
      Cargo: job?.title || '',
      Departamento: job?.department || '',
      'Data Admissão': emp?.hire_date ? emp.hire_date.split('-').reverse().join('/') : '',
      'Dias Trab.': Number(entry.worked_days),
      'Salário Base (R$)': round2(Number(entry.base_salary)),
      'Adicionais / HE (R$)': round2(adicionais),
      'Salário Bruto (R$)': round2(Number(entry.gross_salary)),
      'INSS (R$)': round2(Number(entry.inss_amount)),
      'IRRF c/ L15.270 (R$)': round2(Number(entry.irrf_amount)),
      'VT / Faltas / Outros (R$)': round2(vrOutros),
      'Total Descontos (R$)': round2(Number(entry.total_discounts)),
      'Salário Líquido (R$)': round2(Number(entry.net_salary)),
      Situação: STATUS_LABELS[entry.status] || entry.status,
      'Envio Demonstrativo':
        SENT_STATUS_LABELS[entry.payslip_sent_status || 'pending'] || 'Pendente',
      'Data Envio': entry.payslip_sent_at
        ? new Date(entry.payslip_sent_at).toLocaleString('pt-BR')
        : '',
    };
  });

  if (cltRows.length > 0) {
    cltRows.push({
      Regime: 'CLT (PF)',
      Colaborador: 'TOTAIS CLT DA COMPETÊNCIA',
      'E-mail': '',
      CPF: '',
      Cargo: '',
      Departamento: `${cltEntries.length} colaborador(es)`,
      'Data Admissão': '',
      'Dias Trab.': cltEntries.reduce((s, r) => s + Number(r.worked_days), 0),
      'Salário Base (R$)': round2(cltEntries.reduce((s, r) => s + Number(r.base_salary), 0)),
      'Adicionais / HE (R$)': round2(
        cltEntries.reduce(
          (s, r) =>
            s +
            Number(r.overtime_amount) +
            Number(r.dsr_amount) +
            Number(r.night_shift_amount) +
            Number(r.insalubrity_amount) +
            Number(r.hazard_amount) +
            Number(r.bonuses),
          0
        )
      ),
      'Salário Bruto (R$)': round2(cltEntries.reduce((s, r) => s + Number(r.gross_salary), 0)),
      'INSS (R$)': round2(cltEntries.reduce((s, r) => s + Number(r.inss_amount), 0)),
      'IRRF c/ L15.270 (R$)': round2(cltEntries.reduce((s, r) => s + Number(r.irrf_amount), 0)),
      'VT / Faltas / Outros (R$)': round2(
        cltEntries.reduce(
          (s, r) =>
            s +
            Number(r.vt_discount_amount) +
            Number(r.absence_discount_amount) +
            Number(r.vr_discount) +
            Number(r.other_discounts),
          0
        )
      ),
      'Total Descontos (R$)': round2(
        cltEntries.reduce((s, r) => s + Number(r.total_discounts), 0)
      ),
      'Salário Líquido (R$)': round2(cltEntries.reduce((s, r) => s + Number(r.net_salary), 0)),
      Situação: '',
      'Envio Demonstrativo': '',
      'Data Envio': '',
    });
  }

  const pjRows = pjEntries.map((entry) => {
    const emp = employees.find((e) => e.id === entry.employee_id);
    const job = jobs.find((j) => j.id === emp?.job_id);
    return {
      Regime: 'PJ',
      Prestador: emp?.full_name || 'Prestador PJ',
      'Razão Social PJ': emp?.pj_company_name || '-',
      'CNPJ Prestador': emp?.pj_cnpj || '-',
      'E-mail': emp?.email || '',
      'Função / Escopo': job?.title || '',
      'Início Contrato': emp?.hire_date ? emp.hire_date.split('-').reverse().join('/') : '',
      'Dias Competência': Number(entry.worked_days),
      'Valor Contrato (R$)': round2(Number(entry.base_salary)),
      'Reembolsos / Bônus (R$)': round2(Number(entry.bonuses)),
      'Valor a Emitir NFS-e (R$)': round2(Number(entry.gross_salary)),
      'ISS Retido (R$)': round2(Number(entry.pj_iss_amount ?? 0)),
      'IRRF/PCC Retido (R$)': round2(Number(entry.pj_retention_amount ?? 0)),
      'Glosas / Outros (R$)': round2(Number(entry.other_discounts)),
      'Líquido a Transferir (R$)': round2(Number(entry.net_salary)),
      'Status NFS-e': NFSE_STATUS_LABELS[entry.nfse_status || 'awaiting_issue'] || 'Pendente',
      'Nº NFS-e': entry.nfse_number || '-',
      Situação: STATUS_LABELS[entry.status] || entry.status,
      'Envio Autorização':
        SENT_STATUS_LABELS[entry.payslip_sent_status || 'pending'] || 'Pendente',
    };
  });

  if (pjRows.length > 0) {
    pjRows.push({
      Regime: 'PJ',
      Prestador: 'TOTAIS PJ (NFS-e)',
      'Razão Social PJ': `${pjEntries.length} contrato(s)`,
      'CNPJ Prestador': '',
      'E-mail': '',
      'Função / Escopo': '',
      'Início Contrato': '',
      'Dias Competência': pjEntries.reduce((s, r) => s + Number(r.worked_days), 0),
      'Valor Contrato (R$)': round2(pjEntries.reduce((s, r) => s + Number(r.base_salary), 0)),
      'Reembolsos / Bônus (R$)': round2(pjEntries.reduce((s, r) => s + Number(r.bonuses), 0)),
      'Valor a Emitir NFS-e (R$)': round2(
        pjEntries.reduce((s, r) => s + Number(r.gross_salary), 0)
      ),
      'ISS Retido (R$)': round2(pjEntries.reduce((s, r) => s + Number(r.pj_iss_amount ?? 0), 0)),
      'IRRF/PCC Retido (R$)': round2(
        pjEntries.reduce((s, r) => s + Number(r.pj_retention_amount ?? 0), 0)
      ),
      'Glosas / Outros (R$)': round2(
        pjEntries.reduce((s, r) => s + Number(r.other_discounts), 0)
      ),
      'Líquido a Transferir (R$)': round2(
        pjEntries.reduce((s, r) => s + Number(r.net_salary), 0)
      ),
      'Status NFS-e': '',
      'Nº NFS-e': '',
      Situação: '',
      'Envio Autorização': '',
    });
  }

  const encargosRows = cltEntries.map((entry) => {
    const emp = employees.find((e) => e.id === entry.employee_id);
    const custoTotal =
      Number(entry.gross_salary) +
      Number(entry.fgts_amount) +
      Number(entry.inss_patronal_amount) +
      Number(entry.provision_13th) +
      Number(entry.provision_vacation);

    return {
      Colaborador: emp?.full_name || 'Colaborador',
      Competência: competence,
      'Salário Bruto (R$)': round2(Number(entry.gross_salary)),
      'FGTS 8% (R$)': round2(Number(entry.fgts_amount)),
      'INSS Patronal (R$)': round2(Number(entry.inss_patronal_amount)),
      'Provisão 13º (R$)': round2(Number(entry.provision_13th)),
      'Provisão Férias + 1/3 (R$)': round2(Number(entry.provision_vacation)),
      'Custo Total Empresa CLT (R$)': round2(custoTotal),
    };
  });

  const s1200RubricaRows = cltEntries.flatMap((entry) => {
    const emp = employees.find((e) => e.id === entry.employee_id);
    const matricula = emp ? deriveMatricula(emp) : 'CLT-000000';
    const ideDmDev = `DMDEV-${competence.replace('-', '')}-${matricula.slice(-6)}`;
    const items = decomposePayrollEntryToS1200Items(entry, 'TABRUB-CCB-S13', {
      includeZeroIrrf: true,
    });

    return items.map((item) => ({
      Competência: competence,
      'Matrícula eSocial': matricula,
      CPF: emp?.cpf || '',
      Colaborador: emp?.full_name || 'Colaborador',
      ideDmDev,
      'Cód. S-1010 (codRubr)': item.codRubr,
      'Tabela (ideTabRubr)': item.ideTabRubr,
      'Nat. Tab. 03 (natRubr)': item.natRubr,
      'Natureza da Rubrica': item.natRubrDesc || '',
      'Descrição da Rubrica (dscRubr)': item.dscRubr,
      'Tipo (tpRubr)': item.tpRubr === 1 ? '1 - Vencimento' : '2 - Desconto',
      Referência: item.refLabel || '1,00',
      'Incid. CP (codIncCP)': item.codIncCP || '00',
      'Incid. IRRF Tab. 21 (codIncIRRF)': item.codIncIRRF || '00',
      'Incid. FGTS (codIncFGTS)': item.codIncFGTS || '00',
      'Vencimentos (R$)': item.tpRubr === 1 ? round2(item.vrRubr) : 0,
      'Descontos (R$)': item.tpRubr === 2 ? round2(item.vrRubr) : 0,
    }));
  });

  const wb = XLSX.utils.book_new();
  if (cltRows.length > 0 || pjRows.length === 0) {
    const wsClt = XLSX.utils.json_to_sheet(cltRows);
    XLSX.utils.book_append_sheet(wb, wsClt, 'Folha CLT (PF)');
  }
  if (s1200RubricaRows.length > 0) {
    const wsRubricas = XLSX.utils.json_to_sheet(s1200RubricaRows);
    XLSX.utils.book_append_sheet(wb, wsRubricas, 'Rubricas eSocial S-1200');
  }
  if (pjRows.length > 0) {
    const wsPj = XLSX.utils.json_to_sheet(pjRows);
    XLSX.utils.book_append_sheet(wb, wsPj, 'Prestadores PJ (NFS-e)');
  }
  if (encargosRows.length > 0) {
    const wsEncargos = XLSX.utils.json_to_sheet(encargosRows);
    XLSX.utils.book_append_sheet(wb, wsEncargos, 'Encargos e Provisões CLT');
  }

  const companySlug = (company?.name || 'Empresa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  XLSX.writeFile(wb, `Folha_${companySlug}_${competence}.xlsx`);
}
