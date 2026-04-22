"use client";

type StringListFieldsetProps = {
  label: string;
  addLabel: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
};

export function StringListFieldset({
  label,
  addLabel,
  placeholder,
  values,
  onChange,
}: StringListFieldsetProps) {
  function updateValue(index: number, value: string) {
    const next = [...values];
    next[index] = value;
    onChange(next);
  }

  function removeValue(index: number) {
    if (values.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
      <legend className="px-0.5 text-sm font-medium text-gray-800">{label}</legend>
      {values.map((value, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => updateValue(idx, e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => removeValue(idx)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm leading-none text-gray-600 hover:bg-red-50 hover:text-red-700"
            aria-label="Remove row"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="rounded-lg border border-dashed border-primary/40 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
      >
        {addLabel}
      </button>
    </fieldset>
  );
}
