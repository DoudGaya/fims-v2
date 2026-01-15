# CCSA Mobile API - TypeScript Migration Plan

This document outlines the comprehensive plan for migrating the legacy `ccsa-mobile-api` (JavaScript/Pages Router) to `ccsa-mobile-api-ts` (TypeScript/App Router/Next.js 15+).

## 🎯 Objective
Re-write the existing backend and dashboard application to use modern technologies:
- **Language**: TypeScript for type safety and better developer experience.
- **Framework**: Next.js 15+ (App Router) for improved performance and server components.
- **Styling**: Tailwind CSS v4.
- **State Management**: Zustand (Typed).
- **Database**: Prisma ORM (Typed).

## 🛠 Phase 1: Project Initialization & Dependencies

### 1.1 Install Dependencies
We need to install the core dependencies used in the legacy project, along with their type definitions.

```bash
# Core Dependencies
npm install @prisma/client @supabase/supabase-js firebase-admin bcryptjs
npm install date-fns chart.js chartjs-adapter-date-fns
npm install @heroicons/react @radix-ui/react-icons
npm install react-hook-form @hookform/resolvers zod
npm install @react-google-maps/api
npm install africastalking
npm install clsx tailwind-merge # Utilities for class names

# Dev Dependencies & Types
npm install -D prisma
npm install -D @types/bcryptjs @types/node @types/react @types/react-dom
```

### 1.2 Environment Setup
1. Copy `.env` from the legacy project to `.env.local` in the new project.
2. Validate all environment variables are present.

### 1.3 Database Setup (Prisma)
1. Initialize Prisma: `npx prisma init`
2. Copy the content of `ccsa-mobile-api/prisma/schema.prisma` to `ccsa-mobile-api-ts/prisma/schema.prisma`.
3. Generate the client: `npx prisma generate`.

## 🏗 Phase 2: Core Infrastructure Migration

### 2.1 Lib & Utilities (`/lib`)
Migrate helper functions from JavaScript to TypeScript.
- **`lib/prisma.ts`**: Create a singleton Prisma client instance.
- **`lib/utils.ts`**: General utility functions (class merging, formatting).
- **`lib/auth.ts`**: Authentication helpers (JWT handling, password hashing).
- **`lib/firebase-admin.ts`**: Typed Firebase Admin initialization.
- **`lib/supabase.ts`**: Typed Supabase client initialization.

### 2.2 State Management (`/store`)
Migrate Zustand stores to TypeScript.
- Define interfaces for State and Actions.
- Example: `useUserStore.ts` should have a `UserState` interface.

## 🚀 Phase 3: API Migration (Backend)

The legacy project uses `pages/api/*`. We will migrate these to `app/api/*/route.ts` (Route Handlers).

### Strategy
1. **Request Validation**: Use `zod` to validate incoming JSON bodies.
2. **Response Typing**: Define standard `ApiResponse<T>` interfaces.
3. **Error Handling**: Create a centralized error handler or wrapper function.

### Key Endpoints to Migrate
- `auth/*` -> `app/api/auth/[...nextauth]/route.ts` (or custom auth routes).
- `users/*` -> `app/api/users/route.ts` (GET, POST), `app/api/users/[id]/route.ts` (PUT, DELETE).
- `farmers/*` -> `app/api/farmers/route.ts`.
- `farms/*` -> `app/api/farms/route.ts`.
- `reports/*` -> `app/api/reports/route.ts`.

## 💻 Phase 4: Frontend Migration (Dashboard)

The legacy project uses `pages/*`. We will migrate these to `app/*`.

### Strategy
- **Layouts**: Move `_app.js` and `_document.js` logic to `app/layout.tsx`.
- **Server Components**: Fetch data directly in `page.tsx` where possible (replacing `getServerSideProps`).
- **Client Components**: Mark interactive components (forms, charts) with `'use client'`.

### Component Migration (`/components`)
- Convert `.js` components to `.tsx`.
- Define `interface Props` for all components.
- Replace `<img>` with `next/image`.
- Replace `<a>` with `next/link`.

## 🧪 Phase 5: Quality Assurance

1. **Type Checking**: Run `tsc --noEmit` to ensure no type errors.
2. **Linting**: Run `npm run lint`.
3. **Testing**: (Optional but recommended) Setup Jest or Vitest for unit testing critical logic.

## 📂 Folder Structure Target

```
ccsa-mobile-api-ts/
├── app/
│   ├── api/              # API Route Handlers
│   │   ├── auth/
│   │   ├── users/
│   │   └── ...
│   ├── (dashboard)/      # Protected Dashboard Routes
│   │   ├── dashboard/
│   │   ├── farmers/
│   │   └── ...
│   ├── login/            # Public Login Page
│   ├── layout.tsx        # Root Layout
│   └── page.tsx          # Home/Landing
├── components/           # UI Components
│   ├── ui/               # Reusable UI elements (Buttons, Inputs)
│   ├── farmers/          # Farmer-specific components
│   └── ...
├── lib/                  # Utilities & Config
│   ├── prisma.ts
│   ├── auth.ts
│   └── ...
├── store/                # Zustand Stores
├── types/                # Global Type Definitions
└── prisma/
    └── schema.prisma
```

## 📝 Next Steps
1. Execute **Phase 1** (Dependencies & Prisma).
2. Create the **Lib** files (Phase 2).
3. Migrate the **Auth** API endpoints first (Phase 3).
4. Build the **Login** page to verify Auth (Phase 4).
5. Iteratively migrate feature by feature (Users -> Farmers -> Farms).
