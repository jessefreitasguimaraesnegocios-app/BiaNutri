import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { NutritionalInfo, MacroData, Language } from '../types';

interface NutritionChartProps {
  data: NutritionalInfo;
  lang: Language;
}

const NutritionChart: React.FC<NutritionChartProps> = ({ data, lang }) => {
  const chartData: MacroData[] = [
    { name: lang === 'pt' ? 'Proteínas' : 'Protein', value: data.protein, unit: 'g', color: '#22c55e' }, // Green
    { name: lang === 'pt' ? 'Carboidratos' : 'Carbs', value: data.carbs, unit: 'g', color: '#eab308' }, // Yellow
    { name: lang === 'pt' ? 'Gorduras' : 'Fat', value: data.fat, unit: 'g', color: '#ef4444' }, // Red
  ];

  return (
    <div className="relative w-full h-64 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData as any}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
            itemStyle={{ color: '#fff' }}
            formatter={(value: number) => [`${value}g`, '']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value, entry: any) => <span className="text-slate-600 dark:text-slate-300 ml-2 font-medium">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -translate-y-3">
        <div className="text-center">
          <span className="block text-3xl font-bold text-slate-800 dark:text-white">{data.calories}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-uppercase tracking-wider">KCAL</span>
        </div>
      </div>
    </div>
  );
};

export default NutritionChart;