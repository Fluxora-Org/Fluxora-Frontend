export type NewsletterResult =
  | "success"
  | "already-subscribed"
  | "rate-limited";

function getNewsletterEndpoint(): string {
  const rawBaseUrl = import.meta.env.VITE_API_URL?.trim() ?? "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;
  return `${baseUrl}/newsletter/subscribe`;
}

export async function subscribeNewsletter(
  email: string,
): Promise<NewsletterResult> {
  const response = await fetch(getNewsletterEndpoint(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (response.status === 409) return "already-subscribed";
  if (response.status === 429) return "rate-limited";
  if (!response.ok) {
    throw new Error(`Newsletter signup failed with status ${response.status}`);
  }

  return "success";
}
