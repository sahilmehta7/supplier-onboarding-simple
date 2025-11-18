interface ApiErrorBody {
  error?: string;
}

export async function jsonRequest<TResponse>(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // ignore
  }

  if (!response.ok) {
    const message =
      (payload as ApiErrorBody)?.error ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as TResponse;
}


