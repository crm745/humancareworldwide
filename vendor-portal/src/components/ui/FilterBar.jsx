import { Search, X } from 'lucide-react';
import { Input } from './Input';

/** Search box + filter controls row that sits on top of list tables. */
export function FilterBar({ search, onSearch, placeholder, children, onClear, showClear }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
      <div className="w-full lg:max-w-xs">
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          leftIcon={<Search className="h-4 w-4" />}
          aria-label="Search"
          rightSlot={
            search ? (
              <button type="button" onClick={() => onSearch('')} className="mr-1 rounded p-1 text-slate-400 hover:text-slate-600" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : undefined
          }
        />
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">{children}</div>
      {showClear && onClear && (
        <button type="button" onClick={onClear} className="self-start text-[13px] font-medium text-slate-500 hover:text-slate-800 lg:self-center">
          Clear filters
        </button>
      )}
    </div>
  );
}
