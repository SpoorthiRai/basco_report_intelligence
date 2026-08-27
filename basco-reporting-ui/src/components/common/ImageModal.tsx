// src/components/common/ImageModal.tsx
// Interactive lightbox modal for expanding creative images with metadata details.

import React, { useEffect, useState } from 'react';

export interface ImageModalDetail {
  label: string;
  value: React.ReactNode;
  badge?: boolean;
  badgeColor?: string;
}

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  details?: ImageModalDetail[];
}

export default function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
  details = [],
}: ImageModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Handle ESC key and scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(false);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-w-5xl w-full max-h-[92vh] flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {title || 'Creative Preview'}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Image Container */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/90 min-h-[350px] max-h-[68vh]">
          {loading && !error && (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-400 text-xs animate-pulse">
              <span className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading high-res creative...</span>
            </div>
          )}

          {error ? (
            <div className="text-center p-8 text-slate-400 text-xs">
              <span className="text-3xl block mb-2">🖼️</span>
              <span>Unable to load full creative image.</span>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={title || 'Creative Asset'}
              className={`max-h-[64vh] max-w-full object-contain rounded-lg shadow-lg transition-opacity duration-200 ${
                loading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          )}
        </div>

        {/* Modal Footer: Metadata Details */}
        {details.length > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center gap-3">
            {details.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs"
              >
                <span className="text-slate-400 font-semibold text-[11px]">{d.label}:</span>
                {d.badge ? (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: d.badgeColor || '#2563EB' }}
                  >
                    {d.value}
                  </span>
                ) : (
                  <span className="text-white font-bold text-[11px]">{d.value}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
