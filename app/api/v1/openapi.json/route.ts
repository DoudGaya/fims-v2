import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/openapi.json
 *
 * Machine-readable OpenAPI 3.1 specification for the FIMS Public API.
 * No authentication required — this is a public discovery endpoint.
 * Import this URL into Postman, Insomnia, or any OpenAPI-compatible client.
 */
export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'FIMS Public API',
      version: '1.0.0',
      description:
        'Read-only REST API providing access to farmer, farm, cluster and analytics data from the CCSA Farmer Information Management System (FIMS). Maintained by the Centre for Cosmopolitan Studies and Agriculture (CCSA).',
      contact: {
        name: 'CCSA Technical Support',
        url: 'https://fims.cosmopolitan.edu.ng/docs',
      },
      license: {
        name: 'Proprietary',
        url: 'https://fims.cosmopolitan.edu.ng',
      },
    },
    servers: [
      {
        url: 'https://fims.cosmopolitan.edu.ng',
        description: 'Production',
      },
    ],
    security: [{ ApiKeyAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Your FIMS API token (format: fims_live_...)',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Alternatively use: Authorization: Bearer <token>',
        },
      },
      schemas: {
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
        FieldVisibilityMeta: {
          type: 'object',
          properties: {
            sensitiveFieldsExposed: { type: 'boolean' },
            redactedGroups: { type: 'array', items: { type: 'string' } },
            note: { type: 'string' },
          },
        },
        Farmer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            middleName: { type: 'string', nullable: true },
            lastName: { type: 'string' },
            gender: { type: 'string', nullable: true },
            dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
            state: { type: 'string', nullable: true },
            lga: { type: 'string', nullable: true },
            ward: { type: 'string', nullable: true },
            pollingUnit: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
            maritalStatus: { type: 'string', nullable: true },
            employmentStatus: { type: 'string', nullable: true },
            status: { type: 'string' },
            registrationDate: { type: 'string', format: 'date-time' },
            nin: { type: 'string', nullable: true, description: 'Redacted unless allowSensitiveFields is enabled on your token' },
            bvn: { type: 'string', nullable: true, description: 'Redacted unless allowSensitiveFields is enabled on your token' },
            phone: { type: 'string', nullable: true, description: 'Redacted unless allowSensitiveFields is enabled on your token' },
            email: { type: 'string', nullable: true, description: 'Redacted unless allowSensitiveFields is enabled on your token' },
          },
        },
        Farm: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            farmSize: { type: 'number', nullable: true },
            primaryCrop: { type: 'string', nullable: true },
            secondaryCrop: { type: 'array', items: { type: 'string' } },
            produceCategory: { type: 'string', nullable: true },
            farmOwnership: { type: 'string', nullable: true },
            farmState: { type: 'string', nullable: true },
            farmLocalGovernment: { type: 'string', nullable: true },
            farmingSeason: { type: 'string', nullable: true },
            farmLatitude: { type: 'number', nullable: true },
            farmLongitude: { type: 'number', nullable: true },
            soilType: { type: 'string', nullable: true },
            soilPH: { type: 'number', nullable: true },
            farmArea: { type: 'number', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Cluster: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            totalFarmers: { type: 'integer' },
            totalFarms: { type: 'integer' },
            totalFarmSize: { type: 'number' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/api/v1/farmers': {
        get: {
          summary: 'List farmers',
          description: 'Returns a paginated list of registered farmers with optional filters.',
          tags: ['Farmers'],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by first or last name' },
            { name: 'state', in: 'query', schema: { type: 'string' } },
            { name: 'lga', in: 'query', schema: { type: 'string' } },
            { name: 'cluster', in: 'query', schema: { type: 'string' }, description: 'Filter by cluster ID' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['Enrolled', 'FarmCaptured', 'Validated', 'Verified', 'Rejected'] } },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: {
            '200': {
              description: 'Paginated list of farmers',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Farmer' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                      meta: { $ref: '#/components/schemas/FieldVisibilityMeta' },
                    },
                  },
                },
              },
            },
            '401': { description: 'Missing or invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '403': { description: 'Insufficient scope', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/v1/farmers/{id}': {
        get: {
          summary: 'Get a farmer',
          description: 'Fetch a single farmer record including their farms and cluster.',
          tags: ['Farmers'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Farmer record', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Farmer' }, meta: { $ref: '#/components/schemas/FieldVisibilityMeta' } } } } } },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Farmer not found' },
          },
        },
      },
      '/api/v1/farms': {
        get: {
          summary: 'List farms',
          tags: ['Farms'],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
            { name: 'farmerId', in: 'query', schema: { type: 'string' } },
            { name: 'state', in: 'query', schema: { type: 'string' } },
            { name: 'crop', in: 'query', schema: { type: 'string' } },
            { name: 'season', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Paginated list of farms' },
            '401': { description: 'Unauthorized' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/v1/farms/{id}': {
        get: {
          summary: 'Get a farm',
          tags: ['Farms'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Farm record' },
            '404': { description: 'Farm not found' },
          },
        },
      },
      '/api/v1/clusters': {
        get: {
          summary: 'List clusters',
          tags: ['Clusters'],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          ],
          responses: { '200': { description: 'Paginated list of clusters' } },
        },
      },
      '/api/v1/clusters/{id}': {
        get: {
          summary: 'Get a cluster',
          tags: ['Clusters'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: { '200': { description: 'Cluster with farmer list' }, '404': { description: 'Cluster not found' } },
        },
      },
      '/api/v1/analytics': {
        get: {
          summary: 'Aggregated statistics',
          description: 'Summary counts and breakdowns. Cached for 10 minutes.',
          tags: ['Analytics'],
          responses: { '200': { description: 'Analytics summary data' }, '401': { description: 'Unauthorized' } },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
