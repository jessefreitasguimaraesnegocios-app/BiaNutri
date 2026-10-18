import React from 'react';

export interface DetalhesDescricaoAlimento {
  pesoGramas: string;
  porcao: string;
  preparo: string;
  ingredientes: string;
}

export const detalhesDescricaoVazios = (): DetalhesDescricaoAlimento => ({
  pesoGramas: '',
  porcao: '',
  preparo: '',
  ingredientes: '',
});

const textos = {
  pt: {
    titulo: 'Atalhos opcionais',
    peso: 'Informar peso em gramas',
    porcao: 'Informar tamanho da porção',
    preparo: 'Informar modo de preparo',
    ingredientes: 'Adicionar ingredientes e molho',
    pesoPlaceholder: 'Ex: 180',
    ingredientesPlaceholder: 'Ex: molho branco, queijo extra, azeite',
    gramas: 'g',
    porcoes: ['Pequena', 'Média', 'Grande', 'Individual', 'Prato cheio', 'Meia porção'],
    preparos: ['Grelhado', 'Frito', 'Assado', 'Cozido', 'Cru', 'Refogado', 'No vapor', 'Air fryer'],
  },
  en: {
    titulo: 'Optional shortcuts',
    peso: 'Enter weight in grams',
    porcao: 'Enter portion size',
    preparo: 'Enter cooking method',
    ingredientes: 'Add ingredients and sauce',
    pesoPlaceholder: 'E.g. 180',
    ingredientesPlaceholder: 'E.g. white sauce, extra cheese, olive oil',
    gramas: 'g',
    porcoes: ['Small', 'Medium', 'Large', 'Single serving', 'Full plate', 'Half portion'],
    preparos: ['Grilled', 'Fried', 'Baked', 'Boiled', 'Raw', 'Sautéed', 'Steamed', 'Air fryer'],
  },
} as const;

interface AtalhosDescricaoAlimentoProps {
  lang: 'pt' | 'en';
  detalhes: DetalhesDescricaoAlimento;
  onChange: (detalhes: DetalhesDescricaoAlimento) => void;
}

const AtalhosDescricaoAlimento: React.FC<AtalhosDescricaoAlimentoProps> = ({ lang, detalhes, onChange }) => {
  const t = textos[lang];
  const [pesoAberto, setPesoAberto] = React.useState(false);
  const [porcaoAberta, setPorcaoAberta] = React.useState(false);
  const [preparoAberto, setPreparoAberto] = React.useState(false);
  const [ingredientesAberto, setIngredientesAberto] = React.useState(false);

  const atualizar = (parcial: Partial<DetalhesDescricaoAlimento>) => {
    onChange({ ...detalhes, ...parcial });
  };

  const atalho = (
    aberto: boolean,
    rotulo: string,
    icone: string,
    aoClicar: () => void,
  ) => (
    <button
      type="button"
      onClick={aoClicar}
      className={`btn-vivo text-left text-xs font-semibold px-3 py-2.5 rounded-xl border ${
        aberto
          ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
      }`}
    >
      {icone} {rotulo}
    </button>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t.titulo}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {atalho(pesoAberto, t.peso, '⚖️', () => {
          setPesoAberto((v) => !v);
          if (pesoAberto) atualizar({ pesoGramas: '' });
        })}
        {atalho(porcaoAberta, t.porcao, '🍽️', () => {
          setPorcaoAberta((v) => !v);
          if (porcaoAberta) atualizar({ porcao: '' });
        })}
        {atalho(preparoAberto, t.preparo, '🥘', () => {
          setPreparoAberto((v) => !v);
          if (preparoAberto) atualizar({ preparo: '' });
        })}
        {atalho(ingredientesAberto, t.ingredientes, '🧂', () => {
          setIngredientesAberto((v) => !v);
          if (ingredientesAberto) atualizar({ ingredientes: '' });
        })}
      </div>

      {pesoAberto && (
        <label className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={detalhes.pesoGramas}
            onChange={(e) => atualizar({ pesoGramas: e.target.value })}
            placeholder={t.pesoPlaceholder}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
          />
          <span className="text-sm font-bold text-slate-500">{t.gramas}</span>
        </label>
      )}

      {porcaoAberta && (
        <div className="flex flex-wrap gap-2">
          {t.porcoes.map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => atualizar({ porcao: detalhes.porcao === opcao ? '' : opcao })}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                detalhes.porcao === opcao
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>
      )}

      {preparoAberto && (
        <div className="flex flex-wrap gap-2">
          {t.preparos.map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => atualizar({ preparo: detalhes.preparo === opcao ? '' : opcao })}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                detalhes.preparo === opcao
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>
      )}

      {ingredientesAberto && (
        <textarea
          value={detalhes.ingredientes}
          onChange={(e) => atualizar({ ingredientes: e.target.value })}
          placeholder={t.ingredientesPlaceholder}
          className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white h-20 resize-none placeholder:text-slate-400"
        />
      )}
    </div>
  );
};

export const montarDescricaoAnalise = (
  descricao: string,
  detalhes: DetalhesDescricaoAlimento,
): string => {
  const partes: string[] = [];
  const texto = descricao.trim();
  const peso = detalhes.pesoGramas.trim();
  const porcao = detalhes.porcao.trim();
  const preparo = detalhes.preparo.trim();
  const ingredientes = detalhes.ingredientes.trim();

  if (texto) partes.push(`Extra description: ${texto}`);
  if (peso) partes.push(`Weight in grams: ${peso} g. Calculate calories and macros for exactly this weight.`);
  if (porcao) partes.push(`Portion size: ${porcao}. Scale the estimate to this portion.`);
  if (preparo) partes.push(`Cooking method: ${preparo}. Use the calorie density of this method.`);
  if (ingredientes) partes.push(`Ingredients and sauce to include: ${ingredientes}. Add their calories even if hard to see.`);

  if (partes.length === 0) return '';

  return [
    'USER FACTS — these override the photo whenever they conflict:',
    ...partes,
    'Use every detail above. Do not ignore extra description, weight, portion, cooking method, ingredients, or sauce.',
  ].join('\n');
};

export default AtalhosDescricaoAlimento;
