/**
 * Alérgenos e termos para detecção em alimentos (base Anvisa e listas padrão).
 * Cada chave é um id usado nas restrições do usuário; o array são termos em pt/en para buscar em nome/descrição.
 */
export interface AllergenDefinition {
  id: string;
  keywordsPt: string[];
  keywordsEn: string[];
  labelPt: string;
  labelEn: string;
}

export const ALLERGEN_DEFINITIONS: AllergenDefinition[] = [
  {
    id: 'gluten',
    keywordsPt: ['glúten', 'gluten', 'trigo', 'wheat', 'cevada', 'barley', 'centeio', 'rye', 'aveia', 'oat', 'farinha', 'macarrão', 'macarrao', 'massa', 'massas', 'pão', 'pao', 'pães', 'paes', 'bread', 'pasta', 'noodle', 'baguette', 'torrada', 'croissant', 'bolo', 'bolacha', 'biscuit', 'cookie', 'farinha de trigo'],
    keywordsEn: ['gluten', 'wheat', 'barley', 'rye', 'flour', 'pasta', 'noodle', 'bread', 'baguette', 'toast', 'croissant', 'cake', 'cookie', 'biscuit', 'wheat flour'],
    labelPt: 'Glúten',
    labelEn: 'Gluten',
  },
  { id: 'lactose', keywordsPt: ['lactose', 'leite', 'milk', 'lácteo', 'dairy', 'queijo', 'cheese', 'manteiga', 'butter', 'creme', 'cream', 'soro'], keywordsEn: ['lactose', 'milk', 'dairy', 'cheese', 'butter', 'cream', 'whey'], labelPt: 'Lactose', labelEn: 'Lactose' },
  { id: 'sugar', keywordsPt: ['açúcar', 'acucar', 'sugar', 'açucarado', 'sweetened', 'mel', 'honey', 'xarope', 'syrup', 'glicose', 'glucose', 'frutose', 'fructose'], keywordsEn: ['sugar', 'sweetened', 'honey', 'syrup', 'glucose', 'fructose'], labelPt: 'Açúcar', labelEn: 'Sugar' },
  { id: 'nuts', keywordsPt: ['castanha', 'nut', 'amendoim', 'peanut', 'amêndoa', 'almond', 'noz', 'walnut', 'avelã', 'hazelnut', 'macadâmia', 'nozes'], keywordsEn: ['nut', 'peanut', 'almond', 'walnut', 'hazelnut', 'macadamia', 'tree nut'], labelPt: 'Castanhas/Nozes', labelEn: 'Nuts' },
  { id: 'shellfish', keywordsPt: ['crustáceo', 'crustaceo', 'shellfish', 'camarão', 'camarao', 'shrimp', 'caranguejo', 'crab', 'lagosta', 'lobster'], keywordsEn: ['shellfish', 'shrimp', 'crab', 'lobster', 'crustacean'], labelPt: 'Crustáceos', labelEn: 'Shellfish' },
  { id: 'soy', keywordsPt: ['soja', 'soy', 'soya'], keywordsEn: ['soy', 'soya'], labelPt: 'Soja', labelEn: 'Soy' },
  { id: 'egg', keywordsPt: ['ovo', 'egg', 'ovos', 'eggs'], keywordsEn: ['egg', 'eggs'], labelPt: 'Ovo', labelEn: 'Egg' },
  { id: 'fish', keywordsPt: ['peixe', 'fish', 'pescado'], keywordsEn: ['fish'], labelPt: 'Peixe', labelEn: 'Fish' },
];

/** Limite de açúcar (g) para considerar "alto" para diabéticos */
export const HIGH_SUGAR_GRAMS = 15;

/** Termos para alto sódio (hipertensos) - apenas quando há indicação clara de muito sódio/sal (evita alerta em "cozido com sal") */
export const HIGH_SODIUM_KEYWORDS_PT = ['sódio', 'sodio', 'salgado', 'muito sal', 'alto teor de sódio', 'rico em sódio'];
export const HIGH_SODIUM_KEYWORDS_EN = ['sodium', 'salted', 'high sodium', 'high salt', 'salt content'];
