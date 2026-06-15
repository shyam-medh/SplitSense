import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
});

async function init() {
  const { sql } = await import('./src/lib/db.js');
  try {
    console.log("Reading schema...");
    const schema = fs.readFileSync(path.join(process.cwd(), 'src/db/schema.sql'), 'utf-8');
    console.log("Executing schema...");
    await sql.unsafe(schema);
    console.log("Schema created successfully!");
  } catch (error) {
    console.error("Failed to create schema:", error);
  } finally {
    process.exit(0);
  }
}

init();
