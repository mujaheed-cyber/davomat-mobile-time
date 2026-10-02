import { create } from "zustand";
import type { MeResponse } from "@shared/types";
import { api, ApiError, hasToken, setToken } from "../lib/api";

interface State {
  me: MeResponse | null;
  loading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
}

export const useSession = create<State>((set) => ({
  me: null,
  loading: hasToken(),
  error: null,
  async login(phone, password) {
    set({ error: null });
    const { token } = await api.login(phone, password);
    setToken(token);
    set({ loading: true });
    set({ me: await api.me(), loading: false });
  },
  async refresh() {
    if (!hasToken()) return set({ loading: false });
    try {
      set({ me: await api.me(), loading: false, error: null });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { setToken(null); set({ me: null, loading: false }); }
      else set({ loading: false, error: (e as Error).message });
    }
  },
  logout() { setToken(null); set({ me: null }); },
}));
