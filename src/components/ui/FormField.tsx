'use client';

import React from 'react';
import { Info, ChevronRight } from 'lucide-react';
import { EvidenceBadge } from '@/components/ui/EvidenceBadge';
import type { EvidenceItem } from '@/types/TaxForm';

interface FormFieldProps {
  label: string;
  hint?: string;
  /** Show hint as an (i) tooltip icon next to the label instead of text below. */
  hintIcon?: boolean;
  required?: boolean;
  error?: string;
  /** Optional id for the control; used for label htmlFor and passed to a single child for a11y. */
  id?: string;
  /** Optional AI-extraction evidence to show a badge and popover. */
  evidence?: EvidenceItem[];
  /** Display name for the source document in evidence popover. */
  evidenceDocName?: string;
  children: React.ReactNode;
}

export function FormField({ label, hint, hintIcon, required, error, id: idProp, evidence, evidenceDocName, children }: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = idProp ?? generatedId;
  const count = React.Children.count(children);
  const singleChild = count === 1 ? React.Children.toArray(children)[0] : null;
  const labeledChild =
    count === 1 && React.isValidElement(singleChild)
      ? React.cloneElement(singleChild as React.ReactElement<{ id?: string }>, { id: fieldId })
      : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="flex items-center gap-1.5 text-sm font-medium text-gray-700 flex-wrap">
        <span>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {evidence && evidence.length > 0 && (
          <EvidenceBadge items={evidence} docName={evidenceDocName} />
        )}
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
      {hint && !hintIcon && <p className="text-xs text-gray-600">{hint}</p>}
      {labeledChild}
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
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-medium">
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
  /** No longer shown on the toggle; move to MarginNote or expanded content. */
  description?: string;
}

export function Toggle({ enabled, onToggle, label }: ToggleProps) {
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
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900 flex flex-wrap items-center gap-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
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
      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors mt-1"
    >
      <Info className="w-3 h-3 flex-shrink-0" />
      <span>{text}</span>
    </a>
  );
}

export interface MarginNoteProps {
  section?: string;
  href?: string;
  /** Optional link text; when not set, defaults to "Zákon na slov-lex.sk" for legal refs. */
  hrefLabel?: string;
  children: React.ReactNode;
  /** When true, only render the collapsible details (for use with a shared notes column on desktop). */
  skipDesktopAside?: boolean;
}

const DEFAULT_LINK_LABEL = 'Zákon na slov-lex.sk';

/** Block-level note panel for use inside a shared notes column (no absolute positioning). */
export function MarginNotePanel({ section, href, hrefLabel, children }: MarginNoteProps) {
  return (
    <div className="w-full pl-4 pr-2 py-0 border-l-2 border-stone-300/80 max-h-[22rem] overflow-y-auto break-words">
      {section && (
        <span className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-1.5">
          {section}
        </span>
      )}
      <div className="text-[11px] text-stone-600 leading-relaxed space-y-1.5">
        {typeof children === 'string' ? <span>{children}</span> : children}
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-stone-500 hover:text-stone-700 underline decoration-stone-300 underline-offset-2 mt-1.5 transition-colors"
          >
            {hrefLabel ?? DEFAULT_LINK_LABEL}
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Legal/explanatory note: margin on 2xl+, collapsible details below.
 * Parent must be `position: relative` for margin placement (unless skipDesktopAside).
 */
export function MarginNote({ section, href, hrefLabel, children, skipDesktopAside = false }: MarginNoteProps) {
  const summary = section ? `${section} - Viac info` : 'Viac info';
  const linkLabel = hrefLabel ?? DEFAULT_LINK_LABEL;
  return (
    <>
      {!skipDesktopAside && (
        <aside
          className="hidden 2xl:block absolute top-0 right-[-17rem] mt-4 mb-6 w-56 pl-4 pr-2 py-0 border-l-2 border-stone-300/80 max-h-[22rem] overflow-y-auto break-words"
        >
          {section && (
            <span className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-1.5">
              {section}
            </span>
          )}
          <div className="text-[11px] text-stone-600 leading-relaxed space-y-1.5">
            {typeof children === 'string' ? <span>{children}</span> : children}
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-stone-500 hover:text-stone-700 underline decoration-stone-300 underline-offset-2 mt-1.5 transition-colors"
              >
                {linkLabel}
              </a>
            )}
          </div>
        </aside>
      )}
      {/* Below 2xl: collapsible details */}
      <details className="2xl:hidden group mt-1">
        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 list-none inline-flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform shrink-0 text-gray-500" />
          {summary}
        </summary>
        <div className="mt-2 pl-4 border-l border-gray-200 text-xs text-gray-500 leading-relaxed space-y-1">
          {typeof children === 'string' ? <span>{children}</span> : children}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-gray-600 hover:text-gray-800 underline underline-offset-1"
            >
              {linkLabel}
            </a>
          )}
        </div>
      </details>
    </>
  );
}

export interface DisclosureProps {
  summary: React.ReactNode;
  children: React.ReactNode;
}

/** Collapsible block: summary line + expandable body. */
export function Disclosure({ summary, children }: DisclosureProps) {
  return (
    <details className="rounded-xl border border-gray-200 bg-white overflow-hidden group">
      <summary className="flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-open:rotate-90 transition-transform" />
      </summary>
      <div className="px-4 pt-4 pb-4 border-t border-gray-100 text-sm text-gray-600">
        {children}
      </div>
    </details>
  );
}
