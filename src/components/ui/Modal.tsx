import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className={cn(
              "w-full bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl flex flex-col relative overflow-hidden",
              sizes[size]
            )}
          >
            <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between bg-slate-900/50">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h3>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 max-h-[75vh] custom-scrollbar">
              {children}
            </div>

            {footer && (
              <div className="px-6 py-4 border-t border-[#1E293B] bg-slate-900/50 flex gap-4 justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
