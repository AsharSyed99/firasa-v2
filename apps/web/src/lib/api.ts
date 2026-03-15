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

  // ─── Market Mood ──────────────────────────────────────

  async getMarketMood() {
    return this.request<{ data: { overallSentiment: string; sentimentScore: number; topBullishTickers: string[]; topBearishTickers: string[]; guruConsensus: { bullish: number; bearish: number; total: number }; summary: string; signalVolume: string; generatedAt: string } }>('/api/v1/mood');
  }

  // ─── Earnings ─────────────────────────────────────────────

  async getEarnings(days: number = 14) {
    return this.request<{ data: EarningsEntryDto[] }>(`/api/v1/earnings?days=${days}`);
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

  // ─── Notifications ───────────────────────────────────────

  async getNotifications(params?: { unreadOnly?: boolean; limit?: number; cursor?: string }) {
    const query = new URLSearchParams();
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);

    return this.request<{
      data: unknown[];
      meta?: { cursor?: string };
    }>(`/api/v1/notifications?${query}`);
  }

  async getUnreadCount() {
    return this.request<{ data: { count: number } }>('/api/v1/notifications/count');
  }

  async markNotificationRead(id: string) {
    return this.request<{ success: boolean }>(`/api/v1/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ success: boolean }>('/api/v1/notifications/read-all', {
      method: 'PATCH',
    });
  }

  // ─── Backtest ──────────────────────────────────────────

  async postBacktest(input: {
    guruIds?: string[];
    startDate: string;
    endDate: string;
    initialCapital: number;
    positionSize: number;
  }) {
    return this.request<{ data: {
      totalTrades: number; wins: number; losses: number;
      finalCapital: number; totalReturn: number; returnPercent: number;
      maxDrawdown: number; sharpeRatio: number;
      tradeLog: { date: string; ticker: string; action: string; entryPrice: number; exitPrice: number; returnPct: number }[];
      equityCurve: { date: string; value: number }[];
    } }>('/api/v1/backtest', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ─── Search ──────────────────────────────────────────────

  async search(params: { q: string; type?: 'all' | 'signals' | 'gurus' | 'tickers' }) {
    const query = new URLSearchParams({ q: params.q });
    if (params.type) query.set('type', params.type);

    return this.request<{
      data: {
        signals: import('@firasa/shared').SignalDto[];
        gurus: import('@firasa/shared').GuruDto[];
        tickers: { ticker: string; signalCount: number; lastMentioned: string }[];
      };
    }>(`/api/v1/search?${query}`);
  }

  // ─── Guru Config ────────────────────────────────────────

  async updateGuruConfig(guruId: string, input: { notes?: string }) {
    return this.request<{ success: boolean }>(`/api/v1/me/gurus/${guruId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // ─── Performance ────────────────────────────────────────

  async getPerformance() {
    return this.request<{ data: PerformanceDto }>('/api/v1/performance');
  }

  // ─── Correlation ──────────────────────────────────────────

  async getCorrelations(days: number = 30) {
    return this.request<{ data: {
      guru1: { id: string; handle: string; name: string };
      guru2: { id: string; handle: string; name: string };
      sharedTickers: number; agreements: number; disagreements: number; correlation: number;
    }[] }>(`/api/v1/correlation?days=${days}`);
  }

  // ─── Weekly Report ──────────────────────────────────────────

  async getWeeklyReport() {
    return this.request<{ data: WeeklyReportDto }>('/api/v1/weekly-report');
  }
}

export interface WeeklyReportDto {
  weekStartDate: string;
  weekEndDate: string;
  signalsReceived: number;
  tradesOpened: number;
  tradesClosed: number;
  weekPnl: number;
  weekPnlPercent: number;
  bestTrade: { ticker: string; returnPercent: number } | null;
  worstTrade: { ticker: string; returnPercent: number } | null;
  guruOfTheWeek: { name: string; handle: string; accuracy: number } | null;
  topSectors: { sector: string; signalCount: number }[];
  streakStatus: { current: number; best: number };
  weekOverWeekChange: number;
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

export interface PerformanceDto {
  totalTrades: number;
  openPositions: number;
  closedPositions: number;
  winRate: number;
  avgReturn: number;
  bestTrade: { ticker: string; returnPercent: number } | null;
  worstTrade: { ticker: string; returnPercent: number } | null;
  roiByGuru: { guruName: string; guruHandle: string; trades: number; winRate: number; avgReturn: number }[];
  monthlyReturns: { month: string; return: number }[];
  totalPnl: number;
  totalInvested: number;
}

export interface EarningsEntryDto {
  ticker: string;
  earningsDate: string;
  daysUntil: number;
  hour: string;
  hasRecentSignal: boolean;
  recentSignalAction: string | null;
  recentSignalScore: number | null;
  nearEarningsWarning: boolean;
}

export const api = new ApiClient();
