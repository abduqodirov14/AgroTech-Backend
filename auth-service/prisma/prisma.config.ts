import { defineConfig } from '@prisma/client/config';
import { config } from 'dotenv';

// Load environment variables
config();

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
