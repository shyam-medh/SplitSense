import postgres from 'postgres';

const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

export const sql =
  globalForPostgres.sql ??
  postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/spreetail');

if (process.env.NODE_ENV !== 'production') {
  globalForPostgres.sql = sql;
}
