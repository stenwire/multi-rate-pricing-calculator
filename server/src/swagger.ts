import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Multi-Rate Pricing Calculator API',
      version: '1.0.0',
      description:
        'API for creating documents with line items, applying discounts and tax, and generating summary reports. All monetary values are integers in the smallest currency unit: $100.00 is 10000. Only taxPercent and a percent discount value are ordinary decimals.',
    },
    servers: [{ url: '/api/v1', description: 'API v1 base path' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          required: ['status', 'message', 'data'],
          properties: {
            status: { type: 'string', enum: ['success'] },
            message: {
              type: 'string',
              example: 'Document created successfully.',
            },
            data: {
              type: 'object',
              nullable: true,
              description: 'Endpoint payload, or null for deletes.',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['status', 'message', 'error_code'],
          properties: {
            status: { type: 'string', enum: ['error'] },
            message: { type: 'string', example: 'Document not found.' },
            error_code: { type: 'string', example: 'DOCUMENT_NOT_FOUND' },
            details: {
              type: 'array',
              description:
                'Present only on validation errors; omitted entirely otherwise.',
              items: { $ref: '#/components/schemas/ValidationErrorDetail' },
            },
          },
        },
        ValidationErrorDetail: {
          type: 'object',
          required: ['field', 'message'],
          properties: {
            field: { type: 'string', example: 'quantity' },
            message: {
              type: 'string',
              example: 'Number must be greater than or equal to 1',
            },
          },
        },
        User: {
          type: 'object',
          required: ['id', 'email', 'createdAt'],
          properties: {
            id: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0e' },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponseData: {
          type: 'object',
          required: ['user', 'token'],
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string', example: 'eyJhbGciOi...' },
          },
        },
        Discount: {
          type: 'object',
          required: ['type', 'value'],
          properties: {
            type: { type: 'string', enum: ['percent', 'fixed'] },
            value: {
              type: 'number',
              minimum: 0,
              description:
                'For percent, 0-100 and may be decimal. For fixed, an integer in the smallest currency unit.',
              example: 10,
            },
          },
        },
        LineItemInput: {
          type: 'object',
          required: ['description', 'quantity', 'unitPrice'],
          description:
            'Only these fields are accepted. Computed monetary fields are ignored if sent.',
          properties: {
            description: {
              type: 'string',
              maxLength: 300,
              example: 'Widget A',
            },
            quantity: { type: 'integer', minimum: 1, example: 2 },
            unitPrice: { type: 'integer', minimum: 0, example: 10000 },
            discount: {
              nullable: true,
              default: null,
              allOf: [{ $ref: '#/components/schemas/Discount' }],
            },
            taxPercent: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              default: 0,
              example: 5,
            },
          },
        },
        LineItem: {
          type: 'object',
          required: [
            'id',
            'description',
            'quantity',
            'unitPrice',
            'taxPercent',
            'subtotal',
            'discountAmount',
            'afterDiscount',
            'taxAmount',
            'lineTotal',
          ],
          properties: {
            id: { type: 'string' },
            description: { type: 'string', example: 'Widget A' },
            quantity: { type: 'integer', example: 2 },
            unitPrice: { type: 'integer', example: 10000 },
            discount: {
              nullable: true,
              allOf: [{ $ref: '#/components/schemas/Discount' }],
            },
            taxPercent: { type: 'number', example: 5 },
            subtotal: { type: 'integer', example: 20000 },
            discountAmount: { type: 'integer', example: 2000 },
            afterDiscount: { type: 'integer', example: 18000 },
            taxAmount: { type: 'integer', example: 900 },
            lineTotal: { type: 'integer', example: 18900 },
          },
        },
        DocumentTotals: {
          type: 'object',
          required: ['subtotal', 'totalDiscount', 'totalTax', 'grandTotal'],
          description:
            'Exact sums of already-rounded line values, so grandTotal always equals subtotal - totalDiscount + totalTax.',
          properties: {
            subtotal: { type: 'integer', example: 45000 },
            totalDiscount: { type: 'integer', example: 4000 },
            totalTax: { type: 'integer', example: 1150 },
            grandTotal: { type: 'integer', example: 42150 },
          },
        },
        Document: {
          allOf: [
            { $ref: '#/components/schemas/DocumentTotals' },
            {
              type: 'object',
              required: [
                'id',
                'title',
                'customer',
                'issueDate',
                'status',
                'lineItems',
                'createdAt',
                'updatedAt',
              ],
              properties: {
                id: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0e' },
                title: {
                  type: 'string',
                  maxLength: 200,
                  example: 'Q1 Services',
                },
                customer: {
                  type: 'string',
                  maxLength: 200,
                  example: 'Acme Corp',
                },
                issueDate: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['draft', 'finalized'] },
                lineItems: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/LineItem' },
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          ],
        },
        ReportSummary: {
          type: 'object',
          required: [
            'startDate',
            'endDate',
            'documentCount',
            'subtotal',
            'totalDiscount',
            'totalTax',
            'grandTotal',
          ],
          properties: {
            startDate: {
              type: 'string',
              format: 'date',
              example: '2026-01-01',
            },
            endDate: { type: 'string', format: 'date', example: '2026-03-31' },
            documentCount: { type: 'integer', example: 5 },
            subtotal: { type: 'integer', example: 150000 },
            totalDiscount: { type: 'integer', example: 12000 },
            totalTax: { type: 'integer', example: 7500 },
            grandTotal: { type: 'integer', example: 145500 },
          },
        },
        Pagination: {
          type: 'object',
          required: ['page', 'limit', 'total', 'totalPages'],
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 1 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Resolved from the compiled or ts-node'd source directory so the globs hold whether the
  // process is started from server/ or elsewhere.
  apis: [`${__dirname}/routes/*.ts`, `${__dirname}/routes/*.js`],
};

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
