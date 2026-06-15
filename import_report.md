# Import Report: CSV Ingestion Anomaly Log

**Timestamp:** 2024-06-15T09:42:11Z
**File Processed:** `spreetail_expenses_q2.csv`
**Total Rows Scanned:** 842
**Successfully Imported:** 835
**Total Anomalies Handled:** 7

---

## 🚨 Anomaly Detection Log

### 1. Absolute Duplicates (Dropped)
*The system detected rows that were already present in the database by computing a deterministic hash of the amount, date, payer, and description.*
- **Row 42:** `105.50` paid by `Alice` on `2024-04-12` for "Internet Bill". 
  - **Action Taken:** Skipped. Hash matched existing database record `exp_9921a`.
- **Row 215:** `45.00` paid by `Bob` on `2024-05-01` for "Water".
  - **Action Taken:** Skipped. Hash matched existing database record `exp_1142b`.

### 2. Missing or Corrupted Data (Dropped)
*The system detected rows missing critical mathematical data required for splits.*
- **Row 156:** Amount cell was empty (`null`).
  - **Action Taken:** Row dropped. Logged here for manual user correction.
- **Row 402:** Payer name was missing.
  - **Action Taken:** Row dropped. Cannot determine who is owed the money.

### 3. Missing Entities (Resolved On-The-Fly)
*The system encountered names in the CSV that did not exist in the database.*
- **Row 304:** Payee listed as "Charlie". No user with this name exists in the current Group.
  - **Action Taken:** Automatically generated a "Shadow Profile" for Charlie. Assigned Charlie a temporary UUID so the split math could complete successfully.

### 4. Z-Score Statistical Outliers (Flagged for Review)
*The system compared the expense amount against the historical mean (μ) and standard deviation (σ) for similar descriptions.*
- **Row 512:** `450.00` paid by `Alice` for "Electricity". 
  - **Historical Mean:** `$110.00` (σ = `$25.00`)
  - **Z-Score:** `13.6` (Highly anomalous)
  - **Action Taken:** Imported successfully, but flagged in the database with `requires_review = true`. Audit AI generated an alert for the user.
- **Row 788:** `900.00` paid by `Bob` for "Groceries".
  - **Historical Mean:** `$150.00` (σ = `$40.00`)
  - **Z-Score:** `18.7` (Highly anomalous)
  - **Action Taken:** Imported successfully, but flagged with `requires_review = true`.

---

**End of Report.** The 835 valid rows were batched and inserted via a single bulk Postgres transaction in 214ms.
