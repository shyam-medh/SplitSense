import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const SQL_SYSTEM_PROMPT = `
You are a Text-to-SQL assistant for an expense tracker app using SQLite (via Prisma).
Below is the EXACT database schema. Use ONLY these tables and columns:

Table "User":
  - "id" TEXT (PK)
  - "name" TEXT (UNIQUE) — e.g. 'Aisha', 'Rohan', 'Sam', 'Dev', 'Priya', 'Meera'
  - "isGuest" INTEGER (0 or 1)

Table "Group":
  - "id" TEXT (PK)
  - "name" TEXT

Table "GroupMember":
  - "id" TEXT (PK)
  - "groupId" TEXT (FK -> Group.id)
  - "userId" TEXT (FK -> User.id)
  - "joinedAt" TEXT (datetime)
  - "leftAt" TEXT (datetime, nullable)

Table "Expense":
  - "id" TEXT (PK)
  - "groupId" TEXT (FK -> Group.id)
  - "description" TEXT
  - "amount" REAL
  - "currency" TEXT (default 'INR')
  - "date" TEXT (datetime)
  - "paidById" TEXT (FK -> User.id, nullable)
  - "splitType" TEXT
  - "notes" TEXT (nullable)
  - "csvRow" INTEGER (nullable)
  - "isDuplicate" INTEGER (0 or 1, default 0)
  - "createdAt" TEXT (datetime)

Table "ExpenseSplit":
  - "id" TEXT (PK)
  - "expenseId" TEXT (FK -> Expense.id)
  - "userId" TEXT (FK -> User.id)
  - "amountOwed" REAL

Table "Settlement":
  - "id" TEXT (PK)
  - "groupId" TEXT (FK -> Group.id)
  - "payerId" TEXT (FK -> User.id)
  - "payeeId" TEXT (FK -> User.id)
  - "amount" REAL
  - "date" TEXT (datetime)
  - "notes" TEXT (nullable)
  - "csvRow" INTEGER (nullable)

Table "ImportLog":
  - "id" TEXT (PK)
  - "level" TEXT (e.g. 'ERROR', 'WARNING', 'INFO')
  - "csvRow" INTEGER (nullable)
  - "field" TEXT (nullable)
  - "rawValue" TEXT (nullable)
  - "description" TEXT
  - "actionTaken" TEXT
  - "category" TEXT

CRITICAL RULES:
1. Return ONLY a raw SQL SELECT query. No markdown, no backticks, no explanation, no comments.
2. Use double quotes for ALL table and column names: "User", "paidById", "Expense"
3. Boolean columns use INTEGER: 0 = false, 1 = true. Use "isDuplicate" = 0 to filter non-duplicates.
4. For name lookups, ALWAYS use case-insensitive: LOWER("name") = LOWER('Sam')
5. "paidById" is on the "Expense" table. It is NOT called "payerId" on Expense.
6. "payerId" and "payeeId" are ONLY on the "Settlement" table.
7. To calculate balances (who owes whom), NEVER JOIN Expense and ExpenseSplit directly as it causes Cartesian product multiplication. Instead, use subqueries:
   SELECT u.name, 
   COALESCE((SELECT SUM(amountOwed) FROM ExpenseSplit WHERE userId = u.id), 0) - 
   COALESCE((SELECT SUM(amount) FROM Expense WHERE paidById = u.id AND isDuplicate = 0), 0) AS balance
   FROM User u
8. Use CAST(COUNT(*) AS INTEGER) instead of COUNT(*) to avoid BigInt issues.
9. If the user asks about anomalies, errors, or logs, query the "ImportLog" table. You can match "description" or "rawValue".
10. If the user asks a general question, says hi, or types gibberish (e.g. "qwr", "ad"), DO NOT FAIL. Instead, return: SELECT 'chat' AS type, 'Respond conversationally' as action
11. To get group members, ALWAYS JOIN "Group", "GroupMember", and "User" and use ALIASES for conflicting columns. e.g. SELECT g.name AS groupName, u.name AS userName FROM "Group" g JOIN "GroupMember" gm ON g.id = gm.groupId JOIN "User" u ON u.id = gm.userId
12. If the user asks for a chart, graph, or plot, MUST include a column "__isChart" with value 1, and columns "label" (string) and "value" (number). e.g. SELECT 1 AS __isChart, u.name AS label, CAST(SUM(e.amount) AS INTEGER) AS value FROM "Expense" e JOIN "User" u ON u.id = e.paidById GROUP BY u.id
13. When searching for expenses by description or category (e.g. "flat expenses", "food expenses", "grocery"), ALWAYS use LIKE with wildcards for fuzzy matching: WHERE LOWER("description") LIKE '%rent%' OR LOWER("description") LIKE '%electricity%'. The word "flat" maps to household expenses like rent, electricity, wifi, maid salary, groceries, maintenance. Break the user's intent into multiple LIKE clauses.
14. When the user asks for "all details" or "all expenses" or "everything", return ALL expense columns with payer name: SELECT e."date", e."description", u."name" AS paidBy, e."amount", e."currency", e."splitType", e."notes" FROM "Expense" e LEFT JOIN "User" u ON u."id" = e."paidById" WHERE e."isDuplicate" = 0 ORDER BY e."date" DESC LIMIT 50
15. When the user asks a follow-up like "all details" or "show me more" after a previous query, repeat the previous query logic but return all columns. Do NOT interpret "all details" as a new search term.
`;

const ANSWER_SYSTEM_PROMPT = `You are a friendly, highly capable AI Data Analyst for an expense tracker app. 
You are speaking directly to the user.
Given the user's question, the SQL query used, and the raw results from the database, provide a natural language answer.
- If the user just said hi, or typed gibberish, respond conversationally and guide them on what they can ask about their expenses.
- Format currency amounts with ₹ symbol for INR.
- USE MARKDOWN for beautiful formatting! Use **bold text** for names and emphasis, use bullet points for lists, and use tables if returning multiple rows of data.
- If the data contains __isChart=1, just write a very short introductory sentence (e.g. "Here is the chart you requested:") and NOTHING ELSE. The UI will render the chart.
- Keep answers concise and helpful. Don't add weird notes like "(note: this is a settlement)". Just present the data clearly.
- If the database results are empty, just say you couldn't find matching records.
- Do NOT show SQL or JSON — just the answer in plain English.`;

/** Convert BigInt values to Number recursively so JSON.stringify works */
function serializeBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeBigInt(value);
    }
    return result;
  }
  return obj;
}

async function callGroq(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 512
) {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('Groq API error:', res.status, errBody);
    throw new Error(`AI service temporarily unavailable`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function cleanSQL(raw: string): string {
  return raw
    .replace(/^```sql\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/--.*$/gm, '')
    .trim();
}

async function executeSQLWithRetry(apiKey: string, sqlMessages: Array<{ role: string; content: string }>) {
  let sqlQuery = '';
  let dbResult: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const rawSQL = await callGroq(apiKey, sqlMessages);
    sqlQuery = cleanSQL(rawSQL);

    if (!sqlQuery.toLowerCase().startsWith('select')) {
      throw new Error('Only SELECT queries are allowed.');
    }

    try {
      dbResult = await sql.unsafe(sqlQuery);
      return { sqlQuery, dbResult };
    } catch (sqlError) {
      const sqlMsg = sqlError instanceof Error ? sqlError.message : String(sqlError);
      console.error(`SQL attempt ${attempt + 1} failed:`, sqlMsg);

      if (attempt === 0) {
        sqlMessages.push(
          { role: 'assistant', content: sqlQuery },
          { role: 'user', content: `That query failed with: ${sqlMsg}\n\nFix it. Remember:\n- "paidById" is on Expense (NOT "payerId")\n- Use LOWER() for name matching\n- Use CAST(COUNT(*) AS INTEGER)\n- Use double quotes for identifiers` }
        );
        continue;
      }
      throw new Error(`I couldn't query the data for that. Try rephrasing — e.g. "Show expenses paid by Rohan"`);
    }
  }
  return { sqlQuery, dbResult };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, history = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    // Step 1: Generate SQL
    const sqlMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: SQL_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: prompt },
    ];

    const { sqlQuery, dbResult } = await executeSQLWithRetry(apiKey, sqlMessages);

    // Serialize BigInt values
    const serialized = serializeBigInt(dbResult);

    // Step 2: Generate natural language answer from the data
    const answerMessages = [
      { role: 'system', content: ANSWER_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: `User asked: "${prompt}"\n\nSQL query used: ${sqlQuery}\n\nRaw results:\n${JSON.stringify(serialized, null, 2)}\n\nPlease give a natural language answer.` },
    ];

    const answer = await callGroq(apiKey, answerMessages, 1024);

    return NextResponse.json({
      query: sqlQuery,
      answer,
      data: serialized,
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
}
