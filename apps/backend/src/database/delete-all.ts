import 'dotenv/config';
import { Pool } from 'pg';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const PRESERVED_TABLES = new Set([
  '__drizzle_migrations',
  'roles',
]);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL tidak ditemukan di apps/backend/.env');
  }

  const database = new URL(databaseUrl);
  const databaseName = decodeURIComponent(database.pathname.slice(1));
  const isProduction = process.env.NODE_ENV === 'production';

  console.log('\n====================================');
  console.log('       UNEJ CMS - DELETE ALL');
  console.log('====================================');
  console.log(`Database : ${databaseName}`);
  console.log(`Host     : ${database.hostname}`);
  console.log(`Mode     : ${process.env.NODE_ENV ?? 'development'}`);
  console.log('\nData CMS akan dihapus permanen.');
  console.log('Tabel migration dan roles akan dipertahankan.\n');

  if (isProduction) {
    throw new Error(
      'Operasi delete:all diblokir pada production.',
    );
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const confirmation = await rl.question(
      'Ketik DELETE ALL untuk melanjutkan: ',
    );

    if (confirmation !== 'DELETE ALL') {
      console.log('Dibatalkan. Tidak ada data yang dihapus.');
      return;
    }
  } finally {
    rl.close();
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query<{
        tablename: string;
      }>(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      const tables = result.rows
        .map((row) => row.tablename)
        .filter((name) => !PRESERVED_TABLES.has(name));

      if (tables.length === 0) {
        console.log('Tidak ada tabel data yang perlu dibersihkan.');
        await client.query('COMMIT');
        return;
      }

      const quotedTables = tables
        .map(
          (name) =>
            `"public"."${name.replace(/"/g, '""')}"`,
        )
        .join(', ');

      await client.query(
        `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`,
      );

      await client.query('COMMIT');

      console.log(`\nBerhasil menghapus data dari ${tables.length} tabel:`);
      for (const table of tables) {
        console.log(`  - ${table}`);
      }

      console.log('\nReset database selesai.');
      console.log('Struktur tabel dan role tetap dipertahankan.');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('\nGagal menghapus data:', error);
  process.exitCode = 1;
});
