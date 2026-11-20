import type {
  Company,
  Employee,
  EmployeeVacationRecord,
  Job,
} from '../../types/database';
import { formatIsoDateBR } from './vacationCycles';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Gera e imprime via iframe isolado o Aviso de Férias (Art. 135 CLT)
 * e o Recibo / Demonstrativo de Concessão de Férias (Art. 145 CLT).
 */
export function printVacationNoticeAndReceipt(params: {
  company: Company | null;
  employee: Employee;
  job?: Job;
  vacation: EmployeeVacationRecord;
}): void {
  const { company, employee, job, vacation } = params;
  const totalGross =
    Number(vacation.estimated_gross_amount || 0) +
    Number(vacation.estimated_abono_amount || 0) +
    Number(vacation.estimated_double_amount || 0);
  const baseVacationOnly = Math.max(
    0,
    Number(vacation.estimated_gross_amount || 0) - Number(vacation.estimated_third_amount || 0)
  );

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Aviso e Recibo de Férias - ${escapeHtml(employee.full_name)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 12px; background: #fff; }
    .sheet { border: 1.5px solid #082175; border-radius: 8px; padding: 20px; max-width: 720px; margin: 0 auto 18px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px; }
    .kicker { color: #9f8548; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    .company-name { color: #082175; font-size: 15px; font-weight: 700; margin: 2px 0; }
    .muted { color: #64748b; font-size: 11px; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin: 12px 0; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 6px 4px; }
    td { padding: 6px 4px; border-bottom: 1px solid #f1f5f9; font-size: 11.5px; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .signature { margin-top: 28px; display: flex; justify-content: space-between; gap: 32px; font-size: 11px; color: #475569; }
    .sig-line { flex: 1; border-top: 1px solid #94a3b8; padding-top: 6px; text-align: center; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="kicker">Aviso Formal de Concessão de Férias · Art. 135 CLT</div>
        <div class="company-name">${escapeHtml(company?.name || 'Empresa Empregadora')}</div>
        <div class="muted">CNPJ: ${escapeHtml(company?.cnpj || '-')}</div>
      </div>
      <div style="text-align:right">
        <div class="muted">PERÍODO AQUISITIVO</div>
        <div style="font-size:14px;font-weight:700;color:#082175;">${escapeHtml(vacation.acquisitive_period_label)}</div>
        <div class="muted">Fração ${vacation.fraction_number} · ${vacation.days_taken} dia(s)</div>
      </div>
    </div>

    <p style="line-height:1.55;">
      Comunicamos ao(à) colaborador(a) <strong>${escapeHtml(employee.full_name)}</strong>, CPF <strong>${escapeHtml(employee.cpf || '-')}</strong>,
      ocupante do cargo de <strong>${escapeHtml(job?.title || '-')}</strong>, que suas férias referentes ao período aquisitivo de
      <strong>${formatIsoDateBR(vacation.acquisitive_start)}</strong> a <strong>${formatIsoDateBR(vacation.acquisitive_end)}</strong>
      foram programadas conforme abaixo, observando o prazo legal mínimo de 30 dias de antecedência (Art. 135 da CLT).
    </p>

    <div class="meta-grid">
      <div><strong>Início do Gozo:</strong> ${formatIsoDateBR(vacation.start_date)}</div>
      <div><strong>Término do Gozo:</strong> ${formatIsoDateBR(vacation.end_date)}</div>
      <div><strong>Dias de Descanso:</strong> ${vacation.days_taken} dia(s) corrido(s)</div>
      <div><strong>Abono Pecuniário (Art. 143):</strong> ${vacation.sold_days} dia(s)</div>
      <div><strong>Data Limite Pagamento (Art. 145):</strong> ${formatIsoDateBR(vacation.payment_due_date)}</div>
      <div><strong>Competência Folha Vinculada:</strong> ${escapeHtml(vacation.competence || 'A definir')}</div>
    </div>

    <table>
      <thead><tr><th>Composição Estimada da Remuneração de Férias</th><th style="text-align:right">Valor Bruto</th></tr></thead>
      <tbody>
        <tr><td>Remuneração de Férias (${vacation.days_taken} dia(s))</td><td class="num">${formatBRL(baseVacationOnly)}</td></tr>
        <tr><td>Adicional 1/3 Constitucional (CF/88 Art. 7º XVII)</td><td class="num">${formatBRL(Number(vacation.estimated_third_amount || 0))}</td></tr>
        ${Number(vacation.sold_days || 0) > 0 ? `<tr><td>Abono Pecuniário + 1/3 (${vacation.sold_days} dia(s) · Isento INSS/IRRF)</td><td class="num">${formatBRL(Number(vacation.estimated_abono_amount || 0))}</td></tr>` : ''}
        ${Number(vacation.doubled_days || 0) > 0 ? `<tr><td>Dobra Legal Art. 137 CLT (${vacation.doubled_days} dia(s) após concessivo)</td><td class="num">${formatBRL(Number(vacation.estimated_double_amount || 0))}</td></tr>` : ''}
        <tr><td><strong>Total Bruto de Férias (antes das deduções legais na competência)</strong></td><td class="num"><strong>${formatBRL(totalGross)}</strong></td></tr>
      </tbody>
    </table>

    <p class="muted">
      Obs.: Os descontos legais de INSS e IRRF (com aplicação da Lei nº 15.270/2025) incidem no fechamento da competência na Folha de Pagamento.
      ${vacation.advance_13th_requested ? ' Foi solicitado o adiantamento da 1ª parcela do 13º salário (Lei nº 4.749/1965).' : ''}
    </p>

    <div class="signature">
      <div class="sig-line">Ciente do Empregador · Data: ____/____/________</div>
      <div class="sig-line">Assinatura do(a) Colaborador(a) (${escapeHtml(employee.full_name)})</div>
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
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
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1500);
  }, 250);
}
