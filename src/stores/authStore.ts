import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isEboard } from "@/lib/permissions";
import { bootstrapPresidentEmail } from "@/lib/env";
import type { Profile } from "@/types/db";

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;
  signUp: (args: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  signIn: (args: {
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

async function loadProfile(user: User): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("loadProfile error", error);
    return null;
  }
  return data as Profile | null;
}

async function ensureProfile(
  user: User,
  fullName: string
): Promise<Profile | null> {
  const existing = await loadProfile(user);
  if (existing) return existing;

  const isFirstUserAsBootstrap =
    bootstrapPresidentEmail &&
    user.email?.toLowerCase() === bootstrapPresidentEmail;

  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  const isFirstProfileEver = (count ?? 0) === 0;

  const role =
    isFirstUserAsBootstrap || isFirstProfileEver ? "president" : "member";

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: fullName || user.email?.split("@")[0] || "Brother",
      email: user.email!,
      role,
    })
    .select("*")
    .single();
  if (error) {
    console.error("ensureProfile insert error", error);
    return null;
  }
  return data as Profile;
}

function notifyMain(profile: Profile | null) {
  const eboard = isEboard(profile?.role);
  if (typeof window !== "undefined" && window.lphie) {
    window.lphie.notifyRoleChanged(eboard);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,

  async init() {
    set({ loading: true, error: null });
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const profile = await loadProfile(data.session.user);
      notifyMain(profile);
      set({
        user: data.session.user,
        session: data.session,
        profile,
        loading: false,
      });
    } else {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (session?.user) {
        const profile = await loadProfile(session.user);
        notifyMain(profile);
        set({ user: session.user, session, profile });
      } else {
        notifyMain(null);
        set({ user: null, session: null, profile: null });
      }
    });
  },

  async signUp({ email, password, fullName }) {
    set({ error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, message: error.message };
    if (!data.user) return { ok: false, message: "No user returned" };
    const profile = await ensureProfile(data.user, fullName);
    notifyMain(profile);
    set({ user: data.user, session: data.session, profile });
    return { ok: true };
  },

  async signIn({ email, password }) {
    set({ error: null });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { ok: false, message: error.message };
    if (!data.user) return { ok: false, message: "No user returned" };
    const profile = await ensureProfile(
      data.user,
      data.user.email?.split("@")[0] ?? "Brother"
    );
    notifyMain(profile);
    set({ user: data.user, session: data.session, profile });
    return { ok: true };
  },

  async signOut() {
    await supabase.auth.signOut();
    notifyMain(null);
    set({ user: null, session: null, profile: null });
  },

  async refreshProfile() {
    const { user } = get();
    if (!user) return;
    const profile = await loadProfile(user);
    notifyMain(profile);
    set({ profile });
  },
}));
