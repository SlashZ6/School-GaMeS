
import React, { createContext, useContext, useState, ReactNode, PropsWithChildren } from 'react';
import { Language } from '../types';
import { DICTIONARY } from '../constants';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => any;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: PropsWithChildren<{}>) => {
  const [lang, setLang] = useState<Language>(Language.EN);

  const t = (path: string) => {
    const keys = path.split('.');
    let value: any = DICTIONARY[lang];
    for (const key of keys) {
      if (value && value[key]) {
        value = value[key];
      } else {
        // Fallback or key string
        return path;
      }
    }
    return value;
  };

  const dir = lang === Language.AR ? 'rtl' : 'ltr';
  const fontClass = lang === Language.AR ? 'font-arabic' : 'font-latin';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      <div dir={dir} className={`min-h-screen w-full transition-all duration-300 ${fontClass}`}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
