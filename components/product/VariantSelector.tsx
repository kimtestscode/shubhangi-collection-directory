'use client';
import { OptionType, InlineVariant } from '@/lib/types';

interface Props {
  optionTypes: OptionType[];
  variants: InlineVariant[];
  selectedOptions: Record<string, string>;
  onSelectOption: (optionName: string, value: string) => void;
}

export default function VariantSelector({
  optionTypes,
  variants,
  selectedOptions,
  onSelectOption,
}: Props) {
  if (!optionTypes || optionTypes.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-border-warm pt-4">
      {optionTypes.map((opt) => {
        const optName = opt.name || opt.type || 'Option';
        const currentVal = selectedOptions[optName];

        return (
          <div key={optName} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoal flex items-center gap-2">
              <span>{optName}</span>
              {currentVal && (
                <span className="text-charcoal-light font-normal normal-case tracking-normal">
                  — {currentVal}
                </span>
              )}
            </label>

            <div className="flex flex-wrap gap-2">
              {opt.values.map((val) => {
                const isSelected = currentVal === val;

                // Find a variant that has this option value and an image to display as thumbnail
                const matchingVariant = variants.find((v) => {
                  if (v.option_values && v.option_values[optName] === val) return true;
                  return v.name === val || v.name.includes(val);
                });

                const thumb = matchingVariant?.images?.[0] || matchingVariant?.image;

                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onSelectOption(optName, val)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all select-none ${
                      isSelected
                        ? 'border-charcoal bg-charcoal text-white shadow-sm scale-[1.02]'
                        : 'border-border-warm bg-white text-charcoal hover:border-gold hover:text-gold hover:shadow-xs'
                    }`}
                  >
                    {thumb && (
                      <span className={`w-5 h-5 rounded overflow-hidden flex-shrink-0 border ${isSelected ? 'border-white/30' : 'border-border-warm'}`}>
                        <img src={thumb} alt={val} className="w-full h-full object-cover" />
                      </span>
                    )}
                    <span>{val}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
