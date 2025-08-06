import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  onToggle,
  disabled = false,
  loading = false,
  className = ''
}) => {
  return (
    <button
      onClick={onToggle}
      disabled={disabled || loading}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2
        focus:ring-offset-2 ${className}
        ${enabled 
          ? 'bg-green-500 hover:bg-green-600 focus:ring-green-500' 
          : 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
        }
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-pressed={enabled}
      aria-label={enabled ? 'Disable' : 'Enable'}
    >
      <span className="sr-only">{enabled ? 'Enabled' : 'Disabled'}</span>
      <span
        className={`
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
          inline-block h-4 w-4 transform rounded-full bg-white
          transition-transform duration-200 ease-in-out
          ${loading ? 'animate-pulse' : ''}
        `}
      />
    </button>
  );
};

export default ToggleSwitch;