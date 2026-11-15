export const CCB_LOGO_URL =
  'https://media.base44.com/images/public/6a52c7e1c55bcfd0507f8b31/8c104df66_CCB_Apresentacao3.png';

export const HERO_IMAGE = new URL(
  '../../assets/images/hero_ccb_team_1794748843429.jpg',
  import.meta.url
).href;
export const CASE_IMAGE = new URL(
  '../../assets/images/case_emporio_retail_1794748843298.jpg',
  import.meta.url
).href;
export const PARTNER_CRISTINA_IMAGE = new URL(
  '../../assets/images/partner_cristina_1794748843281.png',
  import.meta.url
).href;
export const PARTNER_DEUSA_IMAGE = new URL(
  '../../assets/images/partner_deusa_1794748844320.png',
  import.meta.url
).href;
export const BLOG_GESTAO_PESSOAS_IMAGE = new URL(
  '../../assets/images/gestaopessoas.jpg',
  import.meta.url
).href;
export const BLOG_LEGISLACAO_IMAGE = new URL(
  '../../assets/images/legislacaotrabalhista.jpg',
  import.meta.url
).href;
export const BLOG_RECRUTAMENTO_IMAGE = new URL(
  '../../assets/images/recrutamento.jpg',
  import.meta.url
).href;

export interface BlogArticle {
  title: string;
  preview: string;
  img: string;
  readTime: string;
  date: string;
  content: string[];
}

export const BLOG_POSTS: BlogArticle[] = [
  {
    title: 'Gestão de pessoas',
    preview: 'Estratégias para reter talentos e construir equipes engajadas em 2026.',
    img: BLOG_GESTAO_PESSOAS_IMAGE,
    readTime: '4 min de leitura',
    date: 'Março 2026',
    content: [
      'Reter profissionais qualificados exige mais do que pacotes salariais competitivos. Empresas que constroem ambientes de confiança e clareza de propósito reduzem drasticamente o turnover nos primeiros 12 meses de contratação.',
      'Na metodologia Fazer Parte da ccbrh, o alinhamento cultural começa antes mesmo da entrevista técnica: mapeamos a rotina real da equipe, o estilo de liderança e as metas da operação para conectar pessoas que desejam permanecer e crescer na empresa.',
      'Acompanhar indicadores de quadro de colaboradores, distribuição salarial e feedbacks estruturados permite agir preventivamente antes que a perda de talentos impacte os resultados do negócio.',
    ],
  },
  {
    title: 'Legislação trabalhista',
    preview: 'Principais mudanças que toda empresa precisa saber para ficar em dia.',
    img: BLOG_LEGISLACAO_IMAGE,
    readTime: '5 min de leitura',
    date: 'Fevereiro 2026',
    content: [
      'Manter o Departamento Pessoal em conformidade evita passivos trabalhistas, autuações e custos imprevistos que comprometem a previsibilidade financeira da organização.',
      'A padronização do dossiê admissional — com conferência rigorosa de RG, CPF, comprovante de residência e registros contratuais dentro do prazo — é o primeiro pilar para uma folha de pagamento segura e auditável.',
      'Com o apoio consultivo e operacional da ccbrh, sua empresa estrutura rotinas de admissão, controle de férias e folha com respaldo jurídico e agilidade digital.',
    ],
  },
  {
    title: 'Recrutamento',
    preview: 'Como atrair e selecionar os melhores profissionais para sua empresa.',
    img: BLOG_RECRUTAMENTO_IMAGE,
    readTime: '4 min de leitura',
    date: 'Janeiro 2026',
    content: [
      'Contratar não é apenas preencher uma vaga em aberto: é encontrar quem a empresa gostaria de ter na equipe no longo prazo.',
      'Estruturar o funil de seleção em etapas claras — triagem aderente à cultura, entrevista comportamental, proposta transparente e coleta digital de documentos — reduz o tempo de fechamento de vagas e eleva a qualidade das contratações.',
      'No caso do Empório Varanda, a combinação entre entendimento profundo da operação e metodologia estruturada permitiu preencher 100 posições para duas novas unidades com excelência e rapidez.',
    ],
  },
];
