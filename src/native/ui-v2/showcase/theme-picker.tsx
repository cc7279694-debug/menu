import { v2Themes, type V2Theme } from "../appearance";

export function ThemePicker({ theme, onChange }: { theme: V2Theme; onChange: (theme: V2Theme) => void }) {
  return <fieldset className="v2-theme-picker">
    <legend>外观主题</legend>
    <div className="v2-theme-options">
      {v2Themes.map(({ id, label }) => <label key={id} className="v2-theme-option">
        <span className="recipio-ui-v2 v2-theme-swatch" data-v2-theme={id} aria-hidden="true"><i /><i /><i /></span>
        <span>{label}</span>
        <input type="radio" name="v2-appearance" value={id} checked={theme === id} onChange={() => onChange(id)} />
      </label>)}
    </div>
  </fieldset>;
}
