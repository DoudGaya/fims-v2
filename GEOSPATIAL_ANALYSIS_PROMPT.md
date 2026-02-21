# Geospatial & Weather Analysis Implementation Guide

## Objective
Implement real-time weather and geospatial analysis (Soil pH, Moisture, NDVI, etc.) for farms using Google Earth Engine (GEE). This feature will be accessible via an "Analyze" button on both the Farmer Details page (Farms section) and the Farm Details page.

## Technical Architecture

### 1. User Interface (Frontend)
- **Locations**:
  - `app/(dashboard)/farmers/[id]/page.tsx`: Inside the "Farms" tab, within each farm's accordion item.
  - `app/(dashboard)/farms/[id]/page.tsx`: In the main content area (e.g., near the map or as a new tab).
- **Components**:
  - **Analyze Button**: A branded button (using `@/components/ui/button`) labeled "Analyze Farm".
  - **Analysis Panel/Modal**: A dialog or drawer that opens upon clicking "Analyze".
  - **Variable Selector**: Buttons/Tabs to switch between analysis types:
    - 🌤️ Weather (Real-time & Forecast)
    - 💧 Soil Moisture
    - 🧪 Soil pH
    - 🌿 Vegetation Health (NDVI)
    - 🌡️ Temperature History
  - **Visualization**: Charts (using `recharts` or `chart.js`) and summary statistics cards.
  - **Loading States**: Skeletons or spinners while GEE computes data.

### 2. Backend API
- **Route**: `POST /api/analysis`
  - **Payload**: `{ farmId, variable, dateRange, geometry }`
  - **Response**: `{ status, data: { current, history, stats }, meta }`
- **Authentication**: Protected via `next-auth` (use existing `getServerSession`).
- **Authorization**: Check permissions (same as `PERMISSIONS.FARMS_READ`).

### 3. Analysis Engine (Google Earth Engine)
- **Library**: `@google/earthengine`
- **Authentication**: Service Account (PrivateKey/ClientEmail from env vars).
- **Data Sources**:
  - **Weather**: *ECMWF ERA5* or *GFS* (or external API like Open-Meteo if GEE latency is high for real-time).
  - **Soil pH**: *OpenLandMap* (Solids/pH_1to5 water).
  - **Soil Moisture**: *NASA-USDA SMAP* or *SMAP*.
  - **NDVI**: *Sentinel-2* (cloud-filtered).

### 4. Data Persistence (Prisma)
- **Schema Update**: Create `FarmAnalysisCache` model to store expensive GEE computations.
  - Fields: `id`, `farmId`, `variable`, `dateRange`, `result` (JSON), `createdAt`.
- **Logic**: Check cache before calling GEE. Invalidate cache after X days (depending on variable).

## Implementation Steps

### Step 1: Database & Schema
- Update `prisma/schema.prisma` to add `FarmAnalysisResult`.
- Run `prisma generate` and `prisma migrate`.

### Step 2: Google Earth Engine Setup
- Create `lib/gee.ts` service:
  - Initialize GEE with Service Account.
  - Helper functions for specific analyses (`getSoilPH(geometry)`, `getNDVI(geometry, dateRange)`).

### Step 3: API Route Implementation
- Create `app/api/analysis/route.ts`.
- Handle validation, caching checks, and GEE execution.

### Step 4: UI Component Creation
- Create `components/analysis/AnalysisPanel.tsx`.
- Create `components/analysis/WeatherCard.tsx`, `components/analysis/SoilCard.tsx`, etc.
- Style using existing `shadcn` components (`Card`, `Button`, `Badge`, `Tabs`).

### Step 5: Integration
- Create hooks: `hooks/useFarmAnalysis.ts`.
- Add "Analyze" button to:
  - `app/(dashboard)/farmers/[id]/page.tsx`
  - `app/(dashboard)/farms/[id]/page.tsx`

## Design & Branding
- **Colors**: Use the existing CCSA palette (Greens, Navy Blues).
- **Typography**: Consistent with `app` fonts (Inter/Geist).
- **Feedback**: Use Toast notifications for success/errors.

## Environment Variables
Ensure the following are present/added:
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CLIENT_EMAIL`

---

*This guide serves as the prompt for the autonomous coding agent.*
