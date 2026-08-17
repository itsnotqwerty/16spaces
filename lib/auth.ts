import { supabaseAsUser } from "./supabase.ts";

export type SessionUser = {
  id: string;
  email: string | null;
  username: string | null;
  isAnonymous: boolean;
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
    username: typeof data.user.user_metadata?.username === "string"
      ? data.user.user_metadata.username
      : null,
    isAnonymous: (data.user as { is_anonymous?: boolean }).is_anonymous === true,
  };
}
