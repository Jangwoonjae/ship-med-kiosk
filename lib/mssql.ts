import sql from 'mssql';

const config = {
  server: process.env.MSSQL_HOST,
  port: parseInt(process.env.MSSQL_PORT ?? '1433'),
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASS,
  database: process.env.MSSQL_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 10000,
    requestTimeout: 10000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getMssqlPool() {
  if (pool && pool.connected) return pool;
  pool = await sql.connect(config as sql.config);
  return pool;
}

export { sql };
