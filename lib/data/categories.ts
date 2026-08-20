import type { Category } from '@/lib/types'
import { normalizeText } from '@/lib/format'

export const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Maquiagem',
    slug: 'maquiagem',
    description: 'Encontre produtos para realçar sua beleza.',
    image: '/images/categorias/maquiagem.png',
    active: true,
  },
  {
    id: 'cat-2',
    name: 'Perfumes',
    slug: 'perfumes',
    description: 'Fragrâncias marcantes para cada momento do seu dia.',
    image: '/images/categorias/perfumes.png',
    active: true,
  },
  {
    id: 'cat-3',
    name: 'Cabelos',
    slug: 'cabelos',
    description: 'Tratamento e finalização para fios saudáveis e brilhantes.',
    image: '/images/categorias/cabelos.png',
    active: true,
  },
  {
    id: 'cat-4',
    name: 'Skincare',
    slug: 'skincare',
    description: 'Rotinas de cuidado facial para uma pele equilibrada.',
    image: '/images/categorias/skincare.png',
    active: true,
  },
  {
    id: 'cat-5',
    name: 'Corpo e Banho',
    slug: 'corpo-e-banho',
    description: 'Hidratação e perfume para o seu ritual diário.',
    image: '/images/categorias/corpo-e-banho.png',
    active: true,
  },
  {
    id: 'cat-6',
    name: 'Acessórios',
    slug: 'acessorios',
    description: 'Pincéis, necessaires e essenciais para a sua rotina.',
    image: '/images/categorias/acessorios.png',
    active: true,
  },
]

export function getCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug)
}

export function getCategoryName(slug: string) {
  return getCategoryBySlug(slug)?.name ?? slug
}

export function searchCategories(query: string) {
  const term = normalizeText(query)
  if (!term) return []

  return categories.filter((category) => {
    if (!category.active) return false
    const haystack = normalizeText(
      `${category.name} ${category.slug} ${category.description}`.replace(/-/g, ' '),
    )
    return term.split(/\s+/).every((word) => haystack.includes(word))
  })
}
