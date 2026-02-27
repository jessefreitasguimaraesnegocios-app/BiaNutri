import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Language, Translation, DietaryRestrictions } from '../types';
import { ALLERGEN_DEFINITIONS } from '../constants/allergens';

interface DietaryRestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  texts: Translation;
  onSave: (restrictions: DietaryRestrictions) => void;
  userId: string | null;
}

const DEFAULT_RESTRICTIONS: DietaryRestrictions = {
  hasAllergies: false,
  allergies: [],
  hasIntolerances: false,
  intolerances: [],
  isDiabetic: false,
  isHypertensive: false,
};

const DietaryRestrictionsModal: React.FC<DietaryRestrictionsModalProps> = ({
  isOpen,
  onClose,
  lang,
  texts,
  onSave,
  userId,
}) => {
  const [restrictions, setRestrictions] = useState<DietaryRestrictions>(DEFAULT_RESTRICTIONS);

  const storageKey = userId ? `biaNutriDietaryRestrictions_${userId}` : null;

  useEffect(() => {
    if (!storageKey || !isOpen) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as DietaryRestrictions;
        setRestrictions({
          hasAllergies: !!parsed.hasAllergies,
          allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
          hasIntolerances: !!parsed.hasIntolerances,
          intolerances: Array.isArray(parsed.intolerances) ? parsed.intolerances : [],
          isDiabetic: !!parsed.isDiabetic,
          isHypertensive: !!parsed.isHypertensive,
        });
      } catch {
        setRestrictions(DEFAULT_RESTRICTIONS);
      }
    } else {
      setRestrictions(DEFAULT_RESTRICTIONS);
    }
  }, [storageKey, isOpen]);

  const toggleAllergy = (id: string) => {
    setRestrictions((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(id)
        ? prev.allergies.filter((a) => a !== id)
        : [...prev.allergies, id],
    }));
  };

  const toggleIntolerance = (id: string) => {
    setRestrictions((prev) => ({
      ...prev,
      intolerances: prev.intolerances.includes(id)
        ? prev.intolerances.filter((i) => i !== id)
        : [...prev.intolerances, id],
    }));
  };

  const handleSave = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(restrictions));
      onSave(restrictions);
    }
    onClose();
  };

  if (!isOpen) return null;

  const label = (def: { labelPt: string; labelEn: string }) =>
    lang === 'pt' ? def.labelPt : def.labelEn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {texts.dietaryRestrictionsTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Alergias */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {texts.hasAllergies}
            </p>
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() =>
                  setRestrictions((prev) => ({
                    ...prev,
                    hasAllergies: true,
                  }))
                }
                className={`flex-1 py-2 rounded-lg font-medium border-2 transition-colors ${
                  restrictions.hasAllergies
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              >
                {texts.yes}
              </button>
              <button
                type="button"
                onClick={() =>
                  setRestrictions((prev) => ({
                    ...prev,
                    hasAllergies: false,
                    allergies: [],
                  }))
                }
                className={`flex-1 py-2 rounded-lg font-medium border-2 transition-colors ${
                  !restrictions.hasAllergies
                    ? 'bg-slate-200 dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              >
                {texts.no}
              </button>
            </div>
            {restrictions.hasAllergies && (
              <div className="flex flex-wrap gap-2 mt-2">
                {ALLERGEN_DEFINITIONS.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => toggleAllergy(def.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                      restrictions.allergies.includes(def.id)
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {label(def)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Intolerâncias */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {texts.hasIntolerances}
            </p>
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() =>
                  setRestrictions((prev) => ({
                    ...prev,
                    hasIntolerances: true,
                  }))
                }
                className={`flex-1 py-2 rounded-lg font-medium border-2 transition-colors ${
                  restrictions.hasIntolerances
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              >
                {texts.yes}
              </button>
              <button
                type="button"
                onClick={() =>
                  setRestrictions((prev) => ({
                    ...prev,
                    hasIntolerances: false,
                    intolerances: [],
                  }))
                }
                className={`flex-1 py-2 rounded-lg font-medium border-2 transition-colors ${
                  !restrictions.hasIntolerances
                    ? 'bg-slate-200 dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              >
                {texts.no}
              </button>
            </div>
            {restrictions.hasIntolerances && (
              <div className="flex flex-wrap gap-2 mt-2">
                {ALLERGEN_DEFINITIONS.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => toggleIntolerance(def.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                      restrictions.intolerances.includes(def.id)
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {label(def)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Diabético */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {texts.isDiabetic}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setRestrictions((prev) => ({ ...prev, isDiabetic: true }))
                }
                className={`flex-1 py-2 rounded-lg font-medium border-2 transition-colors ${
                  restrictions.isDiabetic
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              >
                {texts.yes}
              </button>
              <button
                type="button"
                onClick={() =>
                  setRestrictions((prev) => ({ ...prev, isDiabetic: false }))
                }
                className={`flex-1 py-2 rounded-lg font-medium border-2 transition-colors ${
                  !restrictions.isDiabetic
                    ? 'bg-slate-200 dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              >
                {texts.no}
              </button>
            </div>
          </div>

          {/* Hipertenso */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {texts.isHypertensive}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setRestrictions((prev) => ({ ...prev, isHypertensive: true }))
                }
                className={`flex-1 py-2 rounded-lg font-medium border-2 transition-colors ${
                  restrictions.isHypertensive
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              >
                {texts.yes}
              </button>
              <button
                type="button"
                onClick={() =>
                  setRestrictions((prev) => ({ ...prev, isHypertensive: false }))
                }
                className={`flex-1 py-2 rounded-lg font-medium border-2 transition-colors ${
                  !restrictions.isHypertensive
                    ? 'bg-slate-200 dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              >
                {texts.no}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
          >
            {texts.saveRestrictions}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DietaryRestrictionsModal;
