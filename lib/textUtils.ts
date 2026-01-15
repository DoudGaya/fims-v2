/**
 * Text utility functions for consistent formatting across the application
 */

/**
 * Convert text to title case (capitalize first letter of each word)
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Handle common abbreviations and special cases
      const abbreviations = ['nin', 'bvn', 'lga', 'id', 'api', 'sms', 'gps', 'pdf', 'qr'];
      const prepositions = ['of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'and', 'or', 'the', 'a', 'an'];

      if (abbreviations.includes(word.toLowerCase())) {
        return word.toUpperCase();
      }

      // Don't capitalize short prepositions unless they're the first word
      if (prepositions.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }

      // Capitalize first letter of the word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/\b(NIN|BVN|LGA|ID|API|SMS|GPS|PDF|QR)\b/g, match => match.toUpperCase());
}

/**
 * Convert text to proper sentence case
 */
export function toSentenceCase(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .replace(/(^\w|[.!?]\s*\w)/g, match => match.toUpperCase())
    .replace(/\b(NIN|BVN|LGA|ID|API|SMS|GPS|PDF|QR)\b/gi, match => match.toUpperCase());
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format a full name with proper capitalization
 */
export function formatFullName(firstName?: string | null, middleName?: string | null, lastName?: string | null): string {
  const parts = [
    firstName ? toTitleCase(firstName) : '',
    middleName ? toTitleCase(middleName) : '',
    lastName ? toTitleCase(lastName) : ''
  ].filter(Boolean);

  return parts.join(' ');
}

/**
 * Format location text (state, LGA, ward) with proper capitalization
 */
export function formatLocation(location: string | null | undefined): string {
  if (!location) return '';

  // Handle special location formatting
  return location
    .toLowerCase()
    .split(/[\s-]/)
    .map(word => {
      // Handle common location abbreviations
      if (['lga', 'fc', 'fct'].includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Format crop names with proper capitalization
 */
export function formatCropName(crop: string | null | undefined): string {
  if (!crop) return '';

  // Handle special crop names
  const specialCrops: Record<string, string> = {
    'maize': 'Maize',
    'rice': 'Rice',
    'beans': 'Beans',
    'cassava': 'Cassava',
    'yam': 'Yam',
    'groundnut': 'Groundnut',
    'soybean': 'Soybean',
    'cowpea': 'Cowpea',
    'millet': 'Millet',
    'sorghum': 'Sorghum'
  };

  const lowerCrop = crop.toLowerCase();
  return specialCrops[lowerCrop] || toTitleCase(crop);
}

/**
 * Format bank names with proper capitalization
 */
export function formatBankName(bankName: string | null | undefined): string {
  if (!bankName) return '';

  return bankName
    .toLowerCase()
    .split(/[\s-]/)
    .map(word => {
      // Handle bank-specific abbreviations
      const bankAbbreviations = ['plc', 'ltd', 'bank', 'co', 'microfinance', 'mfb'];
      if (bankAbbreviations.includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Format employment status with proper capitalization
 */
export function formatEmploymentStatus(status: string | null | undefined): string {
  if (!status) return '';

  const statusMap: Record<string, string> = {
    'employed': 'Employed',
    'unemployed': 'Unemployed',
    'self-employed': 'Self-Employed',
    'student': 'Student',
    'retired': 'Retired',
    'farmer': 'Farmer'
  };

  return statusMap[status.toLowerCase()] || toTitleCase(status);
}

/**
 * Format marital status with proper capitalization
 */
export function formatMaritalStatus(status: string | null | undefined): string {
  if (!status) return '';

  const statusMap: Record<string, string> = {
    'single': 'Single',
    'married': 'Married',
    'divorced': 'Divorced',
    'widowed': 'Widowed',
    'separated': 'Separated'
  };

  return statusMap[status.toLowerCase()] || toTitleCase(status);
}

/**
 * Clean and format text by removing extra spaces and normalizing
 */
export function cleanText(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/[^\w\s-.]/g, ''); // Remove special characters except alphanumeric, spaces, hyphens, and periods
}

/**
 * Format data values for display: uppercase with underscores/dashes replaced by spaces
 */
export function formatValue(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .toUpperCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');
}
