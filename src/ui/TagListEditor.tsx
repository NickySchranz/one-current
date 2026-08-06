import { useState } from "react";
import { useT } from "@/i18n/i18n";

type Props = {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: readonly string[];
  placeholder?: string;
  variant?: "default" | "quality";
};

/** Add/remove short statements as tags, with optional suggestions. */
export function TagListEditor({
  label,
  hint,
  values,
  onChange,
  suggestions,
  placeholder,
  variant = "default",
}: Props) {
  const t = useT();
  const [text, setText] = useState("");

  function add(value: string) {
    const v = value.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setText("");
  }

  function remove(value: string) {
    onChange(values.filter((x) => x !== value));
  }

  const remaining = (suggestions ?? []).filter((s) => !values.includes(s));

  return (
    <div className="field">
      <label>{label}</label>
      {hint && <p className="hint" style={{ marginBottom: 4 }}>{hint}</p>}
      <div className="tag-row" aria-label={t("{label}: chosen", { label })}>
        {values.map((v) => (
          <span key={v} className={`tag ${variant === "quality" ? "quality" : ""}`}>
            {v}
            <button aria-label={t("Remove {value}", { value: v })} onClick={() => remove(v)}>
              ×
            </button>
          </span>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(text);
        }}
        style={{ display: "flex", gap: "0.4rem" }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? t("Add your own…")}
          aria-label={t("Add to {label}", { label })}
        />
        <button type="submit" className="btn" disabled={!text.trim()}>
          {t("Add")}
        </button>
      </form>
      {remaining.length > 0 && (
        <div className="tag-row" aria-label={t("{label}: suggestions", { label })}>
          {remaining.map((s) => (
            <button key={s} className="tag" onClick={() => add(s)}>
              + {t(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
