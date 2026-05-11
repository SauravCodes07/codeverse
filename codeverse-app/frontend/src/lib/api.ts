import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

// ============================================================
// TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

// ============================================================
// API CLIENT
// ============================================================

const API_BASE_URL =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ||
  'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request — attach token
    this.client.interceptors.request.use(
      (config) => {
        try {
          const stored = localStorage.getItem('codeverse-app-store');
          if (stored) {
            const state = JSON.parse(stored);
            const token = state?.state?.token;
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          }
        } catch (_) {
          // ignore parse errors
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response — handle 401, refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.isRefreshing) {
            return new Promise<string>((resolve) => {
              this.refreshQueue.push(resolve);
            }).then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.client(originalRequest);
            });
          }

          this.isRefreshing = true;

          try {
            const stored = localStorage.getItem('codeverse-app-store');
            const refreshToken = stored
              ? JSON.parse(stored)?.state?.refreshToken
              : null;

            if (!refreshToken) throw new Error('No refresh token');

            const { data } = await axios.post(
              `${API_BASE_URL}/api/v1/auth/refresh`,
              { refreshToken }
            );

            const newToken = data.token;
            this.refreshQueue.forEach((cb) => cb(newToken));
            this.refreshQueue = [];

            // Update stored token
            if (stored) {
              const state = JSON.parse(stored);
              state.state.token = newToken;
              localStorage.setItem('codeverse-app-store', JSON.stringify(state));
            }

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }

            return this.client(originalRequest);
          } catch (_) {
            // Refresh failed — clear auth
            localStorage.removeItem('codeverse-app-store');
            window.location.href = '/';
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // ============================================================
  // AUTH
  // ============================================================

  async login(email: string, password: string) {
    const { data } = await this.client.post<ApiResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  }

  async register(name: string, email: string, password: string) {
    const { data } = await this.client.post<ApiResponse>('/auth/register', {
      name,
      email,
      password,
    });
    return data;
  }

  async forgotPassword(email: string) {
    const { data } = await this.client.post<ApiResponse>(
      '/auth/forgot-password',
      { email }
    );
    return data;
  }

  async verifyOTP(email: string, otp: string) {
    const { data } = await this.client.post<ApiResponse>('/auth/verify-otp', {
      email,
      otp,
    });
    return data;
  }

  async refreshToken(refreshToken: string) {
    const { data } = await this.client.post<ApiResponse>('/auth/refresh', {
      refreshToken,
    });
    return data;
  }

  // ============================================================
  // WORKSPACES
  // ============================================================

  async getWorkspaces() {
    const { data } = await this.client.get<ApiResponse>('/workspaces');
    return data;
  }

  async createWorkspace(name: string, description: string, language: string) {
    const { data } = await this.client.post<ApiResponse>('/workspaces', {
      name,
      description,
      language,
    });
    return data;
  }

  async deleteWorkspace(id: string) {
    const { data } = await this.client.delete<ApiResponse>(`/workspaces/${id}`);
    return data;
  }

  // ============================================================
  // FILES
  // ============================================================

  async getFiles(workspaceId: string) {
    const { data } = await this.client.get<ApiResponse>(
      `/workspaces/${workspaceId}/files`
    );
    return data;
  }

  async saveFile(workspaceId: string, fileId: string, content: string) {
    const { data } = await this.client.put<ApiResponse>(
      `/workspaces/${workspaceId}/files/${fileId}`,
      { content }
    );
    return data;
  }

  // ============================================================
  // CODE EXECUTION
  // ============================================================

  async executeCode(
    language: string,
    code: string,
    workspaceId?: string
  ) {
    const { data } = await this.client.post<ApiResponse>('/execute', {
      language,
      code,
      workspaceId,
    });
    return data;
  }

  // ============================================================
  // AI
  // ============================================================

  async sendAIMessage(message: string, context?: string, history?: unknown[]) {
    const { data } = await this.client.post<ApiResponse>('/ai/chat', {
      message,
      context,
      history,
    });
    return data;
  }

  // ============================================================
  // HEALTH
  // ============================================================

  async health() {
    const { data } = await this.client.get('/health');
    return data;
  }
}

// Singleton
export const api = new ApiClient();
