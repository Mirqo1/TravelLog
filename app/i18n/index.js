import english from './en.json';
import slovak from './sk.json';

export const LANGUAGE_KEY = 'travellog/settings/language';
export const supportedLanguages = ['en', 'sk'];
let language = 'en';
export const getLanguage = () => language;
export const normalizeLanguage = value => supportedLanguages.includes(value) ? value : 'en';
export const setCurrentLanguage = value => { language = normalizeLanguage(value); };
const reverse = new Map(Object.entries(english).map(([key, value]) => [value, key]));
const authMessages = {
  'invalid-email': 'Neplatný email.',
  'invalid-credential': 'Email alebo heslo nie je správne.',
  'user-not-found': 'Email alebo heslo nie je správne.',
  'wrong-password': 'Email alebo heslo nie je správne.',
  'email-already-in-use': 'Tento email už má účet.',
  'weak-password': 'Heslo musí mať aspoň 6 znakov.',
  'too-many-requests': 'Príliš veľa pokusov. Skús to neskôr.',
  'network-request-failed': 'Skontroluj pripojenie na internet.',
  'operation-not-allowed': 'Prihlásenie týmto spôsobom nie je povolené.',
  'requires-recent-login': 'Pre túto zmenu sa prihlás znova.',
};
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.entries(english).filter(([key]) => /\{\d+\}/.test(key)).flatMap(([key, value]) =>
  [key, value].map(text => {
    const names = [...text.matchAll(/\{(\d+)\}/g)].map(match => match[1]);
    const pattern = text.split(/\{\d+\}/).map(escape).join('(.*?)');
    return { key, names, pattern: new RegExp(`^${pattern}$`, 's') };
  }));

// Only UI text and service messages call this function. Visit data is never translated.
export function translate(text, values, locale = language) {
  if (typeof text !== 'string') return text;
  const authCode = /^Firebase:.*\(auth\/([a-z-]+)\)/.exec(text)?.[1];
  if (authMessages[authCode]) text = authMessages[authCode];
  let key = Object.hasOwn(english, text) ? text : reverse.get(text);
  let params = values;
  if (!key && values == null) {
    for (const template of templates) {
      const match = template.pattern.exec(text);
      if (!match) continue;
      key = template.key;
      params = Object.fromEntries(template.names.map((name, index) => [name, match[index + 1]]));
      break;
    }
  }
  key ||= text;
  const result = normalizeLanguage(locale) === 'sk' ? slovak[key] ?? key : english[key] ?? key;
  return params ? result.replace(/\{(\d+)\}/g, (match, name) => params[name] == null ? match : String(params[name])) : result;
}
export const t = translate;
