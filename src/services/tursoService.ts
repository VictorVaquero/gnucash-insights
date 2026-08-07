export interface TursoTokenResponse {
  url: string;
  token: string;
  expiresAt: string;
}

export const fetchTursoToken = async ({
  idToken,
}: {
  idToken: string;
}): Promise<TursoTokenResponse> => {
  const isGuest = idToken === "guest";
  const headers: Record<string, string> = isGuest
    ? { "X-Guest-Request": "true" }
    : { Authorization: `Bearer ${idToken}` };

  const response = await fetch(`${import.meta.env.BASE_URL}api/turso-token`, {
    method: "POST",
    headers,
  });
  if (!response.ok) {
    throw new Error(`Turso token request failed: ${response.status}`);
  }
  return (await response.json()) as TursoTokenResponse;
};
