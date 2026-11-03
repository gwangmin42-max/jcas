export const AUTH_COOKIE = "jcas_auth";

// 비밀번호 자체를 쿠키에 두지 않고, 비밀번호로 만든 해시값을 둔다. (Edge/Node 양쪽에서 동작하는 Web Crypto 사용)
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`jcas|${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 길이가 같은 두 문자열을 시간차 없이 비교
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
