export const AREA_UNITS = {
  sqft: { label: 'Sq. Ft.', rate: 1, symbol: 'sqft' },
  acres: { label: 'Acres', rate: 43560, symbol: 'acres' },
  guntas: { label: 'Guntas', rate: 1089, symbol: 'guntas' },
  sqm: { label: 'Sq. Meters', rate: 10.76391, symbol: 'sqm' }
};

export const WIDTH_UNITS = {
  feet: { label: 'Feet', rate: 1, symbol: 'ft' },
  meters: { label: 'Meters', rate: 3.28084, symbol: 'm' }
};

// Convert val from one unit to another
export const convertValue = (val, fromUnit, toUnit, unitMap) => {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) return '';
  const fromRate = unitMap[fromUnit]?.rate || 1;
  const toRate = unitMap[toUnit]?.rate || 1;
  const standardVal = num * fromRate;
  const converted = standardVal / toRate;
  // Format to maximum 4 decimal places, trimming trailing zeros
  return parseFloat(converted.toFixed(4)).toString();
};
