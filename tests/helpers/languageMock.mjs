// Keep existing feature tests in Slovak; localization has its own real-dictionary tests.
export const t = (text, values) => values && typeof text === 'string'
  ? text.replace(/\{(\d+)\}/g, (match, key) => values[key] == null ? match : String(values[key])) : text;
export const useLanguage = () => ({ language: 'sk', t });
