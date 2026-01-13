
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// BUBBLY BUTTON
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}) => {
  const baseStyles = "relative font-bold rounded-2xl transition-all duration-200 active:scale-95 shadow-xl border-b-[4px] focus:outline-none flex items-center justify-center gap-2 active:border-b-0 active:translate-y-1";
  
  const variants = {
    primary: "bg-violet-500 hover:bg-violet-400 border-violet-700 text-white shadow-violet-900/30",
    secondary: "bg-pink-500 hover:bg-pink-400 border-pink-700 text-white shadow-pink-900/30",
    danger: "bg-red-500 hover:bg-red-400 border-red-700 text-white shadow-red-900/30",
    success: "bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white shadow-emerald-900/30",
    glass: "bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md shadow-black/10",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm border-b-2 rounded-lg",
    md: "px-6 py-3 text-base border-b-[4px]",
    lg: "px-8 py-4 text-xl border-b-[6px] rounded-3xl",
    xl: "px-10 py-5 text-2xl border-b-[6px] rounded-3xl w-full md:w-auto",
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

// GLASS CARD
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  return (
    <div 
      className={cn(
        "glass-panel rounded-[2rem] p-6 md:p-8 shadow-2xl text-white",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};

// ROUNDED INPUT
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  return (
    <input 
      className={cn(
        "w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:border-pink-500 focus:bg-white/10 transition-all text-start font-bold text-xl shadow-inner",
        className
      )} 
      {...props} 
    />
  );
};

// BUBBLE BADGE
export const Badge: React.FC<{children: React.ReactNode, color?: string}> = ({children, color = "bg-blue-500"}) => (
  <span className={cn("px-3 py-1 rounded-lg text-sm font-bold tracking-wide text-white shadow-sm border-b-2 border-black/10", color)}>
    {children}
  </span>
);
