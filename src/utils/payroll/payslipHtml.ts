import { Company, Employee, Job, PayrollEntry } from '../../types/database';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPjAuthorizationHtml(params: {
  company: Company | null;
  entry: PayrollEntry;
  employee?: Employee;
  job?: Job;
}): string {
  const { company, entry, employee, job } = params;
  const startDateFmt = employee?.hire_date
    ? employee.hire_date.split('-').reverse().join('/')
    : '-';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Demonstrativo PJ / NFS-e - ${escapeHtml(employee?.full_name || '')} (${escapeHtml(entry.competence)})</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 12px; background: #fff; }
    .sheet { border: 1.5px solid #082175; border-radius: 8px; padding: 20px; max-width: 720px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; }
    .kicker { color: #03416A; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    .company-name { color: #082175; font-size: 16px; font-weight: 700; margin: 3px 0; }
    .muted { color: #64748b; font-size: 11px; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; font-size: 11px; }
    .highlight-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 6px 4px; }
    td { padding: 6px 4px; border-bottom: 1px solid #f1f5f9; font-size: 11.5px; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.neg { color: #b91c1c; }
    .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; text-align: center; }
    .totals .val { font-size: 14px; font-weight: 700; color: #082175; margin-top: 2px; }
    .totals .net { color: #047857; }
    .signature { margin-top: 26px; display: flex; justify-content: space-between; gap: 32px; font-size: 11px; color: #475569; }
    .sig-line { flex: 1; border-top: 1px solid #94a3b8; padding-top: 6px; text-align: center; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="kicker">Autorização de Emissão de NFS-e · Contrato PJ</div>
        <div class="company-name">${escapeHtml(company?.name || 'Empresa Tomadora')}</div>
        <div class="muted">CNPJ Tomador: ${escapeHtml(company?.cnpj || '-')}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:#64748b;">COMPETÊNCIA</div>
        <div style="font-size:15px;font-weight:700;color:#082175;">${escapeHtml(entry.competence)}</div>
        <div class="muted">Contrato PJ · Sem vínculo CLT</div>
      </div>
    </div>

    <div class="meta-grid">
      <div><strong>Prestador / Representante:</strong> ${escapeHtml(employee?.full_name || '-')}</div>
      <div><strong>Razão Social PJ:</strong> ${escapeHtml(employee?.pj_company_name || '-')}</div>
      <div><strong>CNPJ Prestador:</strong> ${escapeHtml(employee?.pj_cnpj || '-')}</div>
      <div><strong>Escopo / Função:</strong> ${escapeHtml(job?.title || '-')}</div>
      <div><strong>Início Contrato:</strong> ${escapeHtml(startDateFmt)}</div>
      <div><strong>Nº NFS-e:</strong> ${escapeHtml(entry.nfse_number || 'Aguardando emissão')}</div>
    </div>

    <div class="highlight-box">
      <div>
        <div style="font-size:10px;color:#065f46;font-weight:700;text-transform:uppercase;">Valor Autorizado para Emissão da NFS-e</div>
        <div style="font-size:11px;color:#047857;">Emitir Nota Fiscal de Serviços contra o CNPJ tomador acima</div>
      </div>
      <div style="font-size:20px;font-weight:800;color:#065f46;">${formatBRL(Number(entry.gross_salary))}</div>
    </div>

    <table>
      <thead><tr><th>Composição / Retenções</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        <tr><td>Valor Base Contratual (${entry.worked_days} dia(s) na competência)</td><td class="num">${formatBRL((Number(entry.base_salary) / 30) * Number(entry.worked_days))}</td></tr>
        ${Number(entry.bonuses) > 0 ? `<tr><td>Reembolsos / Adicionais Contratuais</td><td class="num">${formatBRL(Number(entry.bonuses))}</td></tr>` : ''}
        ${Number(entry.pj_iss_amount ?? 0) > 0 ? `<tr><td>ISS Retido na Fonte</td><td class="num neg">-${formatBRL(Number(entry.pj_iss_amount ?? 0))}</td></tr>` : ''}
        ${Number(entry.pj_retention_amount ?? 0) > 0 ? `<tr><td>IRRF / PCC PJ Retido na Fonte</td><td class="num neg">-${formatBRL(Number(entry.pj_retention_amount ?? 0))}</td></tr>` : ''}
        ${Number(entry.other_discounts) > 0 ? `<tr><td>Glosas / Descontos Contratuais</td><td class="num neg">-${formatBRL(Number(entry.other_discounts))}</td></tr>` : ''}
      </tbody>
    </table>

    <div class="totals">
      <div><div class="muted">Valor a Emitir NFS-e</div><div class="val">${formatBRL(Number(entry.gross_salary))}</div></div>
      <div><div class="muted">Retenções / Glosas</div><div class="val" style="color:#b91c1c;">-${formatBRL(Number(entry.total_discounts))}</div></div>
      <div><div class="muted">Líquido a Transferir</div><div class="val net">${formatBRL(Number(entry.net_salary))}</div></div>
    </div>

    <div class="signature">
      <div class="sig-line">Data: ____/____/________</div>
      <div class="sig-line">Prestador PJ (${escapeHtml(employee?.pj_company_name || employee?.full_name || '')})</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildPayslipHtml(params: {
  company: Company | null;
  entry: PayrollEntry;
  employee?: Employee;
  job?: Job;
}): string {
  const { company, entry, employee, job } = params;
  const isPj = (entry.contract_type || employee?.contract_type || 'clt') === 'pj';
  if (isPj) {
    return buildPjAuthorizationHtml(params);
  }

  const proportionalBase = (Number(entry.base_salary) / 30) * Number(entry.worked_days);
  const vrOther = Number(entry.vr_discount) + Number(entry.other_discounts);
  const hireDateFmt = employee?.hire_date
    ? employee.hire_date.split('-').reverse().join('/')
    : '-';

  const proventosRows = [
    `<tr><td>Salário Proporcional (${entry.worked_days} dias)</td><td class="num">${formatBRL(proportionalBase)}</td></tr>`,
    Number(entry.overtime_amount) > 0
      ? `<tr><td>Horas Extras (50% / 100%)</td><td class="num">${formatBRL(Number(entry.overtime_amount))}</td></tr>`
      : '',
    Number(entry.night_shift_amount) > 0
      ? `<tr><td>Adicional Noturno</td><td class="num">${formatBRL(Number(entry.night_shift_amount))}</td></tr>`
      : '',
    Number(entry.dsr_amount) > 0
      ? `<tr><td>DSR sobre Variáveis</td><td class="num">${formatBRL(Number(entry.dsr_amount))}</td></tr>`
      : '',
    Number(entry.insalubrity_amount) > 0
      ? `<tr><td>Insalubridade (${entry.insalubrity_rate}%)</td><td class="num">${formatBRL(Number(entry.insalubrity_amount))}</td></tr>`
      : '',
    Number(entry.hazard_amount) > 0
      ? `<tr><td>Periculosidade (30%)</td><td class="num">${formatBRL(Number(entry.hazard_amount))}</td></tr>`
      : '',
    Number(entry.bonuses) > 0
      ? `<tr><td>Bonificações / Comissões</td><td class="num">${formatBRL(Number(entry.bonuses))}</td></tr>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const descontosRows = [
    `<tr><td>INSS Progressivo</td><td class="num neg">-${formatBRL(Number(entry.inss_amount))}</td></tr>`,
    `<tr><td>IRRF Retido (Lei nº 15.270/2025)</td><td class="num neg">-${formatBRL(Number(entry.irrf_amount))}</td></tr>`,
    Number(entry.vt_discount_amount) > 0
      ? `<tr><td>Vale-Transporte (6%)</td><td class="num neg">-${formatBRL(Number(entry.vt_discount_amount))}</td></tr>`
      : '',
    Number(entry.absence_discount_amount) > 0
      ? `<tr><td>Faltas (${entry.absence_days} dia(s))</td><td class="num neg">-${formatBRL(Number(entry.absence_discount_amount))}</td></tr>`
      : '',
    vrOther > 0
      ? `<tr><td>VR / Outros Descontos</td><td class="num neg">-${formatBRL(vrOther)}</td></tr>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Demonstrativo de Pagamento - ${escapeHtml(employee?.full_name || '')} (${escapeHtml(entry.competence)})</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 12px; background: #fff; }
    .sheet { border: 1.5px solid #082175; border-radius: 8px; padding: 20px; max-width: 720px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; }
    .kicker { color: #9f8548; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    .company-name { color: #082175; font-size: 16px; font-weight: 700; margin: 3px 0; }
    .muted { color: #64748b; font-size: 11px; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; font-size: 11px; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 6px 4px; }
    td { padding: 5px 4px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.neg { color: #b91c1c; }
    .totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; text-align: center; }
    .totals .val { font-size: 13px; font-weight: 700; color: #082175; margin-top: 2px; }
    .totals .net { color: #047857; }
    .signature { margin-top: 26px; display: flex; justify-content: space-between; gap: 32px; font-size: 11px; color: #475569; }
    .sig-line { flex: 1; border-top: 1px solid #94a3b8; padding-top: 6px; text-align: center; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="kicker">Demonstrativo de Pagamento · CLT</div>
        <div class="company-name">${escapeHtml(company?.name || 'Empresa Cliente')}</div>
        <div class="muted">CNPJ: ${escapeHtml(company?.cnpj || '-')}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:#64748b;">COMPETÊNCIA</div>
        <div style="font-size:15px;font-weight:700;color:#082175;">${escapeHtml(entry.competence)}</div>
        <div class="muted">${entry.worked_days} dia(s) trabalhados</div>
      </div>
    </div>

    <div class="meta-grid">
      <div><strong>Colaborador:</strong> ${escapeHtml(employee?.full_name || '-')}</div>
      <div><strong>CPF:</strong> ${escapeHtml(employee?.cpf || '-')}</div>
      <div><strong>Cargo:</strong> ${escapeHtml(job?.title || '-')}</div>
      <div><strong>Data Admissão:</strong> ${escapeHtml(hireDateFmt)}</div>
    </div>

    <div class="cols">
      <div>
        <table>
          <thead><tr><th>Proventos</th><th style="text-align:right">Valor</th></tr></thead>
          <tbody>${proventosRows}</tbody>
        </table>
      </div>
      <div>
        <table>
          <thead><tr><th>Descontos</th><th style="text-align:right">Valor</th></tr></thead>
          <tbody>${descontosRows}</tbody>
        </table>
      </div>
    </div>

    <div class="totals">
      <div><div class="muted">Total Bruto</div><div class="val">${formatBRL(Number(entry.gross_salary))}</div></div>
      <div><div class="muted">Total Descontos</div><div class="val" style="color:#b91c1c;">-${formatBRL(Number(entry.total_discounts))}</div></div>
      <div><div class="muted">Líquido a Receber</div><div class="val net">${formatBRL(Number(entry.net_salary))}</div></div>
      <div><div class="muted">FGTS do Mês (8%)</div><div class="val">${formatBRL(Number(entry.fgts_amount))}</div></div>
    </div>

    <div class="signature">
      <div class="sig-line">Data: ____/____/________</div>
      <div class="sig-line">Assinatura do Colaborador (${escapeHtml(employee?.full_name || '')})</div>
    </div>
  </div>
</body>
</html>`;
}

export function printIsolatedPayslip(params: {
  company: Company | null;
  entry: PayrollEntry;
  employee?: Employee;
  job?: Job;
}): void {
  const html = buildPayslipHtml(params);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  }, 120);
}

export function buildPayslipEmailSummary(params: {
  company: Company | null;
  entry: PayrollEntry;
  employee?: Employee;
  job?: Job;
}): string {
  const { company, entry, employee, job } = params;
  const isPj = (entry.contract_type || employee?.contract_type || 'clt') === 'pj';

  if (isPj) {
    return [
      `Olá, ${employee?.full_name || 'Prestador'}!`,
      ``,
      `Segue a autorização para emissão de NFS-e (${entry.competence}) - ${company?.name || ''}:`,
      `CNPJ Tomador: ${company?.cnpj || '-'}`,
      `CNPJ Prestador: ${employee?.pj_cnpj || '-'}`,
      `Escopo / Cargo: ${job?.title || '-'}`,
      `Valor a emitir na NFS-e: ${formatBRL(Number(entry.gross_salary))}`,
      `Retenções/Glosas: -${formatBRL(Number(entry.total_discounts))}`,
      `Líquido a transferir: ${formatBRL(Number(entry.net_salary))}`,
      ``,
      `Atenciosamente,`,
      `Financeiro / DP · CCB RH`,
    ].join('\n');
  }

  return [
    `Olá, ${employee?.full_name || 'Colaborador'}!`,
    ``,
    `Segue o resumo do seu Demonstrativo de Pagamento (${entry.competence}) - ${company?.name || ''}:`,
    `Cargo: ${job?.title || '-'}`,
    `Dias trabalhados: ${entry.worked_days} dia(s)`,
    `Total Bruto: ${formatBRL(Number(entry.gross_salary))}`,
    `INSS: -${formatBRL(Number(entry.inss_amount))}`,
    `IRRF (Lei nº 15.270/2025): -${formatBRL(Number(entry.irrf_amount))}`,
    `Total Descontos: -${formatBRL(Number(entry.total_discounts))}`,
    `Salário Líquido: ${formatBRL(Number(entry.net_salary))}`,
    `FGTS depositado (8%): ${formatBRL(Number(entry.fgts_amount))}`,
    ``,
    `Atenciosamente,`,
    `Departamento Pessoal · CCB RH`,
  ].join('\n');
}
