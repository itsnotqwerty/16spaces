import { supabaseAsUser } from "./supabase.ts";

export type SessionUser = {
  id: string;
  email: string | null;
};

export async function resolveUserFromAccessToken(
  accessToken: string,
): Promise<SessionUser | null> {
  const client = supabaseAsUser(accessToken);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}
