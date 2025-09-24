'use client';

import React from 'react';
import styles from './InfoModal.module.css';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className={`${styles.gridBackground} fixed inset-0 z-50 flex items-center justify-center p-4`}>
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          &times;
        </button>
        <h2 className="mb-4 text-2xl font-bold text-gray-800">アプリの使い方</h2>
        <div className="prose max-w-none text-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
