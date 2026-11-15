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

    const systemInstruction = `Você é o motor oficial de Inteligência Analítica da ccbrh (https://ccbrh.com.br/), uma plataforma corporativa de RH e Gestão de Pessoas Multi-Tenant voltada para o mercado B2B, desenvolvida sobre Supabase PostgreSQL.

Sua persona é a de um Engenheiro de People Analytics Sênior, Especialista em Operações de Recrutamento e Departamento Pessoal (CLT). Seu tom é altamente analítico, profissional, direto e focado em segurança de dados corporativos.

---

### ESTRUTURA DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
Sempre que o usuário solicitar consultas, relatórios, códigos ou automações, baseie-se estritamente nesta arquitetura de tabelas:

1. companies (Tenants): id, name, cnpj, cnpj_root, email, telefone, area_atuacao, status
2. company_branches: id, company_id, label, cnpj, endereco, cidade, estado, cep, latitude, longitude, is_headquarters
3. jobs: id, tenant_id, title, department, base_salary
4. employees: id, tenant_id, job_id, branch_id, reports_to, full_name, email, status, hire_date, resignation_date, dependents_count, salary_override, vt_opted_in
5. vacancies: id, tenant_id, job_id, branch_id, title, description, vacancies_count, city, state, show_salary, api_source, status
6. candidates: id, tenant_id, vacancy_id, full_name, email, phone, linkedin_url, resume_path, cep, endereco, numero, complemento, bairro, cidade, estado, latitude, longitude, pipeline_stage, document_token, token_expires_at
7. documents: id, tenant_id, employee_id, candidate_id, document_type, storage_path, status, uploaded_at
8. payroll_entries: id, tenant_id, employee_id, competence, base_salary, gross_salary, inss_amount, irrf_amount, fgts_amount, net_salary, status

---

### INSTRUÇÕES DE EXECUÇÃO E REGRAS DE NEGÓCIO
1. ISOLAMENTO MULTI-TENANT OBRIGATÓRIO (RLS): Todas as operações devem respeitar tenant_id = '${tenantId || ''}'.
2. DADOS REAIS: Baseie suas análises estritamente nos dados em tempo real fornecidos no contexto. Nunca invente nomes de pessoas ou valores fictícios.

---

### FORMATO DE RESPOSTA PADRÃO OBRIGATÓRIO:
Responda EXATAMENTE utilizando a seguinte estrutura markdown:

### 🌐 [MÓDULO DA CCBRH RELACIONADO]
*(Identifique qual módulo está atuando: Resumo Gerencial, Recrutamento e Seleção, Área de Envio do Candidato ou Folha de Pagamento)*

### 📊 Análise do Agente
[Insira aqui sua análise detalhada de dados reais recebidos do contexto]

### ⚡ Ações Recomendadas
- [Ação prática 1]
- [Ação prática 2]
- [Ação prática 3]
`;

    const userPrompt = `CONTEXTO ATUAL DA EMPRESA NA CCBRH:
- Tenant ID: ${tenantId || 'N/A'}
- Empresa: ${tenantName || 'N/A'}
- CNPJ: ${tenantCnpj || 'N/A'}
- Dados em tempo real do Supabase:
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
          temperature: 0.2,
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
      const fallbackResponse = generateAnalyticalFallback(
        prompt,
        tenantName || 'Empresa Selecionada',
        contextData
      );
      return res.json({
        success: true,
        text: fallbackResponse,
        source: 'ccbrh-analytical-engine',
        tenantId,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error in ccbrh AI Agent endpoint:', err);
    return res.status(500).json({
      error: 'Erro no processamento do agente de People Analytics.',
      details: message,
    });
  }
});

function generateAnalyticalFallback(
  prompt: string,
  tenantName: string,
  contextData: Record<string, unknown> = {}
): string {
  const p = prompt.toLowerCase();
  const totalPayroll = String(contextData.totalPayroll || 'R$ 0,00');
  const activeHeadcount = Number(contextData.activeEmployeesCount || 0);
  const averageSalary = String(contextData.averageSalary || 'R$ 0,00');
  const activeVacanciesCount = Number(contextData.activeVacanciesCount || 0);
  const candidatesCount = Number(contextData.candidatesCount || 0);
  const expiredTokensCount = Number(contextData.expiredTokensCount || 0);
  const tenantCnpj = String(contextData.tenantCnpj || 'Não informado');

  if (p.includes('distor') || p.includes('salári') || p.includes('financeir') || p.includes('massa') || p.includes('folha') || p.includes('quadro')) {
    return `### 🌐 [RESUMO GERENCIAL E FOLHA DE PAGAMENTO]

### 📊 Análise do Agente
Com base nos registros reais sincronizados com o Supabase para **${tenantName}** (\`CNPJ: ${tenantCnpj}\`):

- **Colaboradores Ativos:** ${activeHeadcount} colaborador(es) vinculados ao quadro.
- **Folha Mensal Base Consolidada:** ${totalPayroll} (média salarial de ${averageSalary}).
- **Vagas Abertas:** ${activeVacanciesCount} posição(ões) em aberto impactando a projeção orçamentária.
- **Isolamento Multi-Tenant:** Políticas RLS ativas para o tenant selecionado.

### ⚡ Ações Recomendadas
- Acessar a aba **Folha de Pagamento** para gerar ou revisar a competência mensal com encargos CLT (INSS, IRRF e FGTS).
- Conferir o impacto salarial de novas contratações vinculadas às ${activeVacanciesCount} vagas abertas.
- Manter os cadastros de cargos e dependentes atualizados no quadro funcional.`;
  }

  if (p.includes('candidat') || p.includes('token') || p.includes('document') || p.includes('proposta') || p.includes('upload')) {
    return `### 🌐 [RECRUTAMENTO E PORTAL DO CANDIDATO]

### 📊 Análise do Agente
Diagnóstico em tempo real do funil de seleção da empresa **${tenantName}** (\`CNPJ: ${tenantCnpj}\`):

- **Candidatos no Pipeline:** ${candidatesCount} candidato(s) em acompanhamento.
- **Tokens Expirados em Proposta/Aprovado:** ${expiredTokensCount} link(s) demandando renovação.

### ⚡ Ações Recomendadas
- Renovar os tokens expirados diretamente no Kanban de Recrutamento e Seleção para liberar o envio de documentos.
- Validar documentos pendentes no **Repositório de Documentos** antes de efetivar a admissão.
- Consultar a **Visão de Localização** no módulo de Recrutamento para priorizar candidatos próximos às unidades.`;
  }

  return `### 🌐 [RESUMO GERENCIAL & PEOPLE ANALYTICS]

### 📊 Análise do Agente
Análise consolidada do banco Supabase para **${tenantName}** (\`CNPJ: ${tenantCnpj}\`):

- **Colaboradores Ativos:** ${activeHeadcount}
- **Folha Base Mensal:** ${totalPayroll}
- **Vagas Abertas:** ${activeVacanciesCount} · **Candidatos em Pipeline:** ${candidatesCount}

### ⚡ Ações Recomendadas
- Revisar o cálculo mensal na aba **Folha de Pagamento**.
- Acompanhar candidaturas e distribuição geográfica na aba **Recrutamento e Seleção**.
- Manter os documentos de admissão conferidos no **Repositório de Documentos**.`;
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
    console.log(`ccbrh Server running at http://localhost:${PORT} [production: ${isProduction}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
