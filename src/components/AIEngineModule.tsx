import React, { useState, useRef, useEffect } from 'react';
import { useHireGrid } from '../context/HireGridContext';
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  ShieldAlert,
  BarChart2,
  FileSearch,
  UserCheck,
  Database,
  ArrowRight,
  Info,
  Terminal,
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  source?: string;
  module?: string;
}

const PREMADE_PROMPTS = [
  {
    icon: BarChart2,
    label: 'Distorções Salariais & Folha',
    module: 'Financeiro',
    prompt:
      'Realize uma análise quantitativa da folha salarial deste tenant: calcule o headcount ativo por departamento, massa salarial total, identifique disparidades salariais entre cargos equivalentes e forneça a query SQL com RLS correspondente.',
  },
  {
    icon: FileSearch,
    label: 'Auditoria de Tokens & Docs',
    module: 'Portal do Candidato',
    prompt:
      'Audite a esteira de candidatos do tenant atual nas fases "proposta" e "aprovado". Identifique tokens de autoenvio (token_expires_at) vencidos, documentos faltantes ou com status "pending_review", e sugira as ações de reemissão.',
  },
  {
    icon: UserCheck,
    label: 'Onboarding Atômico (SQL)',
    module: 'Core & R&S',
    prompt:
      'Gere a transação atômica em PostgreSQL para conversão de um candidato com status "aprovado" em funcionário ativo na tabela employees, transferindo a custódia de seus documentos no Supabase Storage e associando a hierarquia no organograma com RLS.',
  },
  {
    icon: Database,
    label: 'Auditar Políticas RLS',
    module: 'Core',
    prompt:
      'Analise a integridade do isolamento multi-tenant deste tenant_id no Supabase PostgreSQL. Apresente as políticas de Row Level Security (RLS) recomendadas para blindagem das tabelas employees, candidates e documents.',
  },
];

export const AIEngineModule: React.FC = () => {
  const {
    currentTenantId,
    currentCompany,
    employees,
    jobs,
    vacancies,
    candidates,
    documents,
    metrics,
  } = useHireGrid();

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      text: `### 🌐 [MÓDULO DO HIREGRID RELACIONADO]
Core & People Analytics

### 📊 Análise do Agente
Motor de Inteligência Artificial do **HireGrid** conectado ao tenant **${currentCompany.name}** (\`tenant_id: ${currentTenantId}\`, CNPJ: \`${currentCompany.cnpj}\`).

- **Isolamento Multi-Tenant:** Ativo e aplicado via Row Level Security (RLS) no Supabase.
- **Quadro Funcional:** ${metrics.activeHeadcount} colaboradores ativos monitorados.
- **Massa Salarial Mensal Auditada:** R$ ${metrics.totalPayroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
- **Pipeline de Recrutamento:** ${metrics.candidatesInPipelineCount} candidatos em avaliação (${metrics.expiredTokensCount} com links de upload demandando atenção).

Estou pronto para executar auditorias analíticas, gerar transações atômicas de onboarding ou projetar relatórios em PostgreSQL. Como posso apoiar suas operações de RH hoje?

### ⚡ Ações Recomendadas
- Executar auditoria de disparidades salariais no departamento de Engenharia e Operações.
- Verificar candidatos em fase de proposta com links de autoenvio expirados.
- Homologar transações de admissão automática para candidatos aprovados.`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      source: 'gemini-3.8-flash',
      module: 'Core',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setLoading(true);

    // Prepare real-time context data for this specific tenant
    const contextData = {
      tenantId: currentTenantId,
      tenantName: currentCompany.name,
      tenantCnpj: currentCompany.cnpj,
      totalHeadcount: employees.length,
      activeEmployeesCount: metrics.activeHeadcount,
      totalPayroll: `R$ ${metrics.totalPayroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      averageSalary: `R$ ${metrics.averageSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      departments: Array.from(new Set(jobs.map((j) => j.department))),
      candidatesSummary: candidates.map((c) => ({
        id: c.id,
        name: c.full_name,
        stage: c.pipeline_stage,
        token_expires_at: c.token_expires_at,
        isExpired: new Date(c.token_expires_at) < new Date(),
        docsCount: documents.filter((d) => d.candidate_id === c.id).length,
      })),
      jobsSummary: jobs.map((j) => ({
        title: j.title,
        department: j.department,
        salary: j.base_salary,
      })),
    };

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          tenantId: currentTenantId,
          tenantName: currentCompany.name,
          tenantCnpj: currentCompany.cnpj,
          contextData,
        }),
      });

      const data = await response.json();

      if (data.text) {
        // Extract related module from markdown header
        const moduleMatch = data.text.match(/###\s*🌐\s*\[?([^\]\n]+)\]?/i);
        const detectedModule = moduleMatch ? moduleMatch[1].trim() : 'People Analytics';

        const agentMessage: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: data.text,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          source: data.source || 'gemini-3.8-flash',
          module: detectedModule,
        };
        setMessages((prev) => [...prev, agentMessage]);
      } else {
        throw new Error(data.error || 'Falha na resposta do modelo.');
      }
    } catch (err: any) {
      console.error('Error querying AI Engine:', err);
      const errorMessage: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: `### 🌐 [ERRO OPERACIONAL]
Core & People Analytics

### 📊 Análise do Agente
Ocorreu uma instabilidade na comunicação com o motor analítico de inteligência: ${err.message || 'Erro desconhecido'}.

### ⚡ Ações Recomendadas
- Tentar reenviar a requisição em alguns instantes.
- Utilizar os relatórios embutidos no módulo de People Analytics.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        source: 'error-handler',
        module: 'Core',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render markdown text formatted cleanly with headers, sql codeblocks, and bullets
  const renderFormattedContent = (content: string, msgId: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-3 text-sm leading-relaxed text-slate-200">
        {parts.map((part, index) => {
          if (part.startsWith('```')) {
            const lines = part.slice(3, -3).trim().split('\n');
            const lang = lines[0].trim();
            const code = lines.slice(1).join('\n');
            const codeBlockId = `${msgId}-code-${index}`;

            return (
              <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{lang || 'sql'}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(code, codeBlockId)}
                    className="flex items-center gap-1 text-[11px] hover:text-slate-200 text-slate-400 transition-colors"
                  >
                    {copiedId === codeBlockId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar SQL</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 text-xs text-emerald-300 font-mono overflow-x-auto leading-relaxed">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }

          // Format headings and list items
          const lines = part.split('\n');
          return (
            <div key={index} className="space-y-1.5">
              {lines.map((line, lineIdx) => {
                if (line.startsWith('### 🌐')) {
                  return (
                    <div
                      key={lineIdx}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{line.replace('### 🌐', '').trim()}</span>
                    </div>
                  );
                }
                if (line.startsWith('### 📊')) {
                  return (
                    <h3
                      key={lineIdx}
                      className="text-base font-bold text-white flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80"
                    >
                      <BarChart2 className="w-4 h-4 text-indigo-400" />
                      <span>{line.replace('### 📊', '').trim()}</span>
                    </h3>
                  );
                }
                if (line.startsWith('### ⚡')) {
                  return (
                    <h3
                      key={lineIdx}
                      className="text-base font-bold text-amber-300 flex items-center gap-2 mt-4 pt-2 border-t border-slate-800/80"
                    >
                      <span className="text-lg">⚡</span>
                      <span>{line.replace('### ⚡', '').trim()}</span>
                    </h3>
                  );
                }
                if (line.startsWith('- ')) {
                  return (
                    <div key={lineIdx} className="flex items-start gap-2 pl-1 py-0.5">
                      <span className="text-indigo-400 font-bold mt-0.5">▪</span>
                      <span className="text-slate-300 text-xs sm:text-sm">
                        {renderBoldText(line.substring(2))}
                      </span>
                    </div>
                  );
                }
                if (!line.trim()) {
                  return <div key={lineIdx} className="h-1" />;
                }
                return (
                  <p key={lineIdx} className="text-slate-300 text-xs sm:text-sm">
                    {renderBoldText(line)}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-slate-800 text-indigo-300 px-1 py-0.2 rounded font-mono text-[11px] border border-slate-700">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Module Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              ENGINE V2.4
            </span>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Motor Oficial de Inteligência Artificial do HireGrid
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Persona: <strong className="text-slate-200">Engenheiro de People Analytics Sênior & Especialista em Operações de R&S</strong>. 
            Auditoria multi-tenant com segurança estrita via Supabase PostgreSQL RLS.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span>Escopo Isolado: <strong>{currentCompany.name.split(' ')[0]}</strong></span>
          </div>
        </div>
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 py-3">
        {PREMADE_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(item.prompt)}
              disabled={loading}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-indigo-500/50 text-left transition-all group disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Icon className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Módulo: {item.module}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[11px] font-semibold text-slate-400">
                {msg.sender === 'user' ? 'Gestor de RH / Usuário' : 'HireGrid AI Engine'}
              </span>
              <span className="text-[10px] text-slate-600">{msg.timestamp}</span>
              {msg.source && (
                <span className="text-[9px] font-mono bg-slate-800 text-indigo-300 px-1.5 py-0.2 rounded border border-slate-700">
                  {msg.source}
                </span>
              )}
            </div>

            <div
              className={`max-w-3xl rounded-xl p-4 shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 rounded-tl-none'
              }`}
            >
              {msg.sender === 'user' ? (
                <p className="text-sm leading-relaxed">{msg.text}</p>
              ) : (
                renderFormattedContent(msg.text, msg.id)
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 max-w-xl rounded-tl-none">
              <div className="flex items-center gap-2.5 text-indigo-400 text-xs font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando inteligência analítica com isolamento multi-tenant...</span>
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="h-2 bg-slate-800 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-slate-800 rounded animate-pulse w-5/6" />
                <div className="h-2 bg-slate-800 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="pt-3 border-t border-slate-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-lg"
        >
          <div className="pl-3 pr-2 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={`Consulte métricas de People Analytics, RLS, status de candidatos ou SQL para ${currentCompany.name}...`}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-xs rounded-lg transition-colors shadow-md shadow-indigo-600/30"
          >
            <span>Consultar</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-500" />
            Respostas estruturadas no padrão oficial: Módulo, Análise do Agente e Ações Recomendadas.
          </span>
          <span className="font-mono text-emerald-400">
            RLS: tenant_id = {currentTenantId}
          </span>
        </div>
      </div>
    </div>
  );
};
