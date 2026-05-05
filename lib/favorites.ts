import { apiBaseUrl, withBearerToken } from "@/lib/deals";

export async function addToFavorites(
  dealId: string,
  userId: string | null | undefined,
  token: string | null
): Promise<boolean> {
  if (!apiBaseUrl || !userId || !token) {
    console.error("Missing required parameters for favorite action");
    return false;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/favorites/add`, {
      method: "POST",
      headers: withBearerToken(token, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        dealId,
        userId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to add favorite:", error);
    return false;
  }
}

export async function removeFromFavorites(
  dealId: string,
  userId: string | null | undefined,
  token: string | null
): Promise<boolean> {
  if (!apiBaseUrl || !userId || !token) {
    console.error("Missing required parameters for favorite action");
    return false;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/favorites/remove`, {
      method: "POST",
      headers: withBearerToken(token, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        dealId,
        userId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to remove favorite:", error);
    return false;
  }
}
