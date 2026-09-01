// src/components/common/LoadingSpinner.tsx
// Simple centered loading spinner used during async operations.

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[120px]">
      <div className="w-10 h-10 border-4 border-[#013FFC] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
