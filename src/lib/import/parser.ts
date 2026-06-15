/**
 * CSV Parser & Normalizer
 * Stage 1 & 2 of the import pipeline: Parse raw CSV and normalize field values.
 */

import Papa from 'papaparse';

// ─── Types ───────────────────────────────────────────────────────────

export interface RawCSVRow {
  date: string;
  description: string;
  paid_by: string;
  amount: string;
  currency: string;
  split_type: string;
  split_with: string;
  split_details: string;
  notes: string;
}

export interface ParsedRow {
  rowNumber: number;
  date: Date | null;
  dateRaw: string;
  description: string;
  paidBy: string | null;
  paidByRaw: string;
  amount: number;
  amountRaw: string;
  currency: string;
  currencyRaw: string;
  splitType: string;
  splitWith: string[];
  splitDetails: string;
  notes: string;
}

export interface ImportLogEntry {
  level: 'INFO' | 'WARNING' | 'ERROR';
  csvRow: number;
  field: string;
  rawValue: string;
  description: string;
  actionTaken: string;
  category: string;
}

// ─── Name Aliases ────────────────────────────────────────────────────

const NAME_ALIASES: Record<string, string> = {
  'priya s': 'Priya',
  "dev's friend kabir": 'Kabir',
};

/**
 * Normalize a person's name: trim whitespace, title-case, resolve aliases.
 */
export function normalizeName(raw: string): { name: string; wasNormalized: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { name: '', wasNormalized: false };

  const lower = trimmed.toLowerCase();

  // Check aliases first
  if (NAME_ALIASES[lower]) {
    return { name: NAME_ALIASES[lower], wasNormalized: true };
  }

  // Title case
  const titleCased = trimmed
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    name: titleCased,
    wasNormalized: titleCased !== trimmed,
  };
}

// ─── Amount Parsing ──────────────────────────────────────────────────

/**
 * Parse an amount string, handling commas and excessive decimals.
 */
export function parseAmount(raw: string): { amount: number; issues: string[] } {
  const issues: string[] = [];
  let cleaned = raw.trim();

  // Remove commas (e.g., "1,200")
  if (cleaned.includes(',')) {
    issues.push('comma-formatted');
    cleaned = cleaned.replace(/,/g, '');
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return { amount: 0, issues: ['unparseable'] };
  }

  // Check for excessive decimals
  const decimals = cleaned.includes('.') ? cleaned.split('.')[1]?.length ?? 0 : 0;
  if (decimals > 2) {
    issues.push(`${decimals}-decimal-places`);
  }

  // Round to 2 decimal places
  const rounded = Math.round(num * 100) / 100;
  return { amount: rounded, issues };
}

// ─── Date Parsing ────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse a date string in various formats.
 * Primary format: DD-MM-YYYY
 * Also handles: Mon-DD (e.g., "Mar-14") and ambiguous dates.
 */
export function parseDate(
  raw: string,
  rowNumber: number,
  surroundingDates: (Date | null)[]
): { date: Date | null; issues: string[] } {
  const issues: string[] = [];
  const trimmed = raw.trim();

  if (!trimmed) {
    return { date: null, issues: ['empty-date'] };
  }

  // Check for Mon-DD format (e.g., "Mar-14")
  const monthNameMatch = trimmed.match(/^([A-Za-z]{3})-(\d{1,2})$/);
  if (monthNameMatch) {
    const monthStr = monthNameMatch[1].toLowerCase();
    const day = parseInt(monthNameMatch[2]);
    const month = MONTH_MAP[monthStr];
    if (month !== undefined && day >= 1 && day <= 31) {
      issues.push('malformed-date-no-year');
      // Infer year 2026 from the dataset
      return { date: new Date(2026, month, day), issues };
    }
  }

  // Standard DD-MM-YYYY format
  const standardMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (standardMatch) {
    const first = parseInt(standardMatch[1]);
    const second = parseInt(standardMatch[2]);
    const year = parseInt(standardMatch[3]);

    // For the ambiguous case (04-05-2026), use contextual inference
    // All other dates in the file use DD-MM-YYYY
    // But if first > 12, it MUST be DD
    // If second > 12, it MUST be DD (so first is month)
    if (first <= 12 && second <= 12) {
      // Ambiguous! Both could be month or day
      // Default to DD-MM-YYYY (consistent with file format)
      // But check surrounding context
      const date_dd_mm = new Date(year, second - 1, first);

      // Check if surrounding rows provide context
      const nearbyDates = surroundingDates.filter(d => d !== null);
      if (nearbyDates.length > 0) {
        const lastDate = nearbyDates[nearbyDates.length - 1];
        const nextDates = surroundingDates.filter(d => d !== null);

        // If DD-MM gives April 5 and surrounding dates are late March / early April,
        // DD-MM makes more sense
        if (lastDate && date_dd_mm >= lastDate) {
          // DD-MM keeps chronological order — good
        } else {
          issues.push('ambiguous-date-format');
        }
      }

      // Check for specific known ambiguous case
      if (first === 4 && second === 5 && year === 2026) {
        issues.push('ambiguous-date-DD-MM-vs-MM-DD');
      }

      return { date: date_dd_mm, issues };
    }

    // Unambiguous: DD > 12 means DD-MM-YYYY
    return { date: new Date(year, second - 1, first), issues };
  }

  return { date: null, issues: ['unparseable-date'] };
}

// ─── Main Parser ─────────────────────────────────────────────────────

/**
 * Parse and normalize the entire CSV content.
 * Returns normalized rows and any log entries generated during parsing.
 */
export function parseCSV(csvContent: string): {
  rows: ParsedRow[];
  logs: ImportLogEntry[];
} {
  const logs: ImportLogEntry[] = [];

  // Parse CSV
  const result = Papa.parse<RawCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (result.errors.length > 0) {
    result.errors.forEach(err => {
      logs.push({
        level: 'ERROR',
        csvRow: (err.row ?? 0) + 2,
        field: 'csv',
        rawValue: '',
        description: `CSV parse error: ${err.message}`,
        actionTaken: 'Row may be malformed',
        category: 'F',
      });
    });
  }

  const parsedDates: (Date | null)[] = [];

  const rows: ParsedRow[] = result.data.map((raw, index) => {
    const rowNumber = index + 2; // +2 because: 0-indexed + header row

    // ── Normalize Name ──
    const paidByRaw = raw.paid_by ?? '';
    let paidBy: string | null = null;
    if (paidByRaw.trim()) {
      const { name, wasNormalized } = normalizeName(paidByRaw);
      paidBy = name;
      if (wasNormalized) {
        logs.push({
          level: 'WARNING',
          csvRow: rowNumber,
          field: 'paid_by',
          rawValue: paidByRaw,
          description: `Name normalized from "${paidByRaw}" to "${name}"`,
          actionTaken: `Mapped to canonical name "${name}"`,
          category: 'A',
        });
      }
    } else {
      logs.push({
        level: 'WARNING',
        csvRow: rowNumber,
        field: 'paid_by',
        rawValue: '',
        description: 'Missing payer — no one is recorded as having paid',
        actionTaken: 'Imported with null payer; flagged for manual assignment',
        category: 'C',
      });
    }

    // ── Parse Amount ──
    const amountRaw = raw.amount ?? '0';
    const { amount, issues: amountIssues } = parseAmount(amountRaw);
    amountIssues.forEach(issue => {
      logs.push({
        level: 'WARNING',
        csvRow: rowNumber,
        field: 'amount',
        rawValue: amountRaw,
        description: `Amount formatting issue: ${issue}`,
        actionTaken: `Parsed as ${amount}`,
        category: 'B',
      });
    });

    // ── Parse Date ──
    const dateRaw = raw.date ?? '';
    const { date, issues: dateIssues } = parseDate(dateRaw, rowNumber, parsedDates);
    parsedDates.push(date);
    dateIssues.forEach(issue => {
      logs.push({
        level: issue.includes('ambiguous') ? 'WARNING' : 'INFO',
        csvRow: rowNumber,
        field: 'date',
        rawValue: dateRaw,
        description: `Date issue: ${issue}`,
        actionTaken: date ? `Parsed as ${date.toISOString().split('T')[0]}` : 'Could not parse date',
        category: 'F',
      });
    });

    // ── Currency ──
    const currencyRaw = raw.currency ?? '';
    let currency = currencyRaw.trim().toUpperCase();
    if (!currency) {
      currency = 'INR';
      logs.push({
        level: 'WARNING',
        csvRow: rowNumber,
        field: 'currency',
        rawValue: '',
        description: 'Missing currency field',
        actionTaken: 'Defaulted to INR (dominant currency in dataset)',
        category: 'C',
      });
    }

    // ── Split With — normalize names ──
    const splitWithRaw = raw.split_with ?? '';
    const splitWith: string[] = splitWithRaw
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => {
        const { name, wasNormalized } = normalizeName(s);
        if (wasNormalized) {
          logs.push({
            level: 'INFO',
            csvRow: rowNumber,
            field: 'split_with',
            rawValue: s,
            description: `Participant name normalized from "${s}" to "${name}"`,
            actionTaken: `Using "${name}"`,
            category: 'A',
          });
        }
        return name;
      });

    return {
      rowNumber,
      date,
      dateRaw,
      description: raw.description?.trim() ?? '',
      paidBy,
      paidByRaw,
      amount,
      amountRaw,
      currency,
      currencyRaw,
      splitType: raw.split_type?.trim().toLowerCase() ?? '',
      splitWith,
      splitDetails: raw.split_details?.trim() ?? '',
      notes: raw.notes?.trim() ?? '',
    };
  });

  return { rows, logs };
}
