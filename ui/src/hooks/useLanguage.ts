import { useTranslation } from "react-i18next";

export function useLanguage() {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language.split("-")[0];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const isRTL = currentLang === "ar" || currentLang === "he";

  return {
    language: currentLang,
    t,
    i18n,
    changeLanguage,
    isRTL,
  };
}