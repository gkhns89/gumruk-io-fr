import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard navigation in dropdown menus
 *
 * @param {boolean} isOpen - Whether the dropdown is open
 * @param {Array} items - Array of items in the dropdown
 * @param {Function} onSelect - Callback when an item is selected
 * @param {Function} onClose - Callback to close the dropdown
 * @param {string} dropdownId - Unique ID for the dropdown (for scrolling)
 * @returns {Object} - { highlightedIndex, handleKeyDown, resetHighlight }
 */
export function useDropdownKeyboard(isOpen, items, onSelect, onClose, dropdownId = 'dropdown') {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Reset highlight when dropdown opens/closes or items change
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
    } else if (items && items.length > 0) {
      // When dropdown opens, highlight first item
      setHighlightedIndex(0);
    }
  }, [isOpen, items]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0) {
      const element = document.querySelector(
        `[data-dropdown-id="${dropdownId}"][data-dropdown-index="${highlightedIndex}"]`
      );
      if (element) {
        element.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex, isOpen, dropdownId]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen || !items || items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < items.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : 0
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
          onSelect(items[highlightedIndex]);
        }
        break;

      case 'Tab':
        // Tab selects the highlighted item and moves to next field
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
          e.preventDefault();
          onSelect(items[highlightedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        onClose();
        break;

      default:
        break;
    }
  }, [isOpen, items, highlightedIndex, onSelect, onClose]);

  const resetHighlight = useCallback(() => {
    setHighlightedIndex(-1);
  }, []);

  return {
    highlightedIndex,
    handleKeyDown,
    resetHighlight
  };
}
