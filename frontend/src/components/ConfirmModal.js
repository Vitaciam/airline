import React from 'react';
import { useTranslation } from 'react-i18next';

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type = 'danger' }) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  const bgColor = type === 'danger' 
    ? 'bg-red-500 hover:bg-red-600' 
    : 'bg-blue-500 hover:bg-blue-600';

  const defaultConfirmText = confirmText || t('admin.confirm') || 'Подтвердить';
  const defaultCancelText = cancelText || t('admin.cancel') || 'Отмена';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        <div className="p-8">
          <h3 className="text-2xl font-black text-black mb-4">{title}</h3>
          <p className="text-gray-600 text-lg mb-8">{message}</p>
          <div className="flex gap-4 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-black font-bold rounded-full transition-colors"
            >
              {defaultCancelText}
            </button>
            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              className={`px-6 py-3 ${bgColor} text-white font-bold rounded-full transition-colors shadow-lg`}
            >
              {defaultConfirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

