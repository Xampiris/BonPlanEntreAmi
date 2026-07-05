// Liste fixe des catégories disponibles (cahier des charges §4.1).
export const CATEGORIES = [
  { label: 'Informatique & Tech', emoji: '🖥️', color: 'blue' },
  { label: 'Jeux & Rétrogaming', emoji: '🎮', color: 'purple' },
  { label: 'Bricolage & DIY', emoji: '🔧', color: 'orange' },
  { label: 'Cuisine & Recettes', emoji: '🍳', color: 'rose' },
  { label: 'Bons plans & Sorties', emoji: '🌍', color: 'emerald' },
  { label: 'Auto & Mécanique', emoji: '🚗', color: 'slate' },
  { label: 'Créativité & Art', emoji: '🎨', color: 'pink' },
  { label: 'Autre', emoji: '📦', color: 'amber' },
];

export function getCategory(label) {
  return CATEGORIES.find((c) => c.label === label) || CATEGORIES[CATEGORIES.length - 1];
}

export function badgeClasses(color) {
  return `bg-${color}-100 text-${color}-700 border-${color}-200 dark:bg-${color}-500/10 dark:text-${color}-300 dark:border-${color}-500/30`;
}

export function dotClasses(color) {
  return `bg-${color}-500`;
}
