import type { Candidate, Employee } from '../types/database';
import { formatCandidateAddress } from './geocoding';

/**
 * Gera um documento HTML/Blob institucional estruturado quando o arquivo original foi registrado
 * antes da sincronização binária do Storage, permitindo visualização e download imediato sem erro.
 */
export function buildFallbackDocumentBlobUrl(params: {
  storagePath: string;
  docLabel?: string;
  candidate?: Candidate | null;
  employee?: Employee | null;
  companyName?: string | null;
  vacancyTitle?: string | null;
}): { url: string; fileName: string } {
  const rawFileName = params.storagePath.split('/').pop() || 'documento_candidato.html';
  const baseName = rawFileName.replace(/\.[^.]+$/, '');
  const personName =
    params.candidate?.full_name || params.employee?.full_name || 'Candidato / Colaborador';
  const email = params.candidate?.email || params.employee?.email || '-';
  const phone = params.candidate?.phone || params.employee?.phone || '-';
  const linkedin = params.candidate?.linkedin_url || '-';
  const address = params.candidate
    ? formatCandidateAddress(params.candidate)
    : [
        params.employee?.address_info?.endereco,
        params.employee?.address_info?.numero,
        params.employee?.address_info?.bairro,
        params.employee?.address_info?.cidade,
        params.employee?.address_info?.estado,
        params.employee?.address_info?.cep,
      ]
        .filter(Boolean)
        .join(' · ') || '-';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${params.docLabel || 'Documento'} - ${personName}</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 32px 16px;
    }
    .sheet {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px;
      box-shadow: 0 10px 25px rgba(8, 33, 117, 0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #082175;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 22px;
      font-weight: 800;
      color: #082175;
    }
    .subtitle {
      font-size: 12px;
      color: #9F8548;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 20px;
    }
    .label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      word-break: break-word;
    }
    .full {
      grid-column: 1 / -1;
    }
    .actions {
      margin-top: 24px;
      display: flex;
      gap: 12px;
    }
    .btn {
      background: #082175;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border: none; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="subtitle">Dossiê Digital · CCB Soluções em RH</div>
        <div class="brand">${params.docLabel || 'Espelho de Documento / Currículo'}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#475569;">
        <strong>Arquivo Registrado:</strong><br/>
        <code>${rawFileName}</code>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="label">Nome Completo</div>
        <div class="value">${personName}</div>
      </div>
      <div>
        <div class="label">Vaga / Empresa</div>
        <div class="value">${params.vacancyTitle || params.companyName || 'Processo Seletivo CCB'}</div>
      </div>
      <div>
        <div class="label">E-mail</div>
        <div class="value">${email}</div>
      </div>
      <div>
        <div class="label">Telefone / WhatsApp</div>
        <div class="value">${phone}</div>
      </div>
      <div class="full">
        <div class="label">Endereço Residencial Informado</div>
        <div class="value">${address}</div>
      </div>
      <div class="full">
        <div class="label">LinkedIn / Portfólio</div>
        <div class="value">${linkedin}</div>
      </div>
      <div class="full">
        <div class="label">Caminho no Repositório</div>
        <div class="value"><code>${params.storagePath}</code></div>
      </div>
    </div>

    <div class="actions">
      <button class="btn" onclick="window.print()">Imprimir / Salvar em PDF</button>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return { url, fileName: `${baseName}.html` };
}

export function triggerBrowserDownload(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
