import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  modalClassName?: string;
}

const animationStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes modalSlideOut {
    from {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    to {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out forwards;
  }

  .animate-fadeOut {
    animation: fadeOut 0.2s ease-out forwards;
  }

  .animate-modalSlideIn {
    animation: modalSlideIn 0.3s ease-out forwards;
  }

  .animate-modalSlideOut {
    animation: modalSlideOut 0.2s ease-out forwards;
  }
`;

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, modalClassName }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Add animation styles when component mounts
    const styleElement = document.createElement('style');
    styleElement.innerHTML = animationStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={handleClickOutside}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ease-in-out ${
          isClosing ? 'animate-fadeOut' : 'animate-fadeIn'
        }`} 
      />
      
      {/* Modal Content */}
      <div 
        className={`bg-white rounded-[32px] p-6 ${modalClassName ? modalClassName : 'w-full max-w-lg mx-4'} relative transform ${
          isClosing ? 'animate-modalSlideOut' : 'animate-modalSlideIn'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors duration-200"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal; 