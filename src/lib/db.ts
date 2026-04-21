import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/generated/prisma/client'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
  // Resolve relative file paths against cwd so they work correctly in Next.js
  const url = dbUrl.startsWith('file:./')
    ? `file:${path.resolve(/*turbopackIgnore: true*/ process.cwd(), dbUrl.slice(5))}`
    : dbUrl
  const adapter = new PrismaBetterSqlite3({ url })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
