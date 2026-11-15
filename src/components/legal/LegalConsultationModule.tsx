import React, { useState, useMemo, useRef } from 'react';
import legalCatalogData from '../../data/legalBaseCatalog.json';
import { supabase } from '../../lib/supabase';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  FileCode2,
  FileText,
  Filter,
  HelpCircle,
  Loader2,
  Scale,
  Search,
  Sparkles,
  Tag,
} from 'lucide-react';

interface LegalArticle {
  article: string;
  content: string;
}

interface LegalCatalogItem {
  code: string;
  stem: string;
  title: string;
  law_number: string;
  category: string;
  effective_year: number;
  summary: string;
  tags: string[];
  pages_count: number;
  articles_count: number;
  md_local_path: string;
  pdf_local_path: string;
  md_storage_path: string;
  pdf_storage_path: string;
  key_articles: LegalArticle[];
  markdown_excerpt: string;
}

interface QuickLegalFaq {
  id: string;
  question: string;
  category: string;
  lawRef: string;
  lawCode: string;
  searchKeyword: string;
  practicalAnswer: string;
}

const QUICK_LEGAL_FAQS: QuickLegalFaq[] = [
  {
    id: 'irrf-5000',
    question: 'Como funciona a isenção de IRRF até R$ 5.000,00 e a faixa até R$ 7.350,00?',
    category: 'Tributação da Folha',
    lawRef: 'Lei nº 15.270/2025 · Art. 3º-A',
    lawCode: 'LEI-15270',
    searchKeyword: '5.000,00',
    practicalAnswer:
      'A partir de janeiro de 2026 (Lei nº 15.270/2025), rendimentos tributáveis mensais até R$ 5.000,00 recebem redução de até R$ 312,89 sobre o imposto apurado na tabela progressiva, resultando em IRRF zero. Entre R$ 5.000,01 e R$ 7.350,00 aplica-se o redutor linear decrescente: R$ 978,62 - (0,133145 × rendimento tributável). Acima de R$ 7.350,00 segue a tabela progressiva normal.',
  },
  {
    id: 'ferias-fracionadas',
    question: 'As férias podem ser divididas em quantos períodos?',
    category: 'Férias',
    lawRef: 'CLT · Art. 134, § 1º (Redação Lei 13.467/2017)',
    lawCode: 'LEI-13467',
    searchKeyword: 'Art. 134',
    practicalAnswer:
      'Desde que haja concordância do empregado, as férias podem ser usufruídas em até 3 (três) períodos, sendo que um deles não poderá ser inferior a 14 dias corridos e os demais não poderão ser inferiores a 5 dias corridos cada um. É vedado o início das férias no período de dois dias que antecede feriado ou dia de repouso semanal remunerado (§ 3º).',
  },
  {
    id: 'horas-extras-banco',
    question: 'Qual o limite diário de horas extras e como funciona o banco de horas?',
    category: 'Jornada de Trabalho',
    lawRef: 'CLT · Art. 58 e Art. 59 (§§ 2º, 5º e 6º)',
    lawCode: 'LEI-13467',
    searchKeyword: 'Art. 59',
    practicalAnswer:
      'A duração diária do trabalho pode ser acrescida de horas extras em número não excedente de 2 (duas) horas diárias, com adicional mínimo de 50% sobre a hora normal (Art. 59, § 1º). O banco de horas pode ser pactuado por acordo individual escrito (compensação em até 6 meses) ou no mesmo mês por acordo tácito/escrito.',
  },
  {
    id: 'prazo-rescisao',
    question: 'Qual o prazo legal para pagamento das verbas rescisórias?',
    category: 'Rescisão Contratual',
    lawRef: 'CLT · Art. 477, § 6º',
    lawCode: 'LEI-13467',
    searchKeyword: 'Art. 477',
    practicalAnswer:
      'Independentemente do tipo de aviso prévio (trabalhado ou indenizado), a entrega ao empregado dos documentos que comprovem a comunicação da extinção contratual, bem como o pagamento dos valores constantes do instrumento de rescisão, deverão ser efetuados até 10 (dez) dias contados a partir do término do contrato, sob pena da multa de 1 salário do empregado (§ 8º).',
  },
  {
    id: 'acordo-trabalhista',
    question: 'Como funciona a demissão em comum acordo entre empresa e colaborador?',
    category: 'Rescisão Contratual',
    lawRef: 'CLT · Art. 484-A (Lei 13.467/2017)',
    lawCode: 'LEI-13467',
    searchKeyword: '484-A',
    practicalAnswer:
      'No distrato por mútuo acordo (Art. 484-A), são devidas pela metade (50%) o aviso prévio (se indenizado) e a indenização sobre o saldo do FGTS (20%, em vez de 40%), e na integralidade as demais verbas trabalhistas. O trabalhador pode movimentar até 80% do saldo de depósitos do FGTS, mas não tem direito ao Seguro-Desemprego.',
  },
  {
    id: 'pj-autonomo-clt',
    question: 'Quais os requisitos legais que diferenciam contratação PJ/Autônomo de vínculo CLT?',
    category: 'Contratos CLT x PJ',
    lawRef: 'CLT · Art. 3º e Art. 442-B',
    lawCode: 'LEI-13467',
    searchKeyword: '442-B',
    practicalAnswer:
      'O vínculo empregatício CLT exige a presença cumulativa de 4 requisitos (Art. 2º e 3º): pessoalidade, habitualidade (não eventualidade), onerosidade e subordinação jurídica. Já a contratação de autônomo/PJ (Art. 442-B), cumpridas as formalidades legais, com ou sem exclusividade, afasta a qualidade de empregado desde que não haja subordinação direta típica.',
  },
  {
    id: 'faltas-abonadas',
    question: 'Quais situações garantem falta abonada (sem desconto no salário)?',
    category: 'Jornada & Ausências',
    lawRef: 'CLT · Art. 473',
    lawCode: 'CLT-5452',
    searchKeyword: 'Art. 473',
    practicalAnswer:
      'Principais hipóteses do Art. 473 da CLT: até 2 dias consecutivos por falecimento de cônjuge, ascendente, descendente ou irmão; até 3 dias consecutivos em virtude de casamento; 5 dias em caso de nascimento de filho (licença-paternidade, ADCT Art. 10 § 1º); 1 dia a cada 12 meses para doação voluntária de sangue; até 2 dias para acompanhar consultas médicas de esposa/companheira gestante.',
  },
  {
    id: 'adicionais-insalubridade-periculosidade',
    question: 'Qual a base de cálculo de Insalubridade, Periculosidade e Adicional Noturno?',
    category: 'Remuneração & Adicionais',
    lawRef: 'CLT · Art. 73, Art. 192 e Art. 193',
    lawCode: 'CLT-5452',
    searchKeyword: 'Art. 73, Art. 192, Art. 193, Art. 457',
    practicalAnswer:
      'Insalubridade (Art. 192): 10% (grau mínimo), 20% (médio) ou 40% (máximo) sobre o salário-mínimo vigente. Periculosidade (Art. 193, § 1º): 30% sobre o salário-base contratual (sem acréscimos de gratificações ou prêmios). Adicional Noturno urbano (Art. 73): mínimo de 20% sobre a hora diurna para trabalho executado entre 22h e 5h.',
  },
  {
    id: 'rir-2018-ferias-abono-retencao',
    question: 'Qual o tratamento do RIR/2018 sobre Férias, Abono Pecuniário, 13º e Retenções na Fonte?',
    category: 'Tributação PF & PJ (RIR/2018)',
    lawRef: 'Decreto nº 9.580/2018 (RIR/2018)',
    lawCode: 'RIR-2018',
    searchKeyword: 'férias',
    practicalAnswer:
      'Pelo Regulamento do Imposto de Renda (RIR/2018 - Decreto nº 9.580/2018), a remuneração de férias gozadas acrescida do terço constitucional sofre tributação na fonte em separado dos salários do mês, admitidas as deduções legais (INSS e dependentes) ou o desconto simplificado + redutor da Lei 15.270/2025. Já o Abono Pecuniário de férias (venda de até 10 dias - Art. 143 CLT) e a dobra indenizatória de férias vencidas (Art. 137 CLT) são isentos/não tributáveis na fonte.',
  },
];

export const LegalConsultationModule: React.FC = () => {
  const catalog = legalCatalogData as LegalCatalogItem[];
  const [selectedLawCode, setSelectedLawCode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFaq, setSelectedFaq] = useState<QuickLegalFaq | null>(QUICK_LEGAL_FAQS[0]);
  const [viewMode, setViewMode] = useState<'articles' | 'markdown'>('articles');
  const [syncingStorage, setSyncingStorage] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const activeLaws = useMemo(() => {
    if (selectedLawCode === 'ALL') return catalog;
    return catalog.filter((law) => law.code === selectedLawCode);
  }, [catalog, selectedLawCode]);

  const matchingArticles = useMemo(() => {
    const normalizeDigits = (val: string) =>
      val.toLowerCase().replace(/(\d)\.(\d{3})\b/g, '$1$2');

    const q = searchQuery.trim().toLowerCase();
    const tokens = q
      .split(/\s+ou\s+|,|;/i)
      .map((t) => t.trim())
      .filter(Boolean);
    const results: Array<{
      lawCode: string;
      lawNumber: string;
      lawTitle: string;
      article: string;
      content: string;
    }> = [];

    for (const law of activeLaws) {
      for (const art of law.key_articles) {
        const artLabelNorm = normalizeDigits(art.article);
        const artContentNorm = normalizeDigits(art.content);
        const matchesQuery =
          tokens.length === 0 ||
          tokens.some((tok) => {
            const tokNorm = normalizeDigits(tok);
            return (
              art.article.toLowerCase().includes(tok) ||
              artLabelNorm.includes(tokNorm) ||
              art.content.toLowerCase().includes(tok) ||
              artContentNorm.includes(tokNorm) ||
              law.title.toLowerCase().includes(tok) ||
              law.tags.some((t) => t.toLowerCase().includes(tok))
            );
          });
        if (matchesQuery) {
          results.push({
            lawCode: law.code,
            lawNumber: law.law_number,
            lawTitle: law.title,
            article: art.article,
            content: art.content,
          });
        }
      }
    }
    return results.slice(0, 60);
  }, [activeLaws, searchQuery]);

  const handleSelectFaq = (faq: QuickLegalFaq) => {
    setSelectedFaq(faq);
    setSelectedLawCode(faq.lawCode);
    setSearchQuery(faq.searchKeyword);
    setViewMode('articles');
  };

  const handleSyncMarkdownToStorage = async () => {
    setSyncingStorage(true);
    setSyncFeedback(null);
    try {
      let uploadedCount = 0;
      for (const law of catalog) {
        const mdHeader = `---\ncode: "${law.code}"\ntitle: "${law.title}"\nlaw_number: "${law.law_number}"\n---\n\n# ${law.title} (${law.law_number})\n\n> ${law.summary}\n\n${law.markdown_excerpt}`;
        const blob = new Blob([mdHeader], { type: 'text/markdown;charset=utf-8' });
        const objectKey = `markdown/${law.stem}.md`;

        const { error: upErr } = await supabase.storage
          .from('ccbrh-legal-base')
          .upload(objectKey, blob, { upsert: true, contentType: 'text/markdown;charset=utf-8' });

        if (!upErr) {
          uploadedCount += 1;
        }

        await supabase.from('legal_documents').upsert(
          {
            code: law.code,
            title: law.title,
            law_number: law.law_number,
            category: law.category,
            summary: law.summary,
            markdown_content: law.markdown_excerpt,
            md_storage_path: `ccbrh-legal-base/${objectKey}`,
            pdf_storage_path: law.pdf_storage_path,
            articles_count: law.articles_count,
            effective_year: law.effective_year,
            tags: law.tags,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'code' }
        );
      }

      setSyncFeedback({
        type: 'success',
        text: `${uploadedCount} base(s) legal(is) em formato Markdown (.md) sincronizada(s) e indexada(s) com sucesso!`,
      });
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao sincronizar bases legais (.md).',
      });
    } finally {
      setSyncingStorage(false);
    }
  };

  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const offset = direction === 'left' ? -320 : 320;
    carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const highlightText = (text: string, term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return text;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === clean.toLowerCase() ? (
        <mark key={i} className="bg-[#f5a90e]/35 text-[#082175] font-bold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {syncFeedback && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncFeedback.text}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="underline ml-3">
            Fechar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548] tracking-wide">
            Compliance Trabalhista & Previdenciário · Base Oficial em Markdown (.md)
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] tracking-tight mt-1 flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-[#9F8548]" />
            <span>Consulta Jurídica Trabalhista</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consulta rápida sobre CLT (Decreto-Lei nº 5.452/1943), Reforma Trabalhista (Lei nº 13.467/2017) e Isenção de IRRF até R$ 5.000 (Lei nº 15.270/2025).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncMarkdownToStorage}
            disabled={syncingStorage}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#082175]/25 bg-[#E0F4F7]/60 hover:bg-[#E0F4F7] text-[#082175] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {syncingStorage ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5" />
            )}
            <span>{syncingStorage ? 'Sincronizando .md...' : 'Sincronizar Bases (.md)'}</span>
          </button>
        </div>
      </div>

      {/* Carrossel Compacto das Bases Legais (.md) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#9F8548]" />
            <span className="text-xs font-bold text-[#082175]">
              Acervo Normativo ({catalog.length} Bases Legais Indexadas)
            </span>
            {selectedLawCode !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedLawCode('ALL')}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#082175] transition-colors cursor-pointer"
              >
                Mostrar Todas
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 hidden sm:inline mr-1">
              Deslize ou navegue:
            </span>
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              title="Anterior"
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#082175] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              title="Próximo"
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#082175] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1"
        >
          {catalog.map((law) => {
            const isSelected = selectedLawCode === law.code;
            return (
              <button
                key={law.code}
                type="button"
                onClick={() =>
                  setSelectedLawCode((prev) => (prev === law.code ? 'ALL' : law.code))
                }
                className={`snap-start shrink-0 w-[265px] sm:w-[285px] text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#082175] text-white border-[#082175] shadow-sm'
                    : 'bg-slate-50/70 text-slate-800 border-slate-200/90 hover:border-[#082175]/50 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider truncate max-w-[165px] ${
                        isSelected
                          ? 'bg-[#f5a90e] text-[#082175]'
                          : 'bg-[#E0F4F7] text-[#03416A]'
                      }`}
                    >
                      {law.law_number}
                    </span>
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        isSelected ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {law.articles_count} arts.
                    </span>
                  </div>

                  <h3
                    className={`font-bold text-xs mt-2 line-clamp-1 ${
                      isSelected ? 'text-white' : 'text-[#082175]'
                    }`}
                  >
                    {law.title}
                  </h3>

                  <p
                    className={`text-[11px] mt-1 line-clamp-2 leading-snug ${
                      isSelected ? 'text-slate-200' : 'text-slate-600'
                    }`}
                  >
                    {law.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1 mt-2.5 pt-2 border-t border-current/10">
                  {law.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        isSelected
                          ? 'bg-white/15 text-white'
                          : 'bg-white border border-slate-200/80 text-slate-600'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Área Principal: Dúvidas Frequentes DP (Esquerda) + Buscador de Artigos e Markdown (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Dúvidas Trabalhistas Rápidas */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#9F8548]" />
              <h2 className="font-bold text-sm text-[#082175]">
                Respostas Rápidas para Dúvidas do DP
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">
              {QUICK_LEGAL_FAQS.length} temas
            </span>
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {QUICK_LEGAL_FAQS.map((faq) => {
              const active = selectedFaq?.id === faq.id;
              return (
                <button
                  key={faq.id}
                  type="button"
                  onClick={() => handleSelectFaq(faq)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#E0F4F7]/70 border-[#082175] shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                    <span className="text-[#9F8548] uppercase tracking-wider">
                      {faq.category}
                    </span>
                    <span className="text-[#03416A] font-mono">{faq.lawRef}</span>
                  </div>
                  <p className="text-xs font-bold text-[#082175] mt-1 leading-snug">
                    {faq.question}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedFaq && (
            <div className="p-4 rounded-xl bg-[#082175] text-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#f5a90e]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Parecer Prático Fundamentado</span>
                </span>
                <span className="text-[10px] font-mono text-slate-300">
                  {selectedFaq.lawRef}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white">{selectedFaq.question}</h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedFaq.practicalAnswer}
              </p>
            </div>
          )}
        </div>

        {/* Coluna Direita: Busca Instantânea nos Artigos (.md) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#082175]" />
              <h2 className="font-bold text-sm text-[#082175]">
                Base Normativa Indexada (.md)
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('articles')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'articles'
                      ? 'bg-[#082175] text-white'
                      : 'text-slate-600 hover:text-[#082175]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Por Artigo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('markdown')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'markdown'
                      ? 'bg-[#082175] text-white'
                      : 'text-slate-600 hover:text-[#082175]'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Leitura .MD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Busca e Filtro por Lei */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar artigo ou termo (ex: Art. 134, Art. 477, 5.000, férias, aviso prévio, PJ)..."
                className="w-full pl-9 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-700 font-semibold"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Filtrar diploma legal"
                value={selectedLawCode}
                onChange={(e) => setSelectedLawCode(e.target.value)}
                className="bg-transparent font-semibold text-[#082175] outline-none cursor-pointer"
              >
                <option value="ALL">Todas as Leis ({catalog.length})</option>
                {catalog.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.law_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Atalhos de Artigos Mais Consultados */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-medium flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" /> Atalhos:
            </span>
            {['Art. 58', 'Art. 59', 'Art. 134', 'Art. 442-B', 'Art. 473', 'Art. 477', 'Art. 482', '5.000,00'].map(
              (chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setSelectedLawCode('ALL');
                    setSearchQuery(chip);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-[#E0F4F7] text-[#03416A] font-mono font-semibold transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              )
            )}
          </div>

          {viewMode === 'articles' ? (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {matchingArticles.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <p className="font-semibold text-slate-600">
                    Nenhum artigo encontrado para "{searchQuery}".
                  </p>
                  <p>
                    Tente buscar pelo número do artigo (ex: <code>Art. 134</code>) ou clique em{' '}
                    <strong>Todas as Leis</strong>.
                  </p>
                </div>
              ) : (
                matchingArticles.map((item, idx) => (
                  <div
                    key={`${item.lawCode}-${item.article}-${idx}`}
                    className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:border-[#082175]/40 transition-colors space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs text-[#082175] bg-[#E0F4F7] px-2.5 py-0.5 rounded border border-[#c8e8ed]">
                        {highlightText(item.article, searchQuery)}
                      </span>
                      <span className="text-[11px] font-semibold text-[#9F8548]">
                        {item.lawNumber} · {item.lawTitle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed pt-1">
                      {highlightText(item.content, searchQuery)}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {activeLaws.map((law) => (
                <div
                  key={law.code}
                  className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 overflow-x-auto"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700 text-[#f5a90e]">
                    <span>{law.md_local_path}</span>
                    <span>{law.law_number}</span>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-200">
                    {law.markdown_excerpt.slice(0, 6000)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
