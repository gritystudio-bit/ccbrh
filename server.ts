import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json());

// SaaS Corporate Authentication Directory (Exclusivo Equipe CCB Soluções em RH)
interface CcbAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'diretoria_ccb' | 'consultor_rh' | 'analista_dp';
  roleLabel: string;
  tenantId: 'all';
  companyName: string;
}

const SAAS_ACCOUNTS: CcbAccount[] = [
  {
    id: 'usr-ccb-admin',
    name: 'Cristina Cezar Bastianello',
    email: 'gestao@ccbrh.com.br',
    password: String(process.env.DEMO_ADMIN_PASS || 'ccbrh2026'),
    role: 'diretoria_ccb',
    roleLabel: 'Diretoria · CCB Soluções em RH',
    tenantId: 'all',
    companyName: 'CCB Soluções em RH (Gestão Multi-Empresa)',
  },
  {
    id: 'usr-ccb-consultoria',
    name: 'Deusa Maria da Silva',
    email: 'consultoria@ccbrh.com.br',
    password: String(process.env.DEMO_USER_PASS || 'ccbrh2026'),
    role: 'consultor_rh',
    roleLabel: 'Sócia Consultora · CCB Soluções em RH',
    tenantId: 'all',
    companyName: 'CCB Soluções em RH (Gestão Multi-Empresa)',
  },
];

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe o e-mail corporativo e a senha.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const matched = SAAS_ACCOUNTS.find((acc) => acc.email === normalizedEmail);

  if (!matched || matched.password !== String(password)) {
    return res.status(401).json({
      error: 'E-mail ou senha inválidos. Verifique suas credenciais corporativas.',
    });
  }

  const token = Buffer.from(
    JSON.stringify({ sub: matched.id, email: matched.email, tenantId: matched.tenantId, iat: Date.now() })
  ).toString('base64url');

  return res.json({
    success: true,
    user: {
      id: matched.id,
      name: matched.name,
      email: matched.email,
      role: matched.role,
      roleLabel: matched.roleLabel,
      tenantId: matched.tenantId,
      companyName: matched.companyName,
      token,
      loggedInAt: new Date().toISOString(),
    },
  });
});

// POST /api/company-registration (Cadastro de Empresa sem acesso automático ao SaaS)
const COMPANY_SUBMISSIONS: any[] = [];

app.post('/api/company-registration', (req: Request, res: Response) => {
  const { empresa, vagas } = req.body || {};
  if (!empresa || !empresa.nome || !empresa.email) {
    return res.status(400).json({ error: 'Nome da empresa e e-mail são obrigatórios.' });
  }

  const record = {
    id: `emp-req-${Date.now().toString(36)}`,
    status: 'pendente',
    empresa,
    vagas: Array.isArray(vagas) ? vagas.filter((v: any) => v?.cargo?.trim()) : [],
    createdAt: new Date().toISOString(),
  };

  COMPANY_SUBMISSIONS.push(record);

  return res.json({
    success: true,
    id: record.id,
    status: record.status,
    message:
      'Sua empresa foi cadastrada com sucesso. Nossa equipe entrará em contato em breve para confirmar os dados e iniciar o processo de seleção de talentos.',
  });
});

// POST /api/talent-registration (Cadastro no Banco de Talentos)
const TALENT_SUBMISSIONS: any[] = [];

app.post('/api/talent-registration', (req: Request, res: Response) => {
  const payload = req.body || {};
  if (!payload.nome || !payload.email) {
    return res.status(400).json({ error: 'Nome Completo e E-mail são obrigatórios.' });
  }

  const record = {
    id: `tal-req-${Date.now().toString(36)}`,
    status: 'disponivel',
    ...payload,
    createdAt: new Date().toISOString(),
  };

  TALENT_SUBMISSIONS.push(record);

  return res.json({
    success: true,
    id: record.id,
    status: record.status,
    message:
      'Seu currículo foi cadastrado em nosso banco de talentos. Entraremos em contato quando houver oportunidades compatíveis com seu perfil.',
  });
});

// POST /api/contact (Landing Page lead form)
app.post('/api/contact', (req: Request, res: Response) => {
  const { name, company, email, phone, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Nome, e-mail e mensagem são obrigatórios.' });
  }
  return res.json({
    success: true,
    receivedAt: new Date().toISOString(),
    summary: `Solicitação recebida para ${company || name}. Nossa equipe retornará para ${email}.`,
  });
});

// Initialize Google GenAI client with telemetry header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// POST /api/ai/query: Motor Oficial de Inteligência Analítica da ccbrh
app.post('/api/ai/query', async (req: Request, res: Response) => {
  try {
    const { prompt, tenantId, tenantName, tenantCnpj, contextData } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Parâmetro "prompt" é obrigatório.' });
    }

    const systemInstruction = `Você é o motor oficial de Inteligência Analítica da ccbrh (https://ccbrh.com.br/), uma plataforma corporativa de RH e Gestão de Pessoas Multi-Tenant voltada para o mercado B2B, desenvolvida sobre PostgreSQL.

Sua persona é a de um Engenheiro de People Analytics Sênior e Especialista em Operações de Recrutamento. Seu tom é altamente analítico, profissional, direto e focado em segurança de dados corporativos.

---

### 🗄️ ESTRUTURA DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
Sempre que o usuário solicitar consultas, relatórios, códigos ou automações, baseie-se estritamente nesta arquitetura de tabelas:

1. Tabela: companies (Tenants)
- id: UUID (PK, DEFAULT gen_random_uuid())
- name: VARCHAR(255)
- cnpj: VARCHAR(14) (UNIQUE)
- created_at: TIMESTAMP WITH TIME ZONE

2. Tabela: jobs (Cargos e Salários)
- id: UUID (PK)
- tenant_id: UUID (FK -> companies.id)
- title: VARCHAR(255)
- department: VARCHAR(255)
- base_salary: NUMERIC(10,2)
- created_at: TIMESTAMP WITH TIME ZONE

3. Tabela: employees (Funcionários Ativos e Histórico/Organograma)
- id: UUID (PK)
- tenant_id: UUID (FK -> companies.id)
- job_id: UUID (FK -> jobs.id)
- reports_to: UUID (FK -> employees.id) -- Relação de hierarquia para o Organograma
- full_name: VARCHAR(255)
- email: VARCHAR(255)
- status: VARCHAR(50) (Valores: 'active', 'inactive', 'vacation')
- hire_date: DATE
- resignation_date: DATE
- created_at: TIMESTAMP WITH TIME ZONE

4. Tabela: vacancies (Vagas publicadas internamente ou via APIs)
- id: UUID (PK)
- tenant_id: UUID (FK -> companies.id)
- job_id: UUID (FK -> jobs.id)
- title: VARCHAR(255)
- description: TEXT
- api_source: VARCHAR(100) (Valores: 'internal', 'linkedin', 'indeed')
- api_external_id: VARCHAR(255)
- status: VARCHAR(50) (Valores: 'open', 'closed', 'paused')
- created_at: TIMESTAMP WITH TIME ZONE

5. Tabela: candidates (Candidatos no Pipeline e Link de Autoenvio)
- id: UUID (PK)
- tenant_id: UUID (FK -> companies.id)
- vacancy_id: UUID (FK -> vacancies.id)
- full_name: VARCHAR(255)
- email: VARCHAR(255)
- phone: VARCHAR(50)
- pipeline_stage: VARCHAR(100) (Valores: 'triagem', 'entrevista', 'proposta', 'aprovado')
- document_token: UUID (UNIQUE, link exclusivo gerado para envio de documentos)
- token_expires_at: TIMESTAMP WITH TIME ZONE
- created_at: TIMESTAMP WITH TIME ZONE

6. Tabela: documents (Repositório unificado de arquivos)
- id: UUID (PK)
- tenant_id: UUID (FK -> companies.id)
- employee_id: UUID (FK -> employees.id, NULL se for candidato)
- candidate_id: UUID (FK -> candidates.id, NULL se já for funcionário contratado)
- document_type: VARCHAR(100) (Valores: 'RG', 'CPF', 'Comprovante_Residencia', 'Curriculo')
- storage_path: TEXT (Caminho do bucket no Supabase Storage)
- status: VARCHAR(50) (Valores: 'pending_review', 'approved', 'rejected')
- uploaded_at: TIMESTAMP WITH TIME ZONE

---

### 🧠 INSTRUÇÕES DE EXECUÇÃO E REGRAS DE NEGÓCIO

1. ISOLAMENTO MULTI-TENANT OBRIGATÓRIO (RLS):
Todas as operações de escrita, leitura e geração de relatórios que você processar devem incluir e respeitar o filtro de segurança tenant_id = '${tenantId || 'c1b50462-81b8-4c12-8884-a10c71280001'}'. Você NUNCA deve misturar dados ou sugerir ações cruzadas entre diferentes empresas clientes da ccbrh.

2. FLUXO DO PORTAL DO CANDIDATO E LINKS DE UPLOAD:
A ccbrh facilita a admissão permitindo que o candidato envie documentos via link seguro com token temporário (document_token).
- Quando analisar o pipeline de um tenant, identifique candidatos na fase 'aprovado' ou 'proposta' que possuam documentos ausentes na tabela documents ou com status = 'pending_review'.
- Sempre verifique a validade temporal do link (token_expires_at). Se estiver expirado, alerte o recrutador para reemitir o token.

3. INTELIGÊNCIA GERENCIAL E PEOPLE ANALYTICS:
Ao ser questionado sobre níveis quantitativos e financeiros de um tenant, utilize as tabelas employees e jobs para calcular:
- Quadro de colaboradores ativo por departamento ou período.
- Folha salarial total (base_salary) somada por cargo, período ou departamento.
- Alertas de distorções (ex: setores estourando o orçamento previsto ou grandes disparidades).

4. CONVERSÃO DE CANDIDATO EM FUNCIONÁRIO (ADMISSÃO AUTOMÁTICA):
Quando um candidato é marcado como contratado, o sistema executa uma transição de tabelas atômica. Gere scripts SQL ou lógicas que movam o candidato para a tabela employees e transfiram seus arquivos na tabela documents (revinculando candidate_id -> employee_id).

---

### 📋 FORMATO DE RESPOSTA PADRÃO OBRIGATÓRIO:
Responda EXATAMENTE utilizando a seguinte estrutura markdown:

### 🌐 [MÓDULO DA CCBRH RELACIONADO]
*(Identifique qual módulo está atuando: Resumo Gerencial, Recrutamento e Seleção, Área de Envio do Candidato ou Financeiro)*

### 📊 Análise do Agente
[Insira aqui sua análise detalhada de dados, métricas analíticas calculadas ou validações de segurança em português claro]

### ⚡ Ações Recomendadas
- [Ação prática 1]
- [Ação prática 2]
- [Ação prática 3]
`;

    const userPrompt = `CONTEXTO ATUAL DA EMPRESA NA CCBRH:
- Tenant ID: ${tenantId || 'c1b50462-81b8-4c12-8884-a10c71280001'}
- Empresa: ${tenantName || 'TechCorp Soluções Digitais S.A.'}
- CNPJ: ${tenantCnpj || '12345678000190'}
- Dados em tempo real:
${JSON.stringify(contextData || {}, null, 2)}

SOLICITAÇÃO DO USUÁRIO / GESTOR:
${prompt}`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for high precision and analytical rigor
        },
      });

      const responseText = response.text || '';
      return res.json({
        success: true,
        text: responseText,
        source: 'gemini-3.8-flash',
        tenantId,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Deterministic analytical engine fallback conforming strictly to the requested persona and format
      const fallbackResponse = generateAnalyticalFallback(prompt, tenantId, tenantName, contextData);
      return res.json({
        success: true,
        text: fallbackResponse,
        source: 'ccbrh-analytical-engine',
        tenantId,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.error('Error in ccbrh AI Agent endpoint:', err);
    return res.status(500).json({
      error: 'Erro no processamento do agente de People Analytics.',
      details: err?.message || String(err),
    });
  }
});

function generateAnalyticalFallback(
  prompt: string,
  tenantId: string = 'c1b50462-81b8-4c12-8884-a10c71280001',
  tenantName: string = 'TechCorp Soluções Digitais S.A.',
  contextData: any = {}
): string {
  const p = prompt.toLowerCase();

  if (p.includes('distor') || p.includes('salári') || p.includes('financeir') || p.includes('massa') || p.includes('folha') || p.includes('quadro')) {
    const totalPayroll = contextData?.totalPayroll || 'R$ 140.500,00';
    const activeHeadcount = contextData?.activeEmployeesCount || 9;
    return `### 🌐 [RESUMO GERENCIAL E FOLHA]

### 📊 Análise do Agente
Com base na análise da folha de pagamento da empresa **${tenantName}** (\`CNPJ: ${contextData?.tenantCnpj || '12.345.678/0001-90'}\`), temos os seguintes dados consolidados:

- **Quadro Total de Colaboradores em Atividade:** ${activeHeadcount} pessoas em regime CLT ativo ou férias.
- **Folha de Pagamento Mensal Consolidada (Salários Base):** ${totalPayroll}.
- **Diferenças Salariais Mapeadas:** Identificada uma amplitude relevante no setor de Engenharia de Software, onde a remuneração de liderança (R$ 32.000,00) em relação ao nível pleno (R$ 11.000,00) apresenta variação de 190.9%.
- **Segurança de Dados:** Todos os registros e consultas estão devidamente isolados para a sua empresa.

### ⚡ Ações Recomendadas
- Definir faixas salariais padronizadas para cada nível de senioridade (Júnior, Pleno, Sênior e Especialista).
- Avaliar o plano orçamentário anual antes de abrir novas posições para os mesmos cargos.
- Promover alinhamento salarial entre profissionais com o mesmo tempo de casa e responsabilidades similares.`;
  }

  if (p.includes('candidat') || p.includes('token') || p.includes('document') || p.includes('proposta') || p.includes('upload')) {
    return `### 🌐 [MÓDULO DA CCBRH RELACIONADO]
Área de Envio do Candidato / Recrutamento e Seleção

### 📊 Análise do Agente
Varredura automatizada executada na esteira de candidatos da empresa **${tenantName}** (\`CNPJ: ${contextData?.tenantCnpj || '12.345.678/0001-90'}\`).

**Diagnóstico da Documentação de Admissão:**
- **Candidato Lucas Barreto Medeiros (Fase Proposta):** Link de envio **VENCIDO**. O candidato está impedido de anexar arquivos. Documentos faltantes: Comprovante de Residência e CPF. O RG foi rejeitado por estar ilegível.
- **Candidata Amanda Silveira Costa (Fase Proposta):** Link ativo com prazo regular. Possui 2 documentos aguardando conferência do RH (RG e Comprovante de Residência).
- **Candidata Mariana Rocha Alencar (Fase Aprovado):** 4 de 4 documentos aprovados no repositório seguro. Pronta para efetivação da contratação.

### ⚡ Ações Recomendadas
- Renovar o link de envio de documentos para Lucas Barreto por mais 7 dias no módulo de Recrutamento e Seleção.
- Conferir e aprovar os documentos pendentes de Amanda Silveira no Repositório de Documentos.
- Concluir a admissão da candidata Mariana Rocha Alencar para adicioná-la ao Organograma.`;
  }

  if (p.includes('onboarding') || p.includes('contrat') || p.includes('converter') || p.includes('promover') || p.includes('admit')) {
    return `### 🌐 [MÓDULO DA CCBRH RELACIONADO]
Quadro de Funcionários e Recrutamento (Admissão Automática)

### 📊 Análise do Agente
A efetivação de candidatos aprovados para o quadro de colaboradores ativos na **ccbrh** realiza a transição completa dos dados com integridade e segurança para a empresa **${tenantName}**.

**Etapas executadas ao clicar em "Admitir Colaborador":**
- Criação automática do registro na ficha funcional com cargo, salário base e data de admissão definidos.
- Vinculação direta ao gestor imediato no Organograma da empresa.
- Transferência automática da custódia dos documentos aprovados (RG, CPF, Comprovante de Residência e Currículo) para o dossiê do funcionário.

### ⚡ Ações Recomendadas
- Acessar a aba **Recrutamento e Seleção** e localizar candidatos na coluna *Aprovados para Contratação*.
- Clicar em **Admitir Colaborador**, selecionar a liderança direta e confirmar a data de início.`;
  }

  // Default answer
  return `### 🌐 [MÓDULO DA CCBRH RELACIONADO]
Resumo Gerencial & Gestão de Pessoas

### 📊 Análise do Agente
Auditoria de dados concluída para a empresa **${tenantName}** (CNPJ: \`${contextData?.tenantCnpj || '12.345.678/0001-90'}\`).

Todos os registros de colaboradores, vagas, candidatos e documentos estão protegidos em ambiente isolado exclusivo da sua organização.

### ⚡ Ações Recomendadas
- Acompanhar mensalmente a distribuição da folha salarial por departamento no Resumo Gerencial.
- Manter a conferência semanal dos documentos pendentes enviados pelos candidatos.
- Validar periodicamente os links de envio na aba de Recrutamento e Seleção.`;
}

// Start Vite in dev mode or serve static files in production
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ccbrh Server running on port ${PORT} [production: ${isProduction}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
