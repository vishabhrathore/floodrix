import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  seed: {
    run: 'tsx prisma/seed/seed.ts',
  },
});
