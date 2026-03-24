import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'FIMS API Documentation | CCSA',
  description:
    'Official documentation for the CCSA Farmer Information Management System (FIMS) Public REST API. Learn how to authenticate, query farmer and farm records, and integrate with FIMS data.',
};

/* ─── small UI helpers ─────────────────────────────────────────── */

function Heading({ level, id, children }: { level: 2 | 3; id: string; children: React.ReactNode }) {
  if (level === 2)
    return (
      <h2 id={id} className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        {children}
      </h2>
    );
  return (
    <h3 id={id} className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-8 mb-3">
      {children}
    </h3>
  );
}

function Code({ children }: { children: string }) {
  return (
    <code className="bg-gray-100 dark:bg-gray-800 text-[#013358] dark:text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto my-4 leading-relaxed border border-gray-700 dark:border-gray-800">
      <code>{children.trim()}</code>
    </pre>
  );
}

function Badge({ children, color = 'green' }: { children: React.ReactNode; color?: 'green' | 'blue' | 'yellow' | 'red' | 'navy' }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    navy: 'bg-[#013358]/10 dark:bg-blue-900/30 text-[#013358] dark:text-blue-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function Alert({ type, children }: { type: 'info' | 'warning'; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-lg p-4 my-4 text-sm ${
        type === 'warning'
          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200'
      }`}
    >
      {children}
    </div>
  );
}

function Endpoint({
  method,
  path,
  scope,
  description,
  params,
  example,
}: {
  method: 'GET' | 'POST';
  path: string;
  scope: string;
  description: string;
  params?: { name: string; type: string; required?: boolean; description: string }[];
  example: string;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden my-6">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <Badge color="green">{method}</Badge>
        <code className="font-mono text-sm text-gray-900 dark:text-gray-100">{path}</code>
        <span className="ml-auto">
          <Badge color="navy">{scope}</Badge>
        </span>
      </div>
      <div className="px-4 py-4 bg-white dark:bg-gray-900/30">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>
        {params && params.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Query Parameters</p>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-gray-700">
                  <th className="py-1 pr-4 font-medium text-gray-700 dark:text-gray-300">Parameter</th>
                  <th className="py-1 pr-4 font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="py-1 pr-4 font-medium text-gray-700 dark:text-gray-300">Required</th>
                  <th className="py-1 font-medium text-gray-700 dark:text-gray-300">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 dark:text-gray-400">
                {params.map((p) => (
                  <tr key={p.name} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-1.5 pr-4 font-mono text-xs text-[#013358] dark:text-blue-300">{p.name}</td>
                    <td className="py-1.5 pr-4">{p.type}</td>
                    <td className="py-1.5 pr-4">{p.required ? 'Yes' : 'No'}</td>
                    <td className="py-1.5">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Example Request</p>
        <CodeBlock>{example}</CodeBlock>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

const BASE = 'https://fims.cosmopolitan.edu.ng';

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-[#013358] text-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className=" backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center">
              <div className="relative h-7 w-20 shrink-0">
                <Image src="/ccsa-logo.png" alt="CCSA" fill className="object-contain object-left" sizes="80px" priority />
              </div>
            </div>
            <div className="h-px sm:h-6 sm:w-px bg-white/20" />
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-200">Developer Documentation</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-sm px-3 py-1 rounded-full mb-4">
            <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
            API v1 — Live
          </div>
          <h1 className="text-4xl font-bold mb-4">FIMS Public API</h1>
          <p className="text-emerald-100 text-lg max-w-2xl">
            Programmatic access to farmer registration, farm capture, cluster and
            analytics data from the CCSA Farmer Information Management System.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
                          href={`${BASE}/api/v1/openapi.json`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#013358] font-medium text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Download OpenAPI Spec
            </a>
            <Link
              href="/access"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              Request an API Key
            </Link>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="max-w-5xl mx-auto px-6 py-10 flex gap-10">
        {/* Sidebar nav */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="sticky top-20 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Contents</p>
            <ul className="space-y-1.5 text-gray-600 dark:text-gray-400">
              {[
                ['#overview', 'Overview'],
                ['#auth', 'Authentication'],
                ['#rate-limits', 'Rate Limits'],
                ['#sensitive-fields', 'Sensitive Fields'],
                ['#farmers', 'Farmers'],
                ['#farms', 'Farms'],
                ['#clusters', 'Clusters'],
                ['#analytics', 'Analytics'],
                ['#errors', 'Error Codes'],
                ['#changelog', 'Changelog'],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="hover:text-[#013358] dark:hover:text-blue-300 transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 text-gray-700 dark:text-gray-300">
          {/* ── Overview ─────────────────────────────────────────── */}
          <Heading level={2} id="overview">Overview</Heading>
          <p>
            The FIMS API is a read-only REST API that exposes farmer registration, farm capture,
            cluster and aggregated analytics data. All responses are JSON.
          </p>

          <table className="w-full text-sm my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <tbody>
              {[
                ['Base URL', BASE],
                ['API Version', 'v1'],
                ['Protocol', 'HTTPS only'],
                ['Format', 'JSON'],
                ['Auth', 'API Key (Bearer or X-API-Key header)'],
                ['OpenAPI Spec', `${BASE}/api/v1/openapi.json`],
                ['Support', 'api@cosmopolitan.edu.ng'],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="py-2 px-4 font-medium bg-gray-50 dark:bg-gray-800 w-40">{k}</td>
                  <td className="py-2 px-4 font-mono text-xs break-all">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Authentication ───────────────────────────────────── */}
          <Heading level={2} id="auth">Authentication</Heading>
          <p>
            Every request to <Code>/api/v1/*</Code> must include a valid API token.
            Tokens are issued by a CCSA system administrator and take the format{' '}
            <Code>fims_live_&#123;64 hex chars&#125;</Code>.
          </p>
          <p className="mt-3">Pass your token in one of two ways:</p>

          <Heading level={3} id="auth-bearer">Option A — Authorization header (recommended)</Heading>
          <CodeBlock>{`curl ${BASE}/api/v1/farmers \\
  -H "Authorization: Bearer fims_live_abc123..."`}</CodeBlock>

          <Heading level={3} id="auth-header">Option B — X-API-Key header</Heading>
          <CodeBlock>{`curl ${BASE}/api/v1/farmers \\
  -H "X-API-Key: fims_live_abc123..."`}</CodeBlock>

          <Alert type="info">
            To request an API key,{' '}
            <Link href="/access" className="font-semibold underline">submit an access request</Link>
            {' '}or email{' '}
            <strong>api@cosmopolitan.edu.ng</strong> with your organisation name,
            intended use-case, and the scopes you require
            (<Code>farmers:read</Code>, <Code>farms:read</Code>,{' '}
            <Code>clusters:read</Code>, <Code>analytics:read</Code>).
          </Alert>

          {/* ── Scopes ───────────────────────────────────────────── */}
          <Heading level={2} id="scopes">Scopes</Heading>
          <p>
            Each API key is granted specific scopes. Calling an endpoint that requires
            a scope your token does not have returns a <Code>403 Forbidden</Code>.
          </p>
          <table className="w-full text-sm my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Scope</th>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Endpoints unlocked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                ['farmers:read', 'GET /api/v1/farmers, GET /api/v1/farmers/:id'],
                ['farms:read', 'GET /api/v1/farms, GET /api/v1/farms/:id'],
                ['clusters:read', 'GET /api/v1/clusters, GET /api/v1/clusters/:id'],
                ['analytics:read', 'GET /api/v1/analytics'],
              ].map(([scope, endpoints]) => (
                <tr key={scope}>
                  <td className="py-2 px-4 font-mono text-xs text-[#013358] dark:text-blue-300">{scope}</td>
                  <td className="py-2 px-4 text-gray-600 dark:text-gray-400">{endpoints}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Rate Limits ──────────────────────────────────────── */}
          <Heading level={2} id="rate-limits">Rate Limits</Heading>
          <p>
            Rate limits are enforced per API key using a 60-second sliding window.
            Your token&apos;s limit is configured at creation time.
          </p>
          <table className="w-full text-sm my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Tier</th>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Requests / minute</th>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Typical use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                ['Standard', '100', 'Research, dashboards, ad-hoc queries'],
                ['High-Volume Partner', '500', 'Automated data pipelines, government integrations'],
                ['Custom', 'Configured per key', 'Contact CCSA admin'],
              ].map(([tier, rps, use]) => (
                <tr key={tier}>
                  <td className="py-2 px-4 font-medium">{tier}</td>
                  <td className="py-2 px-4">{rps}</td>
                  <td className="py-2 px-4 text-gray-600 dark:text-gray-400">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            When the limit is exceeded the API responds with{' '}
            <Code>429 Too Many Requests</Code> and a <Code>Retry-After: 60</Code>{' '}
            header. Implement exponential back-off in your client.
          </p>

          {/* ── Sensitive Fields ─────────────────────────────────── */}
          <Heading level={2} id="sensitive-fields">Sensitive Fields & Privacy</Heading>
          <Alert type="warning">
            <strong>⚠️ Privacy notice:</strong> By default, identity, financial and contact
            fields are redacted from all API responses. Only a CCSA administrator can
            enable sensitive field access on a token, and only for verified internal CCSA products.
          </Alert>
          <p>
            Every response includes a <Code>meta.sensitiveFieldsExposed</Code> boolean
            and a <Code>meta.redactedGroups</Code> list so you always know exactly
            which fields are being withheld.
          </p>
          <table className="w-full text-sm my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Group</th>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Fields</th>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Default</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                ['identity', 'nin', 'Redacted'],
                ['financial', 'bvn, bankName, accountNumber, accountName', 'Redacted'],
                ['contact', 'phone, email, whatsAppNumber', 'Redacted'],
              ].map(([group, fields, def]) => (
                <tr key={group}>
                  <td className="py-2 px-4 font-mono text-xs text-[#013358] dark:text-blue-300">{group}</td>
                  <td className="py-2 px-4 font-mono text-xs">{fields}</td>
                  <td className="py-2 px-4">
                    <Badge color="yellow">{def}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Farmers ──────────────────────────────────────────── */}
          <Heading level={2} id="farmers">Farmers</Heading>

          <Endpoint
            method="GET"
            path="/api/v1/farmers"
            scope="farmers:read"
            description="Returns a paginated list of registered farmers. Supports multiple filters."
            params={[
              { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
              { name: 'limit', type: 'integer', description: 'Per-page count, max 200 (default: 50)' },
              { name: 'search', type: 'string', description: 'Search by first or last name' },
              { name: 'state', type: 'string', description: 'Filter by state name (case-insensitive)' },
              { name: 'lga', type: 'string', description: 'Filter by local government area' },
              { name: 'cluster', type: 'string', description: 'Filter by cluster ID' },
              { name: 'status', type: 'string', description: 'Enrolled | FarmCaptured | Validated | Verified | Rejected' },
              { name: 'startDate', type: 'date', description: 'Registration date from (ISO 8601)' },
              { name: 'endDate', type: 'date', description: 'Registration date to (ISO 8601)' },
            ]}
            example={`curl "${BASE}/api/v1/farmers?state=Kano&status=Enrolled&limit=20" \\
  -H "X-API-Key: fims_live_abc123..."`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/farmers/:id"
            scope="farmers:read"
            description="Fetch a single farmer by their FIMS ID, including their registered farms and cluster."
            example={`curl "${BASE}/api/v1/farmers/clxqp8yzf0000..." \\
  -H "X-API-Key: fims_live_abc123..."`}
          />

          <p className="text-sm bg-gray-50 dark:bg-gray-800/50 rounded p-3 text-gray-700 dark:text-gray-300">
            <strong>Sample response (sensitive fields redacted):</strong>
          </p>
          <CodeBlock>{`{
  "data": {
    "id": "clxqp8yzf0000abc",
    "firstName": "Aminu",
    "middleName": null,
    "lastName": "Suleiman",
    "gender": "Male",
    "state": "Kano",
    "lga": "Kano Municipal",
    "ward": "Fagge",
    "status": "Enrolled",
    "registrationDate": "2025-03-01T08:00:00.000Z",
    "nin": null,
    "bvn": null,
    "phone": null,
    "email": null,
    "cluster": { "id": "clust_001", "title": "Kano North Cluster" },
    "farms": [ { "id": "farm_001", "primaryCrop": "Maize", "farmSize": 2.5 } ]
  },
  "meta": {
    "sensitiveFieldsExposed": false,
    "redactedGroups": ["identity", "financial", "contact"],
    "note": "Identity, financial and contact fields are redacted."
  }
}`}</CodeBlock>

          {/* ── Farms ────────────────────────────────────────────── */}
          <Heading level={2} id="farms">Farms</Heading>

          <Endpoint
            method="GET"
            path="/api/v1/farms"
            scope="farms:read"
            description="Returns paginated farm records. Farm boundary polygon data is excluded from public API responses."
            params={[
              { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
              { name: 'limit', type: 'integer', description: 'Per-page count, max 200 (default: 50)' },
              { name: 'farmerId', type: 'string', description: 'Filter by farmer ID' },
              { name: 'state', type: 'string', description: 'Filter by farm state' },
              { name: 'crop', type: 'string', description: 'Filter by primary crop (case-insensitive)' },
              { name: 'season', type: 'string', description: 'Filter by farming season' },
            ]}
            example={`curl "${BASE}/api/v1/farms?state=Katsina&crop=Sorghum&limit=20" \\
  -H "X-API-Key: fims_live_abc123..."`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/farms/:id"
            scope="farms:read"
            description="Fetch a single farm by ID, including basic farmer info (sensitive fields subject to token settings)."
            example={`curl "${BASE}/api/v1/farms/farm_clxqp001" \\
  -H "X-API-Key: fims_live_abc123..."`}
          />

          {/* ── Clusters ─────────────────────────────────────────── */}
          <Heading level={2} id="clusters">Clusters</Heading>

          <Endpoint
            method="GET"
            path="/api/v1/clusters"
            scope="clusters:read"
            description="List all farmer clusters with summary statistics."
            params={[
              { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
              { name: 'limit', type: 'integer', description: 'Max 200 (default: 50)' },
              { name: 'search', type: 'string', description: 'Filter by cluster title' },
              { name: 'active', type: 'boolean', description: '"true" or "false" to filter by active status' },
            ]}
            example={`curl "${BASE}/api/v1/clusters?active=true" \\
  -H "X-API-Key: fims_live_abc123..."`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/clusters/:id"
            scope="clusters:read"
            description="Fetch a single cluster with a paginated list of its enrolled farmers."
            params={[
              { name: 'page', type: 'integer', description: 'Farmer list page (default: 1)' },
              { name: 'limit', type: 'integer', description: 'Farmers per page, max 100 (default: 20)' },
            ]}
            example={`curl "${BASE}/api/v1/clusters/clust_001?limit=10" \\
  -H "X-API-Key: fims_live_abc123..."`}
          />

          {/* ── Analytics ────────────────────────────────────────── */}
          <Heading level={2} id="analytics">Analytics</Heading>

          <Endpoint
            method="GET"
            path="/api/v1/analytics"
            scope="analytics:read"
            description="Aggregated summary: total farmers, total farms, farmers by state, farmers by gender, top crops, seasonal breakdown. Cached for 10 minutes. No PII is included."
            example={`curl "${BASE}/api/v1/analytics" \\
  -H "X-API-Key: fims_live_abc123..."`}
          />

          <CodeBlock>{`{
  "data": {
    "summary": {
      "totalFarmers": 154820,
      "totalFarms": 142100,
      "totalClusters": 48,
      "totalFarmAreaHectares": 289450.5,
      "averageFarmSizeHectares": 2.04
    },
    "farmersByState": [
      { "state": "Kano", "count": 42100 },
      { "state": "Katsina", "count": 31200 }
    ],
    "farmersByGender": [
      { "gender": "Male", "count": 120400 },
      { "gender": "Female", "count": 34420 }
    ],
    "topCrops": [
      { "crop": "Maize", "farmCount": 58000 },
      { "crop": "Sorghum", "farmCount": 41200 }
    ]
  }
}`}</CodeBlock>

          {/* ── Error Codes ──────────────────────────────────────── */}
          <Heading level={2} id="errors">Error Codes</Heading>
          <table className="w-full text-sm my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Meaning</th>
                <th className="py-2 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Common cause</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                ['401', 'Unauthorized', 'yellow', 'Missing, invalid, expired, or revoked API key'],
                ['403', 'Forbidden', 'yellow', 'Your token does not have the required scope for this endpoint'],
                ['404', 'Not Found', 'yellow', 'The requested record does not exist'],
                ['422', 'Unprocessable Entity', 'yellow', 'Invalid query parameters'],
                ['429', 'Too Many Requests', 'red', 'Rate limit exceeded — check Retry-After header'],
                ['500', 'Internal Server Error', 'red', 'Server-side error — contact CCSA support'],
              ].map(([code, meaning, badgeColor, cause]) => (
                <tr key={code}>
                  <td className="py-2 px-4 font-mono text-sm"><Badge color={code === '200' ? 'green' : code.startsWith('4') ? 'yellow' : 'red'}>{code}</Badge></td>
                  <td className="py-2 px-4 font-medium">{meaning}</td>
                  <td className="py-2 px-4 text-gray-600 dark:text-gray-400">{cause}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-sm">All errors follow this envelope:</p>
          <CodeBlock>{`{
  "error": "Forbidden",
  "message": "Your API key does not have the \\"farms:read\\" scope required for this endpoint.",
  "yourScopes": ["farmers:read", "analytics:read"]
}`}</CodeBlock>

          {/* ── Changelog ────────────────────────────────────────── */}
          <Heading level={2} id="changelog">Changelog</Heading>
          <ul className="text-sm space-y-2 list-none">
            <li className="flex gap-3">
              <span className="text-gray-400 shrink-0">2026-03-24</span>
              <span><strong>v1.0.0 — Initial release.</strong> Farmers, Farms, Clusters, Analytics endpoints. Token-based auth with granular scopes and per-key rate limiting.</span>
            </li>
          </ul>

          <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Centre for Climate Smart Agriculture (CCSA), Cosmopolitan University Abuja.
            All rights reserved.{' '}
            <a href="mailto:api@cosmopolitan.edu.ng" className="text-[#013358] dark:text-blue-300 hover:underline">
              api@cosmopolitan.edu.ng
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
