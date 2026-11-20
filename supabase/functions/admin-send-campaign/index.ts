import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignDispatchRequest {
  campaignId?: string;
  nome: string;
  assunto: string;
  corpoHtml: string;
  segmento: 'todos_usuarios' | 'equipe_ccb' | 'empresas_ativas' | 'empresas_pendentes' | 'leads_comerciais';
  templateId?: string | null;
}

interface RecipientRow {
  email: string;
  nome: string;
  empresa: string;
}

function renderTemplate(html: string, recipient: RecipientRow): string {
  return html
    .replaceAll('{{nome}}', recipient.nome)
    .replaceAll('{{email}}', recipient.email)
    .replaceAll('{{empresa}}', recipient.empresa);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const fromEmail = Deno.env.get('ADMIN_MARKETING_FROM_EMAIL') || 'CCB RH <comunicacao@ccbrh.com.br>';

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isSuperAdmin, error: adminErr } = await userClient.rpc('is_admin');
    if (adminErr || !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso restrito a superadministradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as CampaignDispatchRequest;
    if (!body.nome?.trim() || !body.assunto?.trim() || !body.corpoHtml?.trim()) {
      return new Response(JSON.stringify({ error: 'Nome, assunto e corpo HTML são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const recipientsMap = new Map<string, RecipientRow>();

    if (body.segmento === 'todos_usuarios' || body.segmento === 'equipe_ccb') {
      const { data: profiles } = await adminClient
        .from('user_profiles')
        .select('email, full_name, is_active')
        .eq('is_active', true);

      for (const p of profiles || []) {
        const email = String(p.email || '').trim().toLowerCase();
        if (!email) continue;
        recipientsMap.set(email, {
          email,
          nome: String(p.full_name || 'Usuário'),
          empresa: 'CCB Soluções em RH',
        });
      }
    } else if (body.segmento === 'empresas_ativas' || body.segmento === 'empresas_pendentes') {
      const targetStatus = body.segmento === 'empresas_ativas' ? 'active' : 'pending_review';
      const { data: companies } = await adminClient
        .from('companies')
        .select('email, name, responsavel_nome')
        .eq('status', targetStatus);

      for (const c of companies || []) {
        const email = String(c.email || '').trim().toLowerCase();
        if (!email) continue;
        recipientsMap.set(email, {
          email,
          nome: String(c.responsavel_nome || c.name || 'Cliente'),
          empresa: String(c.name || 'Empresa Cliente'),
        });
      }
    } else if (body.segmento === 'leads_comerciais') {
      const { data: leads } = await adminClient
        .from('contact_leads')
        .select('email, name, company');

      for (const l of leads || []) {
        const email = String(l.email || '').trim().toLowerCase();
        if (!email) continue;
        recipientsMap.set(email, {
          email,
          nome: String(l.name || 'Contato'),
          empresa: String(l.company || 'Empresa'),
        });
      }
    }

    const recipients = Array.from(recipientsMap.values());
    const nowIso = new Date().toISOString();

    if (!resendApiKey) {
      const { data: campaignRow } = await adminClient
        .from('email_campaigns')
        .insert({
          template_id: body.templateId || null,
          nome: body.nome.trim(),
          assunto: body.assunto.trim(),
          corpo_html: body.corpoHtml,
          segmento: body.segmento,
          status: 'simulada',
          total_destinatarios: recipients.length,
          enviados: 0,
          falhas: 0,
          erro_detalhe: 'RESEND_API_KEY não configurada nos Secrets do Supabase.',
          enviado_em: nowIso,
          created_by: userData.user.id,
        })
        .select('id')
        .single();

      return new Response(
        JSON.stringify({
          providerConfigured: false,
          campaignId: campaignRow?.id || null,
          totalRecipients: recipients.length,
          sentCount: 0,
          failedCount: 0,
          message:
            'Campanha registrada em modo simulado: configure RESEND_API_KEY nos Secrets do Supabase para envios reais.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: campaign, error: insertErr } = await adminClient
      .from('email_campaigns')
      .insert({
        template_id: body.templateId || null,
        nome: body.nome.trim(),
        assunto: body.assunto.trim(),
        corpo_html: body.corpoHtml,
        segmento: body.segmento,
        status: 'enviando',
        total_destinatarios: recipients.length,
        created_by: userData.user.id,
      })
      .select('id')
      .single();

    if (insertErr || !campaign) {
      throw new Error(insertErr?.message || 'Falha ao registrar campanha.');
    }

    let sentCount = 0;
    let failedCount = 0;
    let lastError: string | null = null;

    for (const recipient of recipients) {
      const mailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient.email],
          subject: renderTemplate(body.assunto, recipient),
          html: renderTemplate(body.corpoHtml, recipient),
        }),
      });

      if (mailRes.ok) {
        sentCount++;
      } else {
        failedCount++;
        lastError = (await mailRes.text()).slice(0, 280);
      }
    }

    const finalStatus = failedCount > 0 && sentCount === 0 ? 'falha' : 'enviada';
    await adminClient
      .from('email_campaigns')
      .update({
        status: finalStatus,
        enviados: sentCount,
        falhas: failedCount,
        erro_detalhe: lastError,
        enviado_em: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    return new Response(
      JSON.stringify({
        providerConfigured: true,
        campaignId: campaign.id,
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
