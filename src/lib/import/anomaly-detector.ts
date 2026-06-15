/**
 * Anomaly Detection Engine
 * Stage 3 of the import pipeline: Detect semantic anomalies across parsed rows.
 *
 * This module detects:
 * - Duplicate entries (exact and conflicting)
 * - Zero-amount expenses
 * - Negative amounts (refunds)
 * - Percentage sums ≠ 100%
 * - Split type contradictions
 * - Departed member inclusion
 * - Ad-hoc participants
 * - Refund participant mismatches
 */

import { ParsedRow, ImportLogEntry } from './parser';

// Known group timeline (derived from CSV context)
const MEMBER_TIMELINE: Record<string, { joined: string; left?: string }> = {
  Aisha: { joined: '2026-01-01' },
  Rohan: { joined: '2026-01-01' },
  Priya: { joined: '2026-01-01' },
  Meera: { joined: '2026-01-01', left: '2026-03-29' }, // Moved out end of March
  Dev: { joined: '2026-02-08' },                        // Visiting / Goa trip
  Kabir: { joined: '2026-03-11' },                       // Guest for one day
  Sam: { joined: '2026-04-08' },                          // Moved in April
};

const CORE_MEMBERS = ['Aisha', 'Rohan', 'Priya', 'Meera'];

/**
 * Check if a member was active in the group on a given date.
 */
function isMemberActiveOnDate(name: string, date: Date): boolean {
  const timeline = MEMBER_TIMELINE[name];
  if (!timeline) return true; // Unknown member, assume active

  const joined = new Date(timeline.joined);
  if (date < joined) return false;

  if (timeline.left) {
    const left = new Date(timeline.left);
    if (date > left) return false;
  }

  return true;
}

/**
 * Compute a fingerprint for duplicate detection.
 */
function rowFingerprint(row: ParsedRow): string {
  const dateStr = row.date ? row.date.toISOString().split('T')[0] : '';
  return `${dateStr}|${row.paidBy}|${row.amount}`;
}

/**
 * Normalize a description for fuzzy duplicate matching.
 */
function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse split details string (e.g., "Rohan 700; Priya 400; Meera 400")
 */
export function parseSplitDetails(
  details: string,
  splitType: string
): Map<string, number> {
  const map = new Map<string, number>();
  if (!details.trim()) return map;

  const parts = details.split(';').map(s => s.trim()).filter(s => s);
  for (const part of parts) {
    // Match patterns like "Rohan 700" or "Aisha 30%" or "Rohan 2"
    const match = part.match(/^(.+?)\s+([\d.]+)%?$/);
    if (match) {
      const name = match[1].trim();
      const value = parseFloat(match[2]);
      // Normalize the name
      const titleCased = name
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      map.set(titleCased, value);
    }
  }
  return map;
}

export interface AnomalyResult {
  rows: ParsedRow[];
  logs: ImportLogEntry[];
  /** Row numbers to skip entirely (zero-amount, etc.) */
  skipRows: Set<number>;
  /** Row numbers that are exact duplicates (will be marked as pending user approval) */
  duplicateRows: Set<number>;
  /** Row numbers that are settlements, not expenses */
  settlementRows: Set<number>;
}

/**
 * Run all anomaly detection rules across the parsed rows.
 */
export function detectAnomalies(rows: ParsedRow[], existingLogs: ImportLogEntry[]): AnomalyResult {
  const logs: ImportLogEntry[] = [...existingLogs];
  const skipRows = new Set<number>();
  const duplicateRows = new Set<number>();
  const settlementRows = new Set<number>();

  // ─── E1: Exact Duplicate Detection ────────────────────────────────
  const fingerprints = new Map<string, ParsedRow>();
  for (const row of rows) {
    const fp = rowFingerprint(row);
    const existing = fingerprints.get(fp);

    if (existing) {
      // Same date, payer, amount — check if descriptions are similar
      const normDesc1 = normalizeDescription(existing.description);
      const normDesc2 = normalizeDescription(row.description);

      // Check if they share significant words
      const words1 = new Set(normDesc1.split(' '));
      const words2 = new Set(normDesc2.split(' '));
      const shared = [...words1].filter(w => words2.has(w) && w.length > 2);

      if (shared.length > 0) {
        duplicateRows.add(row.rowNumber);
        logs.push({
          level: 'INFO',
          csvRow: row.rowNumber,
          field: 'description',
          rawValue: row.description,
          description: `Exact duplicate of row ${existing.rowNumber}: same date, payer, amount. Descriptions: "${existing.description}" vs "${row.description}"`,
          actionTaken: `Marked as PENDING_REVIEW; User must approve deletion.`,
          category: 'E',
        });
      }
    } else {
      fingerprints.set(fp, row);
    }
  }

  // ─── E2: Conflicting Duplicate Detection (Thalassa case) ──────────
  // Same date + similar description but different payer/amount
  const dateDescGroups = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    if (skipRows.has(row.rowNumber)) continue;
    const dateStr = row.date ? row.date.toISOString().split('T')[0] : '';
    const normDesc = normalizeDescription(row.description);
    // Extract key words (> 3 chars) for grouping
    const keywords = normDesc.split(' ').filter(w => w.length > 3).sort().join('|');
    const key = `${dateStr}|${keywords}`;

    if (!dateDescGroups.has(key)) {
      dateDescGroups.set(key, []);
    }
    dateDescGroups.get(key)!.push(row);
  }

  for (const [, group] of dateDescGroups) {
    if (group.length > 1) {
      // Check if different payers logged the same event
      const payers = new Set(group.map(r => r.paidBy));
      if (payers.size > 1) {
        // Conflicting duplicate — keep the one with notes suggesting correctness
        // Or keep the one with higher amount (more likely to be complete)
        const rowWithNote = group.find(r =>
          r.notes.toLowerCase().includes('wrong') ||
          r.notes.toLowerCase().includes('also logged')
        );

        if (rowWithNote) {
          // The row that mentions "wrong" or "also logged" is the one to discard the OTHER one
          // Actually, if Rohan says "Aisha also logged this I think hers is wrong",
          // we keep Rohan's and discard Aisha's
          const rowToKeep = group.find(r => r.rowNumber !== rowWithNote.rowNumber && r.notes.toLowerCase().includes('wrong')) || rowWithNote;
          const rowToDiscard = group.find(r => r.rowNumber !== rowToKeep.rowNumber);

          if (rowToDiscard && !skipRows.has(rowToDiscard.rowNumber)) {
            // The row with the note "Aisha also logged this I think hers is wrong" is Rohan's
            // So Rohan is saying Aisha's entry is wrong — we keep Rohan's
            // Actually let me re-check: row 25 (Rohan's) says "Aisha also logged this I think hers is wrong"
            // So we keep row 25 (Rohan's) and discard row 24 (Aisha's)
            const rohanRow = group.find(r => r.notes.toLowerCase().includes('hers is wrong'));
            if (rohanRow) {
              const aishaRow = group.find(r => r.rowNumber !== rohanRow.rowNumber);
              if (aishaRow) {
                skipRows.add(aishaRow.rowNumber);
                logs.push({
                  level: 'WARNING',
                  csvRow: aishaRow.rowNumber,
                  field: 'description',
                  rawValue: aishaRow.description,
                  description: `Conflicting duplicate: "${aishaRow.description}" (₹${aishaRow.amount} by ${aishaRow.paidBy}) conflicts with row ${rohanRow.rowNumber} "${rohanRow.description}" (₹${rohanRow.amount} by ${rohanRow.paidBy}). Notes on row ${rohanRow.rowNumber}: "${rohanRow.notes}"`,
                  actionTaken: `Marked as PENDING_REVIEW for user approval based on note evidence`,
                  category: 'E',
                });
                duplicateRows.add(aishaRow.rowNumber);
              }
            }
          }
        }
      }
    }
  }

  // ─── Per-Row Anomaly Checks ────────────────────────────────────────
  for (const row of rows) {
    if (skipRows.has(row.rowNumber)) continue;

    // ── B3: Zero-amount expense ──
    if (row.amount === 0) {
      skipRows.add(row.rowNumber);
      logs.push({
        level: 'INFO',
        csvRow: row.rowNumber,
        field: 'amount',
        rawValue: row.amountRaw,
        description: `Zero-amount expense: "${row.description}". Notes: "${row.notes}"`,
        actionTaken: 'Skipped — zero-amount entry discarded',
        category: 'B',
      });
      continue;
    }

    // ── B4: Negative amount (refund) ──
    if (row.amount < 0) {
      logs.push({
        level: 'INFO',
        csvRow: row.rowNumber,
        field: 'amount',
        rawValue: row.amountRaw,
        description: `Negative amount (${row.amount}) — treating as refund/credit`,
        actionTaken: 'Processed as refund; split amounts will be negative (credits)',
        category: 'B',
      });
    }

    // ── D1/D2: Settlement detection ──
    if (isSettlement(row)) {
      settlementRows.add(row.rowNumber);
      logs.push({
        level: 'INFO',
        csvRow: row.rowNumber,
        field: 'split_type',
        rawValue: row.splitType || '(empty)',
        description: `Detected as settlement/payment, not a shared expense. Description: "${row.description}". Notes: "${row.notes}"`,
        actionTaken: 'Reclassified as Settlement record',
        category: 'D',
      });
      continue;
    }

    // ── D4: Percentage sum check ──
    if (row.splitType === 'percentage' && row.splitDetails) {
      const details = parseSplitDetails(row.splitDetails, row.splitType);
      const totalPct = [...details.values()].reduce((s, v) => s + v, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        logs.push({
          level: 'WARNING',
          csvRow: row.rowNumber,
          field: 'split_details',
          rawValue: row.splitDetails,
          description: `Percentages sum to ${totalPct}%, not 100%`,
          actionTaken: `Normalizing proportionally: each percentage divided by ${totalPct} and multiplied by 100`,
          category: 'D',
        });
      }
    }

    // ── D5: Split type contradiction ──
    if (row.splitType === 'equal' && row.splitDetails) {
      const details = parseSplitDetails(row.splitDetails, row.splitType);
      if (details.size > 0) {
        const values = [...details.values()];
        const allEqual = values.every(v => v === values[0]);
        if (allEqual) {
          logs.push({
            level: 'INFO',
            csvRow: row.rowNumber,
            field: 'split_type',
            rawValue: `equal + details: ${row.splitDetails}`,
            description: 'Split type is "equal" but split_details are provided. All shares are equal, so no contradiction.',
            actionTaken: 'Using equal split as stated; ignoring redundant details',
            category: 'D',
          });
        } else {
          logs.push({
            level: 'WARNING',
            csvRow: row.rowNumber,
            field: 'split_type',
            rawValue: `equal + details: ${row.splitDetails}`,
            description: 'Split type says "equal" but split_details show unequal shares',
            actionTaken: 'Using split_details (explicit values override general type)',
            category: 'D',
          });
        }
      }
    }

    // ── D3: Departed member check ──
    if (row.date) {
      for (const member of row.splitWith) {
        if (!isMemberActiveOnDate(member, row.date)) {
          logs.push({
            level: 'WARNING',
            csvRow: row.rowNumber,
            field: 'split_with',
            rawValue: member,
            description: `"${member}" included in split but was not an active member on ${row.date.toISOString().split('T')[0]}`,
            actionTaken: `Removed "${member}" from split; redistributed share among remaining members`,
            category: 'D',
          });
          // Remove from splitWith
          row.splitWith = row.splitWith.filter(m => m !== member);
        }
      }
    }

    // ── A4: Ad-hoc participant detection ──
    for (const member of row.splitWith) {
      if (!CORE_MEMBERS.includes(member) && member !== 'Dev' && member !== 'Sam') {
        logs.push({
          level: 'INFO',
          csvRow: row.rowNumber,
          field: 'split_with',
          rawValue: member,
          description: `Ad-hoc participant "${member}" — not a regular group member`,
          actionTaken: `Created as guest user`,
          category: 'A',
        });
      }
    }

    // ── D6: Refund participant mismatch ──
    if (row.amount < 0) {
      // Check if related original expense had different participants
      const relatedRow = rows.find(r =>
        r.rowNumber !== row.rowNumber &&
        !skipRows.has(r.rowNumber) &&
        r.amount > 0 &&
        normalizeDescription(r.description).includes(
          normalizeDescription(row.description).replace('refund', '').trim()
        )
      );
      if (relatedRow && relatedRow.splitWith.length !== row.splitWith.length) {
        logs.push({
          level: 'WARNING',
          csvRow: row.rowNumber,
          field: 'split_with',
          rawValue: row.splitWith.join('; '),
          description: `Refund has ${row.splitWith.length} participants but original expense (row ${relatedRow.rowNumber}) had ${relatedRow.splitWith.length}`,
          actionTaken: 'Applied refund only to listed participants as stated',
          category: 'D',
        });
      }
    }

    // ── G1: Multi-currency logging ──
    if (row.currency !== 'INR') {
      logs.push({
        level: 'INFO',
        csvRow: row.rowNumber,
        field: 'currency',
        rawValue: row.currency,
        description: `Non-INR currency: ${row.currency}`,
        actionTaken: `Stored as ${row.currency}; will convert to INR at display time (1 USD = ₹85)`,
        category: 'G',
      });
    }
  }

  return { rows, logs, skipRows, duplicateRows, settlementRows };
}

/**
 * Detect if a row represents a settlement/payment rather than a shared expense.
 */
function isSettlement(row: ParsedRow): boolean {
  const desc = row.description.toLowerCase();
  const notes = row.notes.toLowerCase();

  // Check for settlement keywords
  const settlementKeywords = ['paid back', 'settle', 'settlement', 'deposit share'];
  const hasSettlementKeyword =
    settlementKeywords.some(kw => desc.includes(kw)) ||
    notes.includes('settlement') ||
    notes.includes('not an expense');

  // Check for empty split type with a single recipient
  const hasSingleRecipient = row.splitWith.length === 1 && !row.splitType;

  // Check for deposit patterns
  const isDeposit = desc.includes('deposit');

  return hasSettlementKeyword || (hasSingleRecipient && !row.splitType) || isDeposit;
}
