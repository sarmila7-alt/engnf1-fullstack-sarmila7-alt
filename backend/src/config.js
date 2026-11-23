import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const k of required) {
  if (!process.env[k]) throw new Error(`Missing env var ${k}`);
}

export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || '*',
};