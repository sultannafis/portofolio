'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLangStore } from '@/store';

type NestedTranslations = {
  [key: string]: string | NestedTranslations;
};

function flattenTranslations(obj: NestedTranslations, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'string') {
      result[fullKey] = obj[key] as string;
    } else {
      Object.assign(result, flattenTranslations(obj[key] as NestedTranslations, fullKey));
    }
  }
  return result;
}

export function useTranslation() {
  const { lang, setLang, setTranslations, t } = useLangStore();
  const [isLoaded, setIsLoaded] = useState(false);

  const loadTranslations = useCallback(async (language: string) => {
    try {
      const res = await fetch(`/locales/${language}/common.json`);
      const data = await res.json();
      const flat = flattenTranslations(data);
      setTranslations(flat);
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, [setTranslations]);

  useEffect(() => {
    loadTranslations(lang);
  }, [lang, loadTranslations]);

  const switchLanguage = useCallback((newLang: 'en' | 'id') => {
    setLang(newLang);
  }, [setLang]);

  return { t, lang, switchLanguage, isLoaded };
}
