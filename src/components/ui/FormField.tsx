'use client';

import React from 'react';
import { Info } from 'lucide-react';

interface FormFieldProps {
  label: string;
  hint?: string;
  /** Show hint as an (i) tooltip icon next to the label instead of text below. */
  hintIcon?: boolean;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, hint, hintIcon, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
        <span>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {hint && hintIcon && (
          <span className="relative group">
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
              hidden group-hover:block
              px-2.5 py-1.5 rounded-lg text-xs font-normal text-white bg-gray-800
              whitespace-nowrap shadow-lg z-50
              after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2
              after:border-4 after:border-transparent after:border-t-gray-800">
              {hint}
            </span>
          </span>
        )}
      </label>
      {hint && !hintIcon && <p className="text-xs text-gray-500">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suffix?: string;
}

export function Input({ suffix, className = '', ...props }: InputProps) {
  return (
    <div className="relative">
      <input
        {...props}
        className={`
          w-full px-3 py-2 rounded-lg text-sm
          bg-gray-50 border border-gray-200
          text-gray-900 placeholder:text-gray-400
          focus:outline-none focus:border-gray-400 focus:bg-white
          transition-all duration-200
          ${suffix ? 'pr-12' : ''}
          ${className}
        `}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
          {suffix}
        </span>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`
        w-full px-3 py-2 rounded-lg text-sm
        bg-gray-50 border border-gray-200
        text-gray-900
        focus:outline-none focus:border-gray-400 focus:bg-white
        transition-all duration-200 appearance-none
        bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
        bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8
        ${className}
      `}
    >
      {children}
    </select>
  );
}

interface ToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ enabled, onToggle, label, description }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={`
        w-full flex items-center justify-between px-4 py-3 rounded-xl
        border transition-all duration-200
        ${
          enabled
            ? 'bg-gray-50 border-gray-300'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }
      `}
    >
      <div className="text-left">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div
        className={`
          w-10 h-6 rounded-full flex items-center transition-colors duration-200
          ${enabled ? 'bg-emerald-500/30 justify-end' : 'bg-gray-200 justify-start'}
        `}
      >
        <div
          className={`
            w-4 h-4 rounded-full mx-1 transition-colors duration-200
            ${enabled ? 'bg-emerald-400' : 'bg-gray-400'}
          `}
        />
      </div>
    </button>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function InfoBox({
  children,
  variant = 'info',
}: {
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'success';
}) {
  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${colors[variant]}`}>
      {children}
    </div>
  );
}

export function SourceNote({
  text,
  href,
}: {
  text: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors mt-1"
    >
      <Info className="w-3 h-3 flex-shrink-0" />
      <span>{text}</span>
    </a>
  );
}
