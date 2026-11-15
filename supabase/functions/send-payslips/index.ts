import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DispatchRequest {
  tenantId: string;
  competence: string;
  entryIds?: string[];
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const fromEmail = Deno.env.get('PAYSLIP_FROM_EMAIL') || 'CCB RH <no-reply@ccbrh.com.br>';

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isStaff } = await userClient.rpc('is_ccb_staff');
    if (!isStaff) {
      return new Response(JSON.stringify({ error: 'Permissão restrita à equipe CCB.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as DispatchRequest;
    if (!body.tenantId || !body.competence) {
      return new Response(JSON.stringify({ error: 'tenantId e competence são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          providerConfigured: false,
          sentCount: 0,
          failedCount: 0,
          message:
            'Provedor de e-mail (RESEND_API_KEY) ainda não configurado nos Secrets do Supabase.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let query = adminClient
      .from('payroll_entries')
      .select('*, employees(*), companies(*)')
      .eq('tenant_id', body.tenantId)
      .eq('competence', body.competence);

    if (body.entryIds && body.entryIds.length > 0) {
      query = query.in('id', body.entryIds);
    }

    const { data: entries, error: entriesErr } = await query;
    if (entriesErr) {
      throw new Error(entriesErr.message);
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const row of entries || []) {
      const emp = row.employees;
      const comp = row.companies;
      const toEmail = emp?.email;
      if (!toEmail) {
        failedCount++;
        await adminClient
          .from('payroll_entries')
          .update({
            payslip_sent_status: 'failed',
            payslip_last_error: 'Colaborador sem e-mail cadastrado.',
          })
          .eq('id', row.id);
        continue;
      }

      const isPj = (row.contract_type || emp?.contract_type || 'clt') === 'pj';
      const htmlBody = isPj
        ? `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:8px;padding:20px;">
          <h2 style="color:#082175;margin:0 0 8px;">Autorização de Emissão de NFS-e (PJ) · ${row.competence}</h2>
          <p style="color:#475569;font-size:13px;margin:0 0 16px;">Tomador: ${comp?.name || 'Empresa'} · CNPJ ${comp?.cnpj || '-'}</p>
          <p style="font-size:13px;">Olá, <strong>${emp.full_name}</strong>${emp.pj_company_name ? ` (${emp.pj_company_name})` : ''},</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
            <tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">CNPJ Prestador</td><td style="text-align:right;">${emp.pj_cnpj || '-'}</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">Valor a Emitir na NFS-e</td><td style="text-align:right;font-weight:bold;color:#082175;">${formatBRL(Number(row.gross_salary))}</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;color:#b91c1c;">Retenções / Glosas</td><td style="text-align:right;color:#b91c1c;">-${formatBRL(Number(row.total_discounts))}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#047857;">Líquido a Transferir</td><td style="text-align:right;font-weight:bold;color:#047857;">${formatBRL(Number(row.net_salary))}</td></tr>
          </table>
          <p style="font-size:11px;color:#64748b;">Financeiro / DP · CCB RH</p>
        </div>
      `
        : `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:8px;padding:20px;">
          <h2 style="color:#082175;margin:0 0 8px;">Demonstrativo de Pagamento · ${row.competence}</h2>
          <p style="color:#475569;font-size:13px;margin:0 0 16px;">${comp?.name || 'Empresa'} · CNPJ ${comp?.cnpj || '-'}</p>
          <p style="font-size:13px;">Olá, <strong>${emp.full_name}</strong>,</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
            <tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">Dias Trabalhados</td><td style="text-align:right;">${row.worked_days} dia(s)</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">Salário Bruto</td><td style="text-align:right;font-weight:bold;">${formatBRL(Number(row.gross_salary))}</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;color:#b91c1c;">Total de Descontos (INSS/IRRF L15.270/VT)</td><td style="text-align:right;color:#b91c1c;">-${formatBRL(Number(row.total_discounts))}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#047857;">Salário Líquido</td><td style="text-align:right;font-weight:bold;color:#047857;">${formatBRL(Number(row.net_salary))}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">FGTS do Mês (8%)</td><td style="text-align:right;color:#64748b;">${formatBRL(Number(row.fgts_amount))}</td></tr>
          </table>
          <p style="font-size:11px;color:#64748b;">Departamento Pessoal · CCB RH</p>
        </div>
      `;

      const mailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: isPj
            ? `Autorização NFS-e PJ ${row.competence} - ${comp?.name || 'CCB RH'}`
            : `Demonstrativo de Pagamento ${row.competence} - ${comp?.name || 'CCB RH'}`,
          html: htmlBody,
        }),
      });

      if (mailRes.ok) {
        sentCount++;
        await adminClient
          .from('payroll_entries')
          .update({
            payslip_sent_status: 'sent',
            payslip_sent_at: new Date().toISOString(),
            payslip_sent_channel: 'email_resend',
            payslip_sent_to: toEmail,
            payslip_last_error: null,
          })
          .eq('id', row.id);
      } else {
        failedCount++;
        const errText = await mailRes.text();
        await adminClient
          .from('payroll_entries')
          .update({
            payslip_sent_status: 'failed',
            payslip_sent_to: toEmail,
            payslip_last_error: errText.slice(0, 250),
          })
          .eq('id', row.id);
      }
    }

    return new Response(
      JSON.stringify({ providerConfigured: true, sentCount, failedCount }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
