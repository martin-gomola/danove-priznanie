'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PrijimatelItem } from '@/types/TaxForm';

export type { PrijimatelItem };

interface Props {
  valueIco: string;
  valueObchMeno: string;
  onSelect: (item: PrijimatelItem) => void;
  placeholder?: string;
  disabled?: boolean;
}

const DEBOUNCE_MS = 350;

export function PrijimatelSelect({
  valueIco,
  valueObchMeno,
  onSelect,
  placeholder = 'Hľadať podľa názvu alebo IČO...',
  disabled,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PrijimatelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = valueIco && valueObchMeno;
  const displayValue = selected ? `${valueObchMeno} (${valueIco})` : '';

  const fetchOptions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/prijimatelia-2perc?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = (await res.json()) as PrijimatelItem[];
      setOptions(data);
      setOpen(true);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(() => fetchOptions(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, fetchOptions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    if (!selected) {
      setOpen(true);
      setQuery('');
      fetchOptions('');
    }
  };

  const handleChange = () => {
    onSelect({ ico: '', obchMeno: '' });
    setQuery('');
    setOpen(true);
    fetchOptions('');
  };

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="flex-1 truncate text-sm text-gray-900" title={displayValue}>
            {displayValue}
          </span>
          <button
            type="button"
            onClick={handleChange}
            disabled={disabled}
            className="shrink-0 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            Zmeniť
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none disabled:opacity-50"
            autoComplete="off"
          />
          {open && (
            <ul
              className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              role="listbox"
            >
              {loading ? (
                <li className="px-3 py-4 text-center text-sm text-gray-500">Načítavam...</li>
              ) : options.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-gray-500">
                  {query.trim().length < 2 ? 'Zadajte aspoň 2 znaky' : 'Žiadny výsledok'}
                </li>
              ) : (
                options.map((item) => (
                  <li
                    key={item.ico}
                    role="option"
                    tabIndex={0}
                    className="cursor-pointer px-3 py-2 text-sm text-gray-900 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(item);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <span className="font-medium">{item.obchMeno}</span>
                    <span className="ml-2 text-gray-500">{item.ico}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
