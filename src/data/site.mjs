// Dados factuais da sociedade. Fonte: www.jma-advogados.com.pt (consultado em 21-11-2026).
// Tudo o que aqui está deve ser confirmado pelo escritório antes da publicação.

export const firm = {
  name: 'João Marcelo & Associados',
  legalName: 'João Marcelo & Associados – Sociedade de Advogados, R.L.',
  descriptor: 'Sociedade de Advogados, R.L.',
  city: 'Castelo Branco',
  phone: {
    display: '272 328 566',
    href: 'tel:+351272328566',
    // Indicação publicada pelo escritório, conservada sem alterações.
    costNote: 'custo chamada para a rede fixa nacional',
  },
  email: 'jma@jma-advogados.com',
  address: {
    street: 'Avenida 1º Maio 12, 2º',
    postalCode: '6000-086',
    locality: 'Castelo Branco',
    country: 'Portugal',
  },
  languages: ['Português', 'Inglês', 'Francês', 'Castelhano'],
  facebook: 'https://www.facebook.com/profile.php?id=100063614410648',
  complaintsBook: 'https://www.livroreclamacoes.pt/Inicio/',
};

export const mapsHref =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('Avenida 1º de Maio 12, 6000-086 Castelo Branco, Portugal');

export const nav = [
  { href: '/sociedade', label: 'Sociedade' },
  { href: '/areas-de-atuacao', label: 'Áreas de atuação' },
  { href: '/direito-administrativo', label: 'Direito Administrativo' },
  { href: '/contactos', label: 'Contactos' },
];

/**
 * Índice de áreas de atuação.
 * `published` regista a designação exata publicada no site anterior, para o mapa de correspondências.
 * `also` são expressões publicadas que partilham a entrada (pesquisáveis na página).
 * Agrupar não significa equivalência jurídica entre matérias.
 */
export const areaGroups = [
  {
    id: 'familia',
    summary: 'Direito da Família e Menores, divórcios e partilhas.',
    title: 'Família, divórcios e partilhas',
    items: [
      { label: 'Direito da Família e Menores', published: ['Direito Família e Menores'] },
      { label: 'Divórcios', published: ['Divórcios'] },
      { label: 'Partilhas', published: ['Partilhas'] },
    ],
  },
  {
    id: 'trabalho',
    summary: 'Direito do Trabalho, também designado Direito Laboral.',
    title: 'Trabalho',
    items: [
      {
        label: 'Direito do Trabalho',
        also: ['Direito Laboral'],
        published: ['Direito do Trabalho', 'Direito Laboral'],
      },
    ],
  },
  {
    id: 'civil',
    summary: 'Direito Privado e Direito Civil.',
    title: 'Direito civil e privado',
    items: [
      { label: 'Direito Privado', published: ['Direito Privado'] },
      { label: 'Direito Civil', published: ['Direito Penal e Civil'], note: 'separado de «Direito Penal e Civil»' },
    ],
  },
  {
    id: 'imobiliario',
    summary: 'Direito Imobiliário e Urbanístico. Registo e Notariado.',
    title: 'Imobiliário, registos e notariado',
    items: [
      { label: 'Direito Imobiliário e Urbanístico', published: ['Direito Imobiliário e Urbanístico'] },
      { label: 'Registo e Notariado', published: ['Registo e Notariado'] },
    ],
  },
  {
    id: 'empresas',
    summary: 'Direito Comercial, Direito Empresarial e Direito Bancário.',
    title: 'Empresas, comércio e banca',
    items: [
      { label: 'Direito Comercial', published: ['Direito Comercial'] },
      { label: 'Direito Empresarial', published: ['Direito Empresarial'] },
      { label: 'Direito Bancário', published: ['Direito Bancário'] },
    ],
  },
  {
    id: 'fiscal',
    summary: 'Direito Fiscal e Direito Tributário.',
    title: 'Fiscalidade',
    items: [
      { label: 'Direito Fiscal', published: ['Direito Fiscal'] },
      { label: 'Direito Tributário', published: ['Direito Tributário'] },
    ],
  },
  {
    id: 'penal',
    summary: 'Direito Penal e Direito Contraordenacional.',
    title: 'Penal e contraordenacional',
    items: [
      { label: 'Direito Penal', published: ['Direito Penal e Civil'], note: 'separado de «Direito Penal e Civil»' },
      { label: 'Direito Contraordenacional', published: ['Contraordenacional'] },
    ],
  },
  {
    id: 'contencioso',
    summary: 'Direito Contencioso e Arbitragem. Direito Processual.',
    title: 'Contencioso e arbitragem',
    items: [
      { label: 'Direito Contencioso e Arbitragem', published: ['Direito Contencioso e Arbitragem'] },
      { label: 'Direito Processual', published: ['Direito Processual'] },
    ],
  },
  {
    id: 'publico',
    summary: 'Direito Público, Direito Administrativo e Direito Ambiental.',
    title: 'Direito público e administrativo',
    items: [
      { label: 'Direito Público', published: ['Direito Público'] },
      { label: 'Direito Administrativo', published: ['Direito Administrativo'], href: '/direito-administrativo' },
      { label: 'Direito Ambiental', published: ['Direito Ambiental'] },
    ],
  },
];

/** Os seis domínios publicados na secção de Direito Administrativo, pela ordem publicada. */
export const adminDomains = [
  {
    id: 'contencioso-administrativo',
    title: 'Contencioso administrativo',
    text: 'Litígios em que intervém a Administração Pública, apreciados pelos tribunais administrativos.',
  },
  {
    id: 'privatizacoes',
    title: 'Privatizações',
    text: 'Processos de transferência para o setor privado de empresas ou participações detidas por entidades públicas.',
  },
  {
    id: 'energia-e-recursos-naturais',
    title: 'Energia e recursos naturais',
    text: 'Matérias de direito público relativas à energia e à utilização de recursos naturais.',
  },
  {
    id: 'urbanismo',
    title: 'Urbanismo',
    text: 'Planeamento do território e operações urbanísticas.',
  },
  {
    id: 'direito-do-ambiente',
    title: 'Direito do ambiente',
    text: 'Normas de proteção do ambiente aplicáveis a projetos e atividades.',
  },
  {
    id: 'contratacao-publica',
    title: 'Contratação pública',
    text: 'Procedimentos de formação e execução de contratos celebrados por entidades públicas.',
  },
];
