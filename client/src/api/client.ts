import axios from 'axios';

// Duplicated from the server rather than shared: spec §3 keeps the two packages independent.
export interface ApiUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface Discount {
  type: 'percent' | 'fixed';
  value: number;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: Discount | null;
  taxPercent: number;
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  status: 'draft' | 'finalized';
  lineItems: LineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReportSummary {
  startDate: string;
  endDate: string;
  documentCount: number;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

export interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: Discount | null;
  taxPercent: number;
}

interface SuccessEnvelope<T> {
  status: 'success';
  message: string;
  data: T;
}

interface ErrorEnvelope {
  status: 'error';
  message: string;
  error_code: string;
  details?: { field: string; message: string }[];
}

export const TOKEN_STORAGE_KEY = 'pricing-calculator-token';
export const USER_STORAGE_KEY = 'pricing-calculator-user';

// Both the deliberate logout and the 401 interceptor clear exactly this set, so the
// two paths cannot drift apart about what "signed out" leaves behind.
export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

// Swagger UI is mounted at the server root, not under the versioned API prefix,
// so the docs URL is the base with /api/v1 trimmed off rather than a second env var.
export const API_DOCS_URL = `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/api-docs`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // An expired or rejected token must not leave the app sitting on a page it cannot load.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredAuth();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

// The API always answers in the §8.0 envelope, so surface its message rather than axios's.
export function apiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong.',
): string {
  if (axios.isAxiosError<ErrorEnvelope>(error) && error.response?.data) {
    const { message, details } = error.response.data;
    if (details?.length) {
      return `${message} ${details.map((d) => `${d.field}: ${d.message}`).join('; ')}`;
    }
    return message ?? fallback;
  }
  return fallback;
}

async function unwrap<T>(
  promise: Promise<{ data: SuccessEnvelope<T> }>,
): Promise<T> {
  const response = await promise;
  return response.data.data;
}

export const authApi = {
  register: (email: string, password: string) =>
    unwrap<{ user: ApiUser; token: string }>(
      api.post('/auth/register', { email, password }),
    ),
  login: (email: string, password: string) =>
    unwrap<{ user: ApiUser; token: string }>(
      api.post('/auth/login', { email, password }),
    ),
};

export const documentsApi = {
  list: (params: { status?: string; page?: number; limit?: number } = {}) =>
    unwrap<{ documents: DocumentSummary[]; pagination: Pagination }>(
      api.get('/documents', { params }),
    ),
  get: (id: string) => unwrap<DocumentSummary>(api.get(`/documents/${id}`)),
  create: (body: {
    title: string;
    customer: string;
    issueDate: string;
    lineItems: LineItemInput[];
  }) => unwrap<DocumentSummary>(api.post('/documents', body)),
  update: (
    id: string,
    body: { title?: string; customer?: string; issueDate?: string },
  ) => unwrap<DocumentSummary>(api.put(`/documents/${id}`, body)),
  remove: (id: string) => unwrap<null>(api.delete(`/documents/${id}`)),
  finalize: (id: string) =>
    unwrap<DocumentSummary>(api.post(`/documents/${id}/finalize`)),
  addLineItem: (id: string, body: LineItemInput) =>
    unwrap<DocumentSummary>(api.post(`/documents/${id}/line-items`, body)),
  updateLineItem: (
    id: string,
    lineItemId: string,
    body: Partial<LineItemInput>,
  ) =>
    unwrap<DocumentSummary>(
      api.put(`/documents/${id}/line-items/${lineItemId}`, body),
    ),
  removeLineItem: (id: string, lineItemId: string) =>
    unwrap<DocumentSummary>(
      api.delete(`/documents/${id}/line-items/${lineItemId}`),
    ),
};

export const reportsApi = {
  summary: (startDate: string, endDate: string) =>
    unwrap<{ summary: ReportSummary }>(
      api.get('/reports/summary', { params: { startDate, endDate } }),
    ),
};
