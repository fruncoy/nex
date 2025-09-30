import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'loading';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (type !== 'loading') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose, type]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'error':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'loading':
        return 'bg-blue-100 border-blue-500 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center">
      <div
        className={`flex items-center p-4 rounded-md shadow-md border-l-4 ${getToastStyles()}`}
        role="alert"
      >
        <div className="flex items-center">
          <div className="mr-3">{getIcon()}</div>
          <div className="text-sm font-medium">{message}</div>
        </div>
        <button
          onClick={handleClose}
          className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}