/**
 * Reconciliación estructural para datos en vivo: devuelve un valor igual a
 * `next` pero reutilizando las referencias de `prev` en todo subárbol que no
 * cambió. Así, con componentes OnPush, solo los `[input]` que realmente
 * cambiaron disparan re-render — el resto del DOM (banderas, scroll, filas
 * intactas) no se toca y la página no "parpadea" en cada poll.
 *
 * Pensado para árboles JSON chicos (una edición ~25 KB) que se refrescan cada
 * decenas de segundos: la comparación por `JSON.stringify` es más que suficiente.
 */
export function reconcile<T>(prev: T | undefined, next: T): T {
  if (prev === undefined || prev === null) return next;
  return reuse(prev, next) as T;
}

function reuse(prev: unknown, next: unknown): unknown {
  if (prev === next) return prev;

  // Subárbol idéntico → conservar la referencia previa.
  if (equalJson(prev, next)) return prev;

  if (Array.isArray(next) && Array.isArray(prev)) {
    return next.map((nv, i) => reuse(prev[i], nv));
  }

  if (isObject(next) && isObject(prev)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(next)) {
      out[key] = reuse(prev[key], next[key]);
    }
    return out;
  }

  return next;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function equalJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
