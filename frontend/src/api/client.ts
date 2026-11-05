export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('nimbo_gemini_key');
    if (customKey) {
      defaultHeaders['x-gemini-key'] = customKey.trim();
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Includes HttpOnly session cookie
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || `Error en la solicitud (${response.status})`,
      response.status,
      data.details
    );
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    status: () => request<{ success: boolean; setupCompleted: boolean }>('/api/auth/status'),
    setup: (data: unknown) =>
      request<{ success: boolean; message: string; user: any; token: string }>('/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: unknown) =>
      request<{ success: boolean; user: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () =>
      request<{ success: boolean; message: string }>('/api/auth/logout', {
        method: 'POST',
      }),
    me: () => request<{ success: boolean; user: any }>('/api/auth/me'),
    sessions: () => request<{ success: boolean; sessions: any[] }>('/api/auth/sessions'),
    revokeOthers: () =>
      request<{ success: boolean; message: string; revokedCount: number }>(
        '/api/auth/sessions/revoke-others',
        { method: 'POST' }
      ),
    updateProfile: (data: unknown) =>
      request<{ success: boolean; user: any; message: string }>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // Reminders
  reminders: {
    list: (params?: Record<string, string | undefined>) => {
      const search = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) search.append(k, v);
        });
      }
      const query = search.toString() ? `?${search.toString()}` : '';
      return request<{ success: boolean; reminders: any[] }>(`/api/reminders${query}`);
    },
    create: (data: unknown) =>
      request<{ success: boolean; reminder: any }>('/api/reminders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getById: (id: string) => request<{ success: boolean; reminder: any }>(`/api/reminders/${id}`),
    update: (id: string, data: unknown) =>
      request<{ success: boolean; reminder: any }>(`/api/reminders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/reminders/${id}`, {
        method: 'DELETE',
      }),
    toggle: (id: string) =>
      request<{ success: boolean; completed?: any; reactivated?: any; nextOccurrence?: any }>(
        `/api/reminders/${id}/toggle`,
        { method: 'POST' }
      ),
    snooze: (id: string, data: unknown) =>
      request<{ success: boolean; reminder: any }>(`/api/reminders/${id}/snooze`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    clearCompleted: () =>
      request<{ success: boolean; count: number; message: string }>(
        '/api/reminders/clear-completed',
        { method: 'POST' }
      ),
  },

  // Categories
  categories: {
    list: () => request<{ success: boolean; categories: any[] }>('/api/categories'),
    create: (data: unknown) =>
      request<{ success: boolean; category: any }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: unknown) =>
      request<{ success: boolean; category: any }>(`/api/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/categories/${id}`, {
        method: 'DELETE',
      }),
  },

  // Stats
  stats: {
    dashboard: (today?: string) =>
      request<{ success: boolean; metrics: any }>(
        `/api/stats/dashboard${today ? `?today=${today}` : ''}`
      ),
  },

  // Web Push
  push: {
    getPublicKey: () => request<{ success: boolean; publicKey: string }>('/api/push/public-key'),
    subscribe: (data: unknown) =>
      request<{ success: boolean; message: string; subscriptionId: string }>('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    unsubscribe: (endpoint: string) =>
      request<{ success: boolean; message: string }>('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint }),
      }),
    getDevices: () => request<{ success: boolean; devices: any[] }>('/api/push/devices'),
    test: () =>
      request<{ success: boolean; sentCount: number; message: string }>('/api/push/test', {
        method: 'POST',
      }),
  },

  // AI Assistant
  ai: {
    status: () =>
      request<{
        success: boolean;
        hasGeminiKey: boolean;
        activeEngine: string;
      }>('/api/ai/status'),
    greeting: () =>
      request<{
        success: boolean;
        greeting: string;
        todayEvents: Array<{ id: string; title: string; time: string; priority: string }>;
        overdueEventsCount: number;
        totalPendingCount: number;
      }>('/api/ai/greeting'),
    chat: (
      message: string,
      history: Array<{ role: string; content: string }> = [],
      apiKey?: string
    ) =>
      request<{
        success: boolean;
        response: string;
        toolExecuted?: string;
        toolResult?: any;
        aiModelUsed?: string;
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history, apiKey }),
      }),
  },
};
