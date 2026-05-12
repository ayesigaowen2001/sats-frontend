export interface ApiRequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
) {
  const url = new URL(path, "http://localhost");

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.pathname + url.search, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
