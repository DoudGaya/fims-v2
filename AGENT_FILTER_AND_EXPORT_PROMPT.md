# Agent Advanced Filtering & Export Implementation Guide

## Objective
Enhance the Agents module to support filtering by location and farmer registration performance over specific timeframes, with export capabilities.

## 1. Backend API Updates
**Files:** 
- `app/api/agents/route.ts`
- `app/api/agents/export/route.ts`

### Requirements:
1. **New Query Parameters**:
   - `startDate` (ISO Date string)
   - `endDate` (ISO Date string)
   - `state` (string)
   - `lga` (string)

2. **Location Filtering**:
   - Filter `User` records where the related `agent` profile matches the provided `state` or `lga`.
   - Fields to check: `agent.assignedState` / `agent.assignedLGA` (preferred) or `agent.state` / `agent.localGovernment`.

3. **Dynamic Farmer Counts**:
   - The current `_count.farmers` returns the total lifetime count.
   - **Feature**: If `startDate` or `endDate` is present, the associated `farmers` count must be filtered by `createdAt` within that range.
   - *Implementation Hint*:
     ```typescript
     include: {
       _count: {
         select: {
           farmers: {
             where: {
               createdAt: {
                 gte: startDate ? new Date(startDate) : undefined,
                 lte: endDate ? new Date(endDate) : undefined
               }
             }
           }
         }
       }
     }
     ```

4. **Export Logic**:
   - Ensure `GET /api/agents/export` accepts the same parameters.
   - The CSV column "Registrations Count" should reflect the filtered count (e.g., registrations within the selected month), not the total lifetime count.

## 2. Frontend Updates
**File:** `app/(dashboard)/agents/AgentsClient.tsx` (and related components)

1. **Filter UI**:
   - Add a **Date Range Picker** (Start Date / End Date).
   - Add **State** and **LGA** dropdowns (Consider fetching available states/LGAs from existing location APIs like `/api/locations/states`).

2. **Table Updates**:
   - Ensure the "Registrations" column displays the count returned from the API (which will now be context-aware based on the date filter).
   - Ideally, show a label indicating the timeframe if filtered (e.g., "Regs (Jan 2026)").

3. **Integration**:
   - Update the `useSWR` or fetch hook to include the new query parameters.
   - Update the "Export CSV" button URL to include the current filter parameters so the generated report matches the on-screen data.

## 3. Acceptance Criteria
- [ ] User can select a date range (e.g., "Last Month").
- [ ] User can select a specific State/LGA.
- [ ] The list of agents updates to show only those matching the location.
- [ ] The "Registrations" count next to each agent reflects ONLY farmers registered during the selected date range.
- [ ] Clicking "Export" downloads a CSV containing the filtered data and the specific counts for that period.