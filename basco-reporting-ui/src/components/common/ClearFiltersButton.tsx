type ClearFiltersButtonProps = {
  onClear: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
};

export default function ClearFiltersButton({
  onClear,
  disabled = false,
  className = '',
  title = 'Clear all filters',
}: ClearFiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border text-sm font-bold transition-colors ${
        disabled
          ? 'border-[#E5E7EB] text-[#CBD5E1] bg-[#F8FAFC] cursor-not-allowed'
          : 'border-[#E5E7EB] text-[#6B7280] bg-white hover:text-[#EF4444] hover:border-[#FECACA] hover:bg-[#FEF2F2] cursor-pointer'
      } ${className}`}
    >
      ✕
    </button>
  );
}
