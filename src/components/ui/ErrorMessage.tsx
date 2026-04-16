import React, { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ErrorMessageProps {
  message: string | null;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className = "" }) => {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && errorRef.current) {
      const element = errorRef.current;
      // Small delay to ensure layout is stable
      const timer = setTimeout(() => {
        const navHeight = 80; // Approximate height of sticky navbar
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navHeight - 20;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message) return null;

  return (
    <motion.div
      ref={errorRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm ${className}`}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span className="font-bold uppercase tracking-tight">{message}</span>
    </motion.div>
  );
};

export default ErrorMessage;
