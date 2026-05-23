'use client';
import { ButtonHTMLAttributes } from 'react';

interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 border border-gray-300',
};

const sizeClasses = {
  sm: 'min-h-[56px] px-4 py-3 text-lg',
  md: 'min-h-[52px] px-4 py-3 text-lg',
  lg: 'min-h-[60px] px-6 py-3 text-xl',
  xl: 'min-h-[72px] px-8 py-4 text-2xl',
};

export default function TouchButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: TouchButtonProps) {
  return (
    <button
      className={`
        rounded-xl font-semibold
        transition-all duration-100
        touch-manipulation select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        active:scale-95
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
