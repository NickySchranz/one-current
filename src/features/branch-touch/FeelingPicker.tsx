import { FEELINGS } from "@/domain/feelings/logic";
import { useT } from "@/i18n/i18n";

type Props = {
  selected: string[];
  onToggle: (feeling: string) => void;
  label: string;
  /** The tap vocabulary; defaults to the feelings a line can hold. */
  options?: readonly string[];
};

/** Tap-only chooser for the feelings a line holds. No typing. */
export function FeelingPicker({ selected, onToggle, label, options = FEELINGS }: Props) {
  const t = useT();
  return (
    <div className="feeling-picker" role="group" aria-label={label}>
      {options.map((f) => (
        <button
          key={f}
          type="button"
          className="feeling-chip"
          aria-pressed={selected.includes(f)}
          onClick={() => onToggle(f)}
        >
          {t(f)}
        </button>
      ))}
    </div>
  );
}
