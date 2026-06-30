/* eslint-disable react-refresh/only-export-components */
import * as React from "react";

import { supabase } from "@/integrations/supabase/client";

import { hasSupabaseConfig } from "./config";
import { demoPasswords, demoUsers } from "./demo-data";
import type { AppUser, UserRole } from "./types";

const demoSessionKey = "ease-events-demo-user";
const authLoadTimeoutMs = 6000;

interface AuthContextValue {
  currentUser: AppUser | null;
  isLoading: boolean;
  authMode: "demo" | "supabase";
  signIn: (email: string, password: string) => Promise<void>;
  signInAsDemoRole: (role: UserRole) => void;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

interface UserProfileRow {
  id: string;
  organization_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
}

interface UsersQueryClient {
  from: (table: "users") => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => Promise<{
          data: UserProfileRow | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

function readDemoUser() {
  if (typeof window === "undefined") return null;
  const userId = window.localStorage.getItem(demoSessionKey);
  return demoUsers.find((user) => user.id === userId) ?? null;
}

async function getSupabaseProfile(userId: string): Promise<AppUser | null> {
  const client = supabase as unknown as UsersQueryClient;
  const { data, error } = await client
    .from("users")
    .select("id, organization_id, role, full_name, email, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    role: data.role,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone ?? undefined,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`${label} timed out.`));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

export function EaseEventsAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [authMode, setAuthMode] = React.useState<"demo" | "supabase">("demo");

  React.useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      if (hasSupabaseConfig()) {
        try {
          const { data } = await withTimeout(
            supabase.auth.getSession(),
            authLoadTimeoutMs,
            "Supabase session load",
          );
          const userId = data.session?.user.id;
          const profile = userId
            ? await withTimeout(
                getSupabaseProfile(userId),
                authLoadTimeoutMs,
                "Supabase profile load",
              )
            : null;
          if (profile) {
            window.localStorage.removeItem(demoSessionKey);
            if (isMounted) {
              setCurrentUser(profile);
              setAuthMode("supabase");
              setIsLoading(false);
            }
            return;
          }
        } catch {
          if (isMounted) setAuthMode("demo");
        }
      }

      const demoUser = readDemoUser();
      if (isMounted) {
        setCurrentUser(demoUser);
        setAuthMode("demo");
        setIsLoading(false);
      }
    }

    void loadSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    let supabaseSignInError: { message?: string } | null = null;

    if (hasSupabaseConfig()) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        const profile = data.user ? await getSupabaseProfile(data.user.id) : null;
        if (!profile) throw new Error("Signed in, but no EaseEvents profile was found.");

        window.localStorage.removeItem(demoSessionKey);
        setCurrentUser(profile);
        setAuthMode("supabase");
        return;
      }
      supabaseSignInError = error;
    }

    const demoUser = demoUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
    if (demoUser && password === demoPasswords[demoUser.role]) {
      window.localStorage.setItem(demoSessionKey, demoUser.id);
      setCurrentUser(demoUser);
      setAuthMode("demo");
      return;
    }

    if (!hasSupabaseConfig()) {
      throw new Error("Demo users use password demo123. Add Supabase env vars for real auth.");
    }
    throw new Error(supabaseSignInError?.message ?? "Unable to sign in with Supabase.");
  }, []);

  const signInAsDemoRole = React.useCallback((role: UserRole) => {
    const demoUser = demoUsers.find((user) => user.role === role);
    if (!demoUser) return;
    window.localStorage.setItem(demoSessionKey, demoUser.id);
    setCurrentUser(demoUser);
    setAuthMode("demo");
  }, []);

  const signOut = React.useCallback(async () => {
    window.localStorage.removeItem(demoSessionKey);
    if (hasSupabaseConfig()) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setAuthMode("demo");
  }, []);

  const value = React.useMemo(
    () => ({ currentUser, isLoading, authMode, signIn, signInAsDemoRole, signOut }),
    [authMode, currentUser, isLoading, signIn, signInAsDemoRole, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useEaseEventsAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useEaseEventsAuth must be used inside EaseEventsAuthProvider.");
  return value;
}

export function canAccessRole(user: AppUser | null, allowedRoles?: UserRole[]) {
  if (!user) return false;
  if (!allowedRoles?.length) return true;
  return allowedRoles.includes(user.role);
}
