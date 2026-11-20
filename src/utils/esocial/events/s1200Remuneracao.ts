import type {
  Company,
  Employee,
  EsocialEmployerConfig,
  PayrollEntry,
} from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG, ESOCIAL_STANDARD_RUBRICAS_S1010 } from '../catalogs';
import { cleanDigits, deriveMatricula, generateEsocialEventId, sanitizeText } from '../helpers';
import {
  ESOCIAL_S13_NAMESPACE_VERSION,
  type BuiltEsocialEventDraft,
  type EsocialS1200ItemRemun,
} from '../types';

const round2 = (val: number): number => Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;

/**
 * Decompõe um PayrollEntry em itens de remuneração (itensRemun) do evento S-1200
 * conforme Tabela 03 (Natureza das Rubricas) e Tabela 21 (Incidência IRRF).
 */
export function decomposePayrollEntryToS1200Items(
  entry: PayrollEntry,
  ideTabRubr = 'TABRUB01',
  options?: { includeZeroIrrf?: boolean }
): EsocialS1200ItemRemun[] {
  const items: EsocialS1200ItemRemun[] = [];
  const pushItem = (codRubr: string, vr: number, refLabel: string, allowZero = false) => {
    const amount = round2(vr);
    if (amount <= 0 && !allowZero) return;
    const meta = ESOCIAL_STANDARD_RUBRICAS_S1010.find((r) => r.codRubr === codRubr);
    items.push({
      codRubr,
      ideTabRubr,
      dscRubr: meta?.dscRubr || codRubr,
      natRubr: meta?.natRubr || '1000',
      natRubrDesc: meta?.natRubrDesc || 'Rubrica Folha',
      tpRubr: (meta?.tpRubr === 2 ? 2 : 1) as 1 | 2,
      codIncCP: meta?.codIncCP || '00',
      codIncIRRF: meta?.codIncIRRF || '9',
      codIncFGTS: meta?.codIncFGTS || '00',
      refLabel,
      vrRubr: amount,
      indApurIR: 0,
    });
  };

  const workedDays = Number(entry.worked_days ?? 30);
  const proportionalBaseSalary = round2((Number(entry.base_salary || 0) / 30) * workedDays);

  // Vencimentos (tpRubr = 1)
  pushItem('RUB-1000', proportionalBaseSalary, `${workedDays}d`);
  pushItem(
    'RUB-1003',
    Number(entry.overtime_amount || 0),
    `${Number(entry.overtime_50_hours || 0) + Number(entry.overtime_100_hours || 0)}h`
  );
  pushItem('RUB-1012', Number(entry.dsr_amount || 0), 'Reflexo');
  pushItem('RUB-1205', Number(entry.night_shift_amount || 0), `${Number(entry.night_hours || 0)}h`);
  pushItem(
    'RUB-1202',
    Number(entry.insalubrity_amount || 0),
    `${Number(entry.insalubrity_rate || 0)}%`
  );
  pushItem('RUB-1203', Number(entry.hazard_amount || 0), '30%');
  pushItem('RUB-1211', Number(entry.bonuses || 0), 'Mensal');
  pushItem(
    'RUB-1016',
    Number(entry.vacation_amount || 0),
    `${Number(entry.vacation_days || 0)}d + 1/3`
  );
  pushItem(
    'RUB-1023',
    Number(entry.vacation_abono_amount || 0),
    `${Number(entry.vacation_sold_days || 0)}d Isento`
  );
  pushItem(
    'RUB-1024',
    Number(entry.vacation_double_amount || 0),
    `${Number(entry.vacation_doubled_days || 0)}d Art.137`
  );
  pushItem(
    'RUB-1050',
    Number(entry.leave_paid_amount || 0),
    `${Number(entry.leave_days || 0)}d`
  );

  if (Number(entry.thirteenth_amount || 0) > 0) {
    if (entry.thirteenth_mode === 'first_installment') {
      pushItem('RUB-5504', Number(entry.thirteenth_amount), '1ª Parc. 50%');
    } else {
      pushItem('RUB-5001', Number(entry.thirteenth_amount), 'Integral/2ª Parc.');
    }
  }

  // Descontos (tpRubr = 2)
  pushItem(
    'RUB-9201',
    Number(entry.inss_amount || 0) + Number(entry.thirteenth_inss_amount || 0),
    'EC 103/19'
  );

  const totalIrrf = Number(entry.irrf_amount || 0) + Number(entry.thirteenth_irrf_amount || 0);
  pushItem(
    'RUB-9203',
    totalIrrf,
    totalIrrf === 0 ? 'Isento L15.270' : 'CR 056107',
    Boolean(options?.includeZeroIrrf)
  );

  pushItem(
    'RUB-9207',
    Number(entry.absence_discount_amount || 0),
    `${Number(entry.absence_days || 0)}d`
  );
  pushItem('RUB-9216', Number(entry.vt_discount_amount || 0), 'Teto 6%');
  pushItem('RUB-9241', Number(entry.vr_discount || 0), 'PAT');
  pushItem('RUB-9219', Number(entry.other_discounts || 0), 'ANS/Coletivo');

  return items;
}

/**
 * Evento S-1200 — Remuneração de Trabalhador vinculado ao RGPS (Folha Mensal)
 * Regras Anexo II: REGRA_DEMONSTRATIVO, REGRA_CONTROLE_DUPLICIDADE
 * Gera também os totalizadores de retorno S-5001 (INSS) e S-5003 (FGTS por Trabalhador)
 */
export function buildEsocialS1200Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  employee: Employee;
  entry: PayrollEntry;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, employee, entry, sequence } = params;
  const cnpjFull = cleanDigits(company?.cnpj).padEnd(14, '0').slice(0, 14);
  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cnpjFull.slice(0, 8)
  ).padEnd(8, '0');
  const cpfTrab = cleanDigits(employee.cpf, '00000000000').padEnd(11, '0').slice(0, 11);
  const matricula = deriveMatricula(employee);
  const ideDmDev = `DM-${entry.competence.replace('-', '')}-${matricula}`;

  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const items = decomposePayrollEntryToS1200Items(entry, config.ide_tab_rubr);
  const totalVencimentos = items
    .filter((i) => i.tpRubr === 1)
    .reduce((acc, i) => acc + i.vrRubr, 0);
  const totalDescontos = items
    .filter((i) => i.tpRubr === 2)
    .reduce((acc, i) => acc + i.vrRubr, 0);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (totalVencimentos < totalDescontos) {
    errors.push(
      'REGRA_DEMONSTRATIVO (Item 1): O somatório dos vencimentos deve ser maior ou igual ao somatório dos descontos no demonstrativo dmDev.'
    );
  }
  if (items.length === 0) {
    errors.push('REGRA_DEMONSTRATIVO: O evento S-1200 exige pelo menos uma rubrica em itensRemun.');
  }
  if (cleanDigits(employee.cpf).length !== 11) {
    warnings.push('CPF do trabalhador ausente ou incompleto no cadastro.');
  }

  const itensRemunXml = items
    .map(
      (item) => `            <itensRemun>
              <codRubr>${item.codRubr}</codRubr>
              <ideTabRubr>${item.ideTabRubr}</ideTabRubr>
              <vrRubr>${item.vrRubr.toFixed(2)}</vrRubr>
              <indApurIR>${item.indApurIR}</indApurIR>
            </itensRemun>`
    )
    .join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtRemun/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtRemun Id="${eventUid}">
    <ideEvento>
      <indRetif>1</indRetif>
      <indApuracao>1</indApuracao>
      <perApur>${entry.competence}</perApur>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot}</nrInsc>
    </ideEmpregador>
    <ideTrabalhador>
      <cpfTrab>${cpfTrab}</cpfTrab>
    </ideTrabalhador>
    <dmDev>
      <ideDmDev>${ideDmDev}</ideDmDev>
      <codCateg>101</codCateg>
      <infoPerApur>
        <ideEstabLot>
          <tpInsc>1</tpInsc>
          <nrInsc>${cnpjFull}</nrInsc>
          <codLotacao>${config.cod_lotacao}</codLotacao>
          <remunPerApur>
            <matricula>${matricula}</matricula>
${itensRemunXml}
          </remunPerApur>
        </ideEstabLot>
      </infoPerApur>
    </dmDev>
  </evtRemun>
</eSocial>`;

  const baseCalculoCp = Math.max(
    0,
    Number(entry.gross_salary || 0) -
      Number(entry.vacation_abono_amount || 0) -
      Number(entry.vacation_double_amount || 0) -
      Number(entry.absence_discount_amount || 0)
  );

  return {
    eventCode: 'S-1200',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-1200'].name} (${employee.full_name})`,
    eventCategory: 'periodicos',
    eventUid,
    competence: entry.competence,
    employeeId: employee.id,
    payrollEntryId: entry.id,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: warnings,
    payloadSummary: {
      trabalhador: employee.full_name,
      cpfTrab,
      matricula,
      perApur: entry.competence,
      ideDmDev,
      qtdRubricas: items.length,
      totalVencimentos,
      totalDescontos,
      inssSegurado: Number(entry.inss_amount || 0),
      fgtsMensal: Number(entry.fgts_amount || 0),
    },
    xmlContent,
    returnTotals: {
      s5001_base_cp: baseCalculoCp,
      s5001_inss_segurado: Number(entry.inss_amount || 0),
      s5003_base_fgts: baseCalculoCp,
      s5003_fgts_mensal: Number(entry.fgts_amount || 0),
    },
  };
}
