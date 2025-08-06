import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  text = 'Loading...'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-4', className)}>
      {/* Modern spinning ring */}
      <div className={cn('relative', sizeClasses[size])}>
        {/* Outer ring */}
        <div className={cn(
          'absolute inset-0 rounded-full border-2 border-gray-700',
          sizeClasses[size]
        )} />
        
        {/* Animated spinner ring */}
        <div className={cn(
          'absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-400 border-b-blue-300',
          'animate-spin',
          sizeClasses[size]
        )} />
        
        {/* Inner glow */}
        <div className={cn(
          'absolute inset-1 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-400/20',
          'animate-pulse',
          sizeClasses[size]
        )} />
      </div>
      
      {/* Loading text */}
      {text && (
        <div className="text-center">
          <p className="text-gray-400 text-sm font-medium">{text}</p>
          {/* Animated dots */}
          <div className="flex justify-center space-x-1 mt-1">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export { LoadingSpinner }; 