"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function keepDuplicateExpense(expenseId: string) {
  await sql`UPDATE "Expense" SET "isDuplicate" = false WHERE id = ${expenseId}`;
  revalidatePath('/anomalies');
  revalidatePath('/'); // Dashboard
}

export async function discardDuplicateExpense(expenseId: string) {
  await sql.begin(async sql => {
    await sql`DELETE FROM "ExpenseSplit" WHERE "expenseId" = ${expenseId}`;
    await sql`DELETE FROM "Expense" WHERE id = ${expenseId}`;
  });
  revalidatePath('/anomalies');
  revalidatePath('/'); // Dashboard
}
