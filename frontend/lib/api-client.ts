export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  token: string | null
): Promise<Response> {
  if (!token) {
    throw new Error('No authentication token available')
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    // Token expired or invalid
    throw new Error('Unauthorized - please login again')
  }

  return response
}

