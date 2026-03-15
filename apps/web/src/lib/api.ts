const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';

interface WatchlistItemDto {
  id: string;
  ticker: string;
  addedAt: string;
  notes: string | null;
  currentPrice: number | null;
  dailyChangePercent: number | null;
  recentSignalCount: number;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? `API error ${res.status}`);
    }

    return data;
  }

  // ─── Auth ────────────────────────────────────────────────

  async getMe() {
    return this.request<{ data: import('@firasa/shared').UserDto }>('/api/v1/me');
  }

  async getPreferences() {
    return this.request<{ data: import('@firasa/shared').UserPreferenceDto }>('/api/v1/me/preferences');
  }

  async updatePreferences(input: Partial<import('@firasa/shared').UserPreferenceDto>) {
    return this.request<{ data: import('@firasa/shared').UserPreferenceDto }>('/api/v1/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // ─── Gurus ───────────────────────────────────────────────

  async getGurus() {
    return this.request<{ data: import('@firasa/shared').GuruDto[] }>('/api/v1/gurus');
  }

  async createGuru(input: { twitterHandle: string; displayName: string; category?: string }) {
    return this.request<{ data: import('@firasa/shared').GuruDto }>('/api/v1/gurus', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateGuru(id: string, input: { isActive?: boolean; displayName?: string }) {
    return this.request<{ data: import('@firasa/shared').GuruDto }>(`/api/v1/gurus/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteGuru(id: string, hard = false) {
    return this.request<{ success: boolean }>(`/api/v1/gurus/${id}?hard=${hard}`, {
      method: 'DELETE',
    });
  }

  // ─── Signals ─────────────────────────────────────────────

  async getSignals(params?: { guruId?: string; action?: string; limit?: number; cursor?: string }) {
    const query = new URLSearchParams();
    if (params?.guruId) query.set('guruId', params.guruId);
    if (params?.action) query.set('action', params.action);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);

    return this.request<{
      data: import('@firasa/shared').SignalDto[];
      meta?: { cursor?: string };
    }>(`/api/v1/signals?${query}`);
  }

  async getSignalDetail(id: string) {
    return this.request<{ data: import('@firasa/shared').SignalDetailDto }>(`/api/v1/signals/${id}`);
  }

  async getTrades(params?: { guruId?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.guruId) query.set('guruId', params.guruId);
    if (params?.limit) query.set('limit', String(params.limit));

    return this.request<{ data: import('@firasa/shared').TradeOutcomeDto[] }>(`/api/v1/signals/trades?${query}`);
  }

  // ─── Watchlist ──────────────────────────────────────────

  async getWatchlist() {
    return this.request<{ data: WatchlistItemDto[] }>('/api/v1/watchlist');
  }

  async addToWatchlist(ticker: string, notes?: string) {
    return this.request<{ success: boolean }>('/api/v1/watchlist', {
      method: 'POST',
      body: JSON.stringify({ ticker, notes }),
    });
  }

  async removeFromWatchlist(ticker: string) {
    return this.request<{ success: boolean }>(`/api/v1/watchlist/${encodeURIComponent(ticker)}`, {
      method: 'DELETE',
    });
  }

  // ─── Feature Flags ──────────────────────────────────────

  async getFlags() {
    return this.request<{ data: Record<string, boolean> }>('/api/v1/flags');
  }

  // ─── Price Alerts ─────────────────────────────────────────

  async getAlerts() {
    return this.request<{ data: PriceAlertDto[] }>('/api/v1/alerts');
  }

  async createPriceAlert(input: { ticker: string; condition: string; targetPrice: number }) {
    return this.request<{ data: PriceAlertDto }>('/api/v1/alerts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deletePriceAlert(id: string) {
    return this.request<{ success: boolean }>(`/api/v1/alerts/${id}`, {
      method: 'DELETE',
    });
  }
}

export interface PriceAlertDto {
  id: string;
  ticker: string;
  condition: string;
  targetPrice: number;
  isActive: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

export const api = new ApiClient();
