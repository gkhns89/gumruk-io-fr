import { useState } from 'react';
import { toUpperCase } from '../../utils/textUtils';

/**
 * Reusable tag/badge input component for multi-value strings
 *
 * @param {string[]} value - Array of current tags
 * @param {function} onChange - Callback with updated array
 * @param {string} placeholder - Input placeholder
 * @param {boolean} uppercase - Auto-uppercase input
 * @param {number} maxLength - Max length per tag
 * @param {boolean} disabled - Disable input
 */
export default function TagInput({
  value = [],
  onChange,
  placeholder = "Type and press Enter",
  uppercase = true,
  maxLength = 50,
  disabled = false
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = uppercase ? toUpperCase(inputValue.trim()) : inputValue.trim();

      // Avoid duplicates
      if (!value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 border border-neutral/30 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[48px] focus-within:ring-2 focus-within:ring-primary">
      {value.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light rounded-md text-sm font-medium"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="hover:bg-primary/20 dark:hover:bg-primary/30 rounded-full p-0.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          maxLength={maxLength}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-text-main dark:text-gray-100 placeholder:text-neutral"
          style={uppercase ? { textTransform: 'uppercase' } : {}}
        />
      )}
    </div>
  );
}
