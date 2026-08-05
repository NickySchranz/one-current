import { FEELINGS } from "@/domain/feelings/logic";

type Props = {
  selected: string[];
  onToggle: (feeling: string) => void;
  label: string;
  /** The tap vocabulary; defaults to the feelings a line can hold. */
  options?: readonly string[];
};

/** Tap-only chooser for the feelings a line holds. No typing. */
export function FeelingPicker({ selected, onToggle, label, options = FEELINGS }: Props) {
  return (
    <div className="feeling-picker" role="group" aria-label={label}>
      {options.map((f) => (
        <button
          key={f}
          className="feeling-chip"
          aria-pressed={selected.includes(f)}
          onClick={() => onToggle(f)}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
