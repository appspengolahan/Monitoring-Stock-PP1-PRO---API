import React from 'react';

export interface StockAppsConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isAlert?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const StockAppsConfirmModal: React.FC<StockAppsConfirmModalProps> = ({
  isOpen,
  title = 'monitoring stock apps says',
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  isAlert = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/90 p-6 space-y-4 my-auto animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Header Title */}
        <div className="text-slate-900 font-semibold text-sm sm:text-base leading-snug">
          {title}
        </div>

        {/* Message Body */}
        <div className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line py-1">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="bg-[#00696b] hover:bg-[#005254] active:bg-[#004143] text-white px-7 py-2 rounded-full font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#00696b] focus:ring-offset-2"
          >
            {confirmLabel}
          </button>
          {!isAlert && (
            <button
              type="button"
              onClick={onCancel}
              className="bg-[#a5f3fc] hover:bg-[#67e8f9] active:bg-[#22d3ee] text-[#0e7490] px-7 py-2 rounded-full font-bold text-xs sm:text-sm transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#0e7490] focus:ring-offset-2"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
