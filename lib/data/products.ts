import type { Product } from "@/lib/types";
import { getCategoryName } from "@/lib/data/categories";
import { normalizeText } from "@/lib/format";

export const products: Product[] = [
  {
    id: "p-01",
    name: "Batom Matte Vermelho Clássico",
    slug: "batom-matte-vermelho-classico",
    shortDescription: "Cor intensa com acabamento matte confortável.",
    description:
      "Um vermelho atemporal de altíssima pigmentação. A textura cremosa desliza sem pesar nos lábios e seca em um acabamento matte veludo de longa duração, com vitamina E para evitar a sensação de ressecamento.",
    price: 39.9,
    creditPrice: 42.9,
    image: "/images/produtos/batom-matte-vermelho.png",
    category: "maquiagem",
    brand: "Cris Martins Studio",
    keywords: ["batom", "labial", "matte", "vermelho", "boca"],
    variations: ["Vermelho Clássico", "Rosé Nude", "Vinho Profundo"],
    featured: true,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-07-28",
  },
  {
    id: "p-02",
    name: "Base Fluida Alta Cobertura",
    slug: "base-fluida-alta-cobertura",
    shortDescription: "Cobertura construível com efeito natural.",
    description:
      "Base de textura fluida que se adapta à pele e oferece cobertura média a alta sem marcar linhas de expressão. Controla a oleosidade por até 12 horas e deixa um acabamento acetinado uniforme.",
    price: 89.9,
    creditPrice: 95.9,
    image: "/images/produtos/base-fluida-alta-cobertura.png",
    category: "maquiagem",
    brand: "Cris Martins Studio",
    keywords: ["base", "foundation", "pele", "cobertura", "rosto"],
    variations: ["Claro 20", "Médio 40", "Escuro 60"],
    featured: true,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-07-20",
  },
  {
    id: "p-03",
    name: "Paleta de Sombras Nude",
    slug: "paleta-de-sombras-nude",
    shortDescription: "Doze tons neutros do dia à noite.",
    description:
      "Paleta com doze tons neutros entre mattes, acetinados e cintilantes. A fórmula de alta pigmentação permite esfumar com facilidade e construir desde o olhar mais discreto até o mais marcante.",
    price: 129.9,
    creditPrice: 139.9,
    image: "/images/produtos/paleta-de-sombras-nude.png",
    category: "maquiagem",
    brand: "Cris Martins Studio",
    keywords: ["sombra", "paleta", "olhos", "nude", "esfumado"],
    featured: true,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-08-04",
  },
  {
    id: "p-04",
    name: "Máscara de Cílios Volume",
    slug: "mascara-de-cilios-volume",
    shortDescription: "Volume imediato sem borrar.",
    description:
      "Escova de cerdas curvas que separa e alonga cada fio. A fórmula à prova de umidade entrega volume desde a primeira camada e permanece intacta durante todo o dia.",
    price: 54.9,
    creditPrice: 59.9,
    image: "/images/produtos/mascara-de-cilios-volume.png",
    category: "maquiagem",
    brand: "Cris Martins Studio",
    keywords: ["máscara", "cílios", "volume", "rímel", "olhos"],
    featured: false,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-06-30",
  },
  {
    id: "p-05",
    name: "Blush Compacto Pêssego",
    slug: "blush-compacto-pessego",
    shortDescription: "Rubor natural com brilho suave.",
    description:
      "Blush compacto de textura sedosa que se mistura à pele com naturalidade. O tom pêssego ilumina o rosto e funciona em diferentes subtons, com fixação de longa duração.",
    price: 44.9,
    creditPrice: 47.9,
    image: "/images/produtos/blush-compacto-pessego.png",
    category: "maquiagem",
    brand: "Cris Martins Studio",
    keywords: ["blush", "rubor", "pêssego", "bochecha", "rosto"],
    featured: false,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-05-18",
  },
  {
    id: "p-06",
    name: "Perfume Floral Elegance",
    slug: "perfume-floral-elegance",
    shortDescription: "Fragrância delicada e marcante.",
    description:
      "Eau de parfum floral construído sobre notas de peônia e jasmim, com fundo amadeirado de âmbar e musk. Uma assinatura feminina sofisticada com até 10 horas de fixação.",
    price: 189.9,
    creditPrice: 204.9,
    image: "/images/produtos/perfume-floral-elegance.png",
    category: "perfumes",
    brand: "Maison Elegance",
    keywords: ["perfume", "floral", "fragrância", "eau de parfum", "feminino"],
    variations: ["50ml", "100ml"],
    featured: true,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-08-09",
  },
  {
    id: "p-07",
    name: "Eau de Parfum Âmbar Noir",
    slug: "eau-de-parfum-ambar-noir",
    shortDescription: "Amadeirado intenso para a noite.",
    description:
      "Composição oriental com abertura de bergamota, coração de íris e fundo profundo de âmbar, baunilha e patchouli. Presença marcante, ideal para eventos e noites especiais.",
    price: 249.9,
    creditPrice: 269.9,
    image: "/images/produtos/eau-de-parfum-ambar-noir.png",
    category: "perfumes",
    brand: "Maison Elegance",
    keywords: ["perfume", "âmbar", "amadeirado", "noite", "intenso"],
    variations: ["50ml", "100ml"],
    featured: true,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-08-12",
  },
  {
    id: "p-08",
    name: "Body Splash Baunilha",
    slug: "body-splash-baunilha",
    shortDescription: "Perfume leve para o dia a dia.",
    description:
      "Body splash de baunilha cremosa com toque de amêndoas. Refrescante e discreto, pode ser reaplicado ao longo do dia e combina perfeitamente com o creme corporal da mesma linha.",
    price: 59.9,
    creditPrice: 64.9,
    image: "/images/produtos/body-splash-baunilha.png",
    category: "perfumes",
    brand: "Cris Martins Studio",
    keywords: ["body splash", "baunilha", "perfume", "corpo", "colônia"],
    featured: false,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-06-12",
  },
  {
    id: "p-09",
    name: "Perfume Cítrico Fresh",
    slug: "perfume-citrico-fresh",
    shortDescription: "Frescor cítrico e sofisticado.",
    description:
      "Fragrância vibrante com limão siciliano, bergamota e notas verdes de chá branco. Leve e elegante, perfeita para o clima quente e para o uso diário.",
    price: 159.9,
    creditPrice: 174.9,
    image: "/images/produtos/perfume-citrico-fresh.png",
    category: "perfumes",
    brand: "Maison Elegance",
    keywords: ["perfume", "cítrico", "fresh", "leve", "verão"],
    featured: false,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-05-30",
  },
  {
    id: "p-10",
    name: "Óleo Capilar Reparador",
    slug: "oleo-capilar-reparador",
    shortDescription: "Brilho e reparação das pontas.",
    description:
      "Blend de óleos de argan, macadâmia e coco que sela as cutículas, reduz o frizz e devolve brilho aos fios. Textura seca, absorção rápida e sem efeito pesado.",
    price: 74.9,
    creditPrice: 79.9,
    image: "/images/produtos/oleo-capilar-reparador.png",
    category: "cabelos",
    brand: "Atelier Capilar",
    keywords: ["óleo", "cabelo", "reparador", "frizz", "brilho", "finalizador"],
    featured: true,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-08-14",
  },
  {
    id: "p-11",
    name: "Máscara de Nutrição Intensa",
    slug: "mascara-de-nutricao-intensa",
    shortDescription: "Nutrição profunda em 5 minutos.",
    description:
      "Máscara de tratamento com manteiga de karité e proteínas da seda. Recupera fios secos e quimicamente tratados, deixando o cabelo macio e maleável desde a primeira aplicação.",
    price: 89.9,
    creditPrice: 95.9,
    image: "/images/produtos/mascara-nutricao-intensa.png",
    category: "cabelos",
    brand: "Atelier Capilar",
    keywords: ["máscara", "cabelo", "nutrição", "hidratação", "tratamento"],
    featured: false,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-07-02",
  },
  {
    id: "p-12",
    name: "Leave-in Protetor Térmico",
    slug: "leave-in-protetor-termico",
    shortDescription: "Proteção contra o calor até 220°C.",
    description:
      "Spray leve que protege os fios do secador, chapinha e babyliss. Facilita o desembaraço, controla o volume e não deixa resíduo.",
    price: 64.9,
    creditPrice: 69.9,
    image: "/images/produtos/leave-in-protetor-termico.png",
    category: "cabelos",
    brand: "Atelier Capilar",
    keywords: ["leave-in", "protetor térmico", "cabelo", "spray", "chapinha"],
    featured: false,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-04-22",
  },
  {
    id: "p-13",
    name: "Sérum Facial Vitamina C",
    slug: "serum-facial-vitamina-c",
    shortDescription: "Viço e uniformidade para a pele.",
    description:
      "Sérum com 10% de vitamina C estabilizada e ácido ferúlico. Reduz manchas, ilumina o tom da pele e protege contra os radicais livres. Uso diário pela manhã, antes do protetor solar.",
    price: 119.9,
    creditPrice: 129.9,
    image: "/images/produtos/serum-vitamina-c.png",
    category: "skincare",
    brand: "Dermalab",
    keywords: ["sérum", "vitamina c", "skincare", "manchas", "viço", "rosto"],
    featured: true,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-08-15",
  },
  {
    id: "p-14",
    name: "Hidratante Facial Ácido Hialurônico",
    slug: "hidratante-facial-acido-hialuronico",
    shortDescription: "Hidratação leve por 24 horas.",
    description:
      "Gel-creme com três pesos moleculares de ácido hialurônico que hidratam em diferentes camadas da pele. Textura fresca, rápida absorção e ideal sob a maquiagem.",
    price: 99.9,
    creditPrice: 109.9,
    image: "/images/produtos/hidratante-facial-acido-hialuronico.png",
    category: "skincare",
    brand: "Dermalab",
    keywords: [
      "hidratante",
      "ácido hialurônico",
      "skincare",
      "gel creme",
      "rosto",
    ],
    featured: false,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-07-11",
  },
  {
    id: "p-15",
    name: "Protetor Solar Toque Seco FPS 50",
    slug: "protetor-solar-toque-seco-fps-50",
    shortDescription: "Alta proteção com toque seco.",
    description:
      "Protetor solar facial FPS 50 com acabamento invisível e efeito matificante. Não deixa resíduo branco e pode ser usado como base para a maquiagem.",
    price: 84.9,
    creditPrice: 92.9,
    image: "/images/produtos/protetor-solar-toque-seco.png",
    category: "skincare",
    brand: "Dermalab",
    keywords: ["protetor solar", "fps 50", "skincare", "toque seco", "facial"],
    featured: false,
    bestSeller: false,
    available: false,
    active: true,
    createdAt: "2026-06-05",
  },
  {
    id: "p-16",
    name: "Água Micelar Suave",
    slug: "agua-micelar-suave",
    shortDescription: "Limpeza delicada sem enxágue.",
    description:
      "Remove maquiagem, oleosidade e impurezas em um único passo, sem agredir a barreira cutânea. Fórmula sem perfume, indicada até para pele sensível.",
    price: 49.9,
    creditPrice: 54.9,
    image: "/images/produtos/agua-micelar-suave.png",
    category: "skincare",
    brand: "Dermalab",
    keywords: [
      "água micelar",
      "limpeza",
      "demaquilante",
      "skincare",
      "pele sensível",
    ],
    featured: false,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-03-28",
  },
  {
    id: "p-17",
    name: "Creme Corporal Karité",
    slug: "creme-corporal-karite",
    shortDescription: "Hidratação rica e prolongada.",
    description:
      "Creme corporal denso com manteiga de karité e óleo de amêndoas. Restaura a maciez de pernas, braços e áreas mais secas, com perfume suave e envolvente.",
    price: 69.9,
    creditPrice: 74.9,
    image: "/images/produtos/creme-corporal-karite.png",
    category: "corpo-e-banho",
    brand: "Cris Martins Studio",
    keywords: ["creme", "corporal", "karité", "hidratante", "corpo"],
    featured: true,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-08-01",
  },
  {
    id: "p-18",
    name: "Sabonete Líquido de Rosas",
    slug: "sabonete-liquido-de-rosas",
    shortDescription: "Espuma delicada e perfumada.",
    description:
      "Sabonete líquido com extrato de rosas e glicerina vegetal. Limpa suavemente e mantém a pele hidratada, deixando um perfume floral discreto após o banho.",
    price: 42.9,
    creditPrice: 46.9,
    image: "/images/produtos/sabonete-liquido-rosas.png",
    category: "corpo-e-banho",
    brand: "Cris Martins Studio",
    keywords: ["sabonete", "líquido", "rosas", "banho", "corpo"],
    featured: false,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-05-09",
  },
  {
    id: "p-19",
    name: "Kit de Pincéis Profissional",
    slug: "kit-de-pinceis-profissional",
    shortDescription: "Doze pincéis para rosto e olhos.",
    description:
      "Kit com doze pincéis de cerdas sintéticas ultramacias para base, pó, blush, contorno e olhos. Cabos em rosé com virola dourada e estojo para transporte.",
    price: 179.9,
    creditPrice: 194.9,
    image: "/images/produtos/kit-pinceis-profissional.png",
    category: "acessorios",
    brand: "Cris Martins Studio",
    keywords: ["pincéis", "kit", "acessórios", "maquiagem", "brushes"],
    featured: true,
    bestSeller: true,
    available: true,
    active: true,
    createdAt: "2026-08-16",
  },
  {
    id: "p-20",
    name: "Necessaire Rosé",
    slug: "necessaire-rose",
    shortDescription: "Organização com acabamento premium.",
    description:
      "Necessaire matelassê em cetim rosé com zíper dourado e forro impermeável. Tamanho ideal para viagens e para manter os essenciais sempre organizados.",
    price: 89.9,
    creditPrice: 97.9,
    image: "/images/produtos/necessaire-rose.png",
    category: "acessorios",
    brand: "Cris Martins Studio",
    keywords: ["necessaire", "organizador", "acessórios", "viagem", "rosé"],
    featured: false,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-07-24",
  },
  {
    id: "p-21",
    name: "Kit Presente Completo",
    slug: "kit-presente-completo",
    shortDescription: "Uma seleção especial pronta para presentear.",
    description:
      "Kit presenteável com uma seleção de itens pensados para surpreender em datas especiais. Uma opção prática, elegante e pronta para transformar o presente em uma experiência completa.",
    price: 149.9,
    creditPrice: 159.9,
    image: "/images/produtos/kit-presente-completo.png",
    category: "acessorios",
    brand: "Cris Martins Studio",
    keywords: ["kit", "presente", "presenteável", "combo", "especial"],
    featured: false,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-07-15",
  },
  {
    id: "p-22",
    name: "Bolsa Feminina Rosé",
    slug: "bolsa-feminina-rose",
    shortDescription: "Elegância e praticidade para todos os momentos.",
    description:
      "Bolsa feminina em acabamento rosé com design elegante e versátil. Espaço interno organizado e tamanho ideal para acompanhar a rotina ou compor um presente especial.",
    price: 119.9,
    creditPrice: 129.9,
    image: "/images/produtos/bolsa-feminina-rose..png",
    category: "acessorios",
    brand: "Cris Martins Studio",
    keywords: ["bolsa", "acessórios", "feminino", "presente", "rosé"],
    featured: false,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-07-10",
  },
  {
    id: "p-23",
    name: "Urso Presenteável",
    slug: "urso-presenteavel",
    shortDescription: "Um carinho especial para tornar o presente inesquecível.",
    description:
      "Urso de pelúcia com acabamento delicado, pensado para complementar kits e presentes especiais. Uma escolha afetiva para aniversários e outras ocasiões.",
    price: 89.9,
    creditPrice: 97.9,
    image: "/images/produtos/urso-presenteavel..png",
    category: "acessorios",
    brand: "Cris Martins Studio",
    keywords: ["urso", "pelúcia", "presente", "kit", "romântico"],
    featured: false,
    bestSeller: false,
    available: true,
    active: true,
    createdAt: "2026-07-05",
  },

];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}

export function getProductsByCategory(categorySlug: string) {
  return products.filter(
    (product) => product.category === categorySlug && product.active,
  );
}

export const featuredProducts = products.filter(
  (product) => product.featured && product.active,
);

export const bestSellers = products.filter(
  (product) => product.bestSeller && product.active,
);

export const newArrivals = [...products]
  .filter((product) => product.active)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, 8);

/**
 * Busca global no catálogo. Cada palavra digitada precisa aparecer em algum campo
 * do produto, e o peso do campo onde ela apareceu define a ordem: nome primeiro,
 * depois categoria, marca e descrição curta.
 */
export function searchProducts(query: string) {
  const term = normalizeText(query);
  if (!term) return [];

  const words = term.split(/\s+/);

  const scored = products.flatMap((product) => {
    if (!product.active) return [];

    const fields = {
      name: normalizeText(product.name),
      category: normalizeText(
        `${getCategoryName(product.category)} ${product.category}`,
      ),
      brand: normalizeText(product.brand),
      shortDescription: normalizeText(product.shortDescription),
      extra: normalizeText(
        `${product.description} ${product.keywords.join(" ")}`,
      ),
    };

    let score = 0;

    for (const word of words) {
      let wordScore = 0;
      if (fields.name.startsWith(word)) wordScore = 120;
      else if (fields.name.includes(word)) wordScore = 90;
      else if (fields.category.includes(word)) wordScore = 60;
      else if (fields.brand.includes(word)) wordScore = 45;
      else if (fields.shortDescription.includes(word)) wordScore = 30;
      else if (fields.extra.includes(word)) wordScore = 12;

      // Palavra que não aparece em nenhum campo descarta o produto.
      if (wordScore === 0) return [];
      score += wordScore;
    }

    return [{ product, score }];
  });

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product.name.localeCompare(b.product.name, "pt-BR"),
    )
    .map((entry) => entry.product);
}
export const giftProducts = products.filter(
  (product) =>
    product.active &&
    product.available &&
    (
      product.keywords.includes("presente") ||
      product.keywords.includes("kit") ||
      product.keywords.includes("bolsa") ||
      product.keywords.includes("urso")
    )
);