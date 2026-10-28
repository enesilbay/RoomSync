// Expo Router parametreleri URL'ye yazılır; yalnızca ilkel değerler anlamlı taşınır.
// TODO(Faz 2): Kullanıcı bilgisi AuthProvider'a taşınınca bu yardımcıya ihtiyaç azalacak.
export type RouteParams = Record<string, string | number>;

/**
 * Bir nesneyi rota parametresine çevirir: string ve number olduğu gibi kalır,
 * boolean 'true'/'false' olur; null, undefined, nesne ve diziler atlanır
 * (bunlar URL'de zaten anlamlı bir değere dönüşmez).
 */
export function toRouteParams(source: object | null | undefined): RouteParams {
  const params: RouteParams = {};
  if (!source) return params;

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string' || typeof value === 'number') {
      params[key] = value;
    } else if (typeof value === 'boolean') {
      params[key] = value ? 'true' : 'false';
    }
  }
  return params;
}
