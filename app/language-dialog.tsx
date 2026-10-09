"use client";

import { createPortal } from "react-dom";

type Props = { value: string; onSave: (value: string) => void; onClose: () => void };

export default function LanguageDialog({ value, onSave, onClose }: Props) {
  return createPortal(
    <div className="language-dialog-backdrop" onClick={onClose}>
      <section className="language-dialog" role="dialog" aria-modal="true" aria-labelledby="language-dialog-title" onClick={event => event.stopPropagation()}>
        <div className="language-dialog-head"><div><p>SETTINGS</p><h2 id="language-dialog-title">Language</h2></div><button type="button" aria-label="Close" onClick={onClose}>×</button></div>
        <p className="language-dialog-copy">Choose the language for Wildball.</p>
        <label htmlFor="app-language">Display language</label>
        <select id="app-language" defaultValue={value}>
          <optgroup label="Suggested">
            <option value="English (US)">English (US)</option><option value="বাংলা">বাংলা</option><option value="English (UK)">English (UK)</option><option value="हिन्दी">हिन्दी</option><option value="اردو">اردو</option><option value="Español">Español</option><option value="Français">Français</option><option value="Português (Brasil)">Português (Brasil)</option>
          </optgroup>
          <optgroup label="All languages">
            <option value="Afrikaans">Afrikaans</option><option value="አማርኛ">አማርኛ</option><option value="العربية">العربية</option><option value="Azərbaycan dili">Azərbaycan dili</option><option value="Башҡортса">Башҡортса</option><option value="Беларуская">Беларуская</option><option value="Bosanski">Bosanski</option><option value="Български">Български</option><option value="Català">Català</option><option value="中文（简体）">中文（简体）</option><option value="中文（繁體）">中文（繁體）</option><option value="Hrvatski">Hrvatski</option><option value="Čeština">Čeština</option><option value="Dansk">Dansk</option><option value="Nederlands">Nederlands</option><option value="Eesti">Eesti</option><option value="Filipino">Filipino</option><option value="Suomi">Suomi</option><option value="Galego">Galego</option><option value="Deutsch">Deutsch</option><option value="Ελληνικά">Ελληνικά</option><option value="ગુજરાતી">ગુજરાતી</option><option value="עברית">עברית</option><option value="Magyar">Magyar</option><option value="Bahasa Indonesia">Bahasa Indonesia</option><option value="Italiano">Italiano</option><option value="日本語">日本語</option><option value="ಕನ್ನಡ">ಕನ್ನಡ</option><option value="Қазақша">Қазақша</option><option value="한국어">한국어</option><option value="Kiswahili">Kiswahili</option><option value="Latviešu">Latviešu</option><option value="Lietuvių">Lietuvių</option><option value="മലയാളം">മലയാളം</option><option value="मराठी">मराठी</option><option value="Bahasa Melayu">Bahasa Melayu</option><option value="नेपाली">नेपाली</option><option value="Norsk">Norsk</option><option value="فارسی">فارسی</option><option value="Polski">Polski</option><option value="Português (Portugal)">Português (Portugal)</option><option value="ਪੰਜਾਬੀ">ਪੰਜਾਬੀ</option><option value="Română">Română</option><option value="Русский">Русский</option><option value="Српски">Српски</option><option value="Slovenčina">Slovenčina</option><option value="Slovenščina">Slovenščina</option><option value="Soomaali">Soomaali</option><option value="Svenska">Svenska</option><option value="தமிழ்">தமிழ்</option><option value="తెలుగు">తెలుగు</option><option value="ไทย">ไทย</option><option value="Türkçe">Türkçe</option><option value="Українська">Українська</option><option value="Tiếng Việt">Tiếng Việt</option><option value="Yorùbá">Yorùbá</option><option value="isiZulu">isiZulu</option>
          </optgroup>
        </select>
        <div className="language-dialog-actions"><button type="button" className="language-cancel" onClick={onClose}>Cancel</button><button type="button" className="language-save" onClick={event => onSave((event.currentTarget.closest(".language-dialog")?.querySelector("select") as HTMLSelectElement).value)}>Save changes</button></div>
      </section>
    </div>,
    document.body
  );
}
