# CCSA Mobile API - TypeScript Migration

This project is a migration of the legacy `ccsa-mobile-api` to a modern stack using Next.js 15+, TypeScript, and Tailwind CSS v4.

## 📚 Documentation

- [Migration Plan](./MIGRATION_PLAN.md) - Detailed step-by-step guide for the migration.
- [Legacy Project](../ccsa-mobile-api/README.md) - Reference to the original project.

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Environment**:
   Copy `.env.local.example` to `.env.local` and fill in the values.

3. **Database Setup**:
   ```bash
   npx prisma generate
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🏗 Project Structure

- `app/`: App Router pages and API routes.
- `components/`: React components (TypeScript).
- `lib/`: Utility functions and shared logic.
- `prisma/`: Database schema and migrations.
- `store/`: Zustand state management.
