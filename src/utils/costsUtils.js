/**
 * Calculate total costs grouped by currency
 * @param {Object} cargo - Cargo item with lokalAmount, depositoAmount, ordinoAmount and their currencies
 * @returns {Array} Array of {currency, total} objects
 */
export const calculateTotalCosts = (cargo) => {
  const costsByCurrency = {};

  // Add lokal cost
  if (cargo.lokalAmount && cargo.lokalAmount > 0) {
    const currency = cargo.lokalCurrency || 'TRY';
    costsByCurrency[currency] = (costsByCurrency[currency] || 0) + parseFloat(cargo.lokalAmount);
  }

  // Add depozito cost
  if (cargo.depositoAmount && cargo.depositoAmount > 0) {
    const currency = cargo.depositoCurrency || 'TRY';
    costsByCurrency[currency] = (costsByCurrency[currency] || 0) + parseFloat(cargo.depositoAmount);
  }

  // Add ordino cost
  if (cargo.ordinoAmount && cargo.ordinoAmount > 0) {
    const currency = cargo.ordinoCurrency || 'TRY';
    costsByCurrency[currency] = (costsByCurrency[currency] || 0) + parseFloat(cargo.ordinoAmount);
  }

  // Convert to array and format
  return Object.entries(costsByCurrency).map(([currency, total]) => ({
    currency,
    total: total.toFixed(2)
  }));
};

/**
 * Format costs as a display string
 * @param {Object} cargo - Cargo item
 * @returns {string} Formatted costs string (e.g., "20 USD, 400 TRY")
 */
export const formatCostsDisplay = (cargo) => {
  const totals = calculateTotalCosts(cargo);

  if (totals.length === 0) {
    return '-';
  }

  return totals.map(({ currency, total }) => `${total} ${currency}`).join(', ');
};

/**
 * Get individual cost breakdown for display
 * @param {Object} cargo - Cargo item
 * @returns {Array} Array of individual costs {type, amount, currency}
 */
export const getCostBreakdown = (cargo) => {
  const breakdown = [];

  if (cargo.lokalAmount && cargo.lokalAmount > 0) {
    breakdown.push({
      type: 'Lokal',
      amount: parseFloat(cargo.lokalAmount).toFixed(2),
      currency: cargo.lokalCurrency || 'TRY'
    });
  }

  if (cargo.depositoAmount && cargo.depositoAmount > 0) {
    breakdown.push({
      type: 'Depozito',
      amount: parseFloat(cargo.depositoAmount).toFixed(2),
      currency: cargo.depositoCurrency || 'TRY'
    });
  }

  if (cargo.ordinoAmount && cargo.ordinoAmount > 0) {
    breakdown.push({
      type: 'Ordino',
      amount: parseFloat(cargo.ordinoAmount).toFixed(2),
      currency: cargo.ordinoCurrency || 'TRY'
    });
  }

  return breakdown;
};
