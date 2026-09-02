// src/components/common/LoadingSpinner.tsx
// Simple centered loading spinner used during async operations.

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-[#1E429F] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
