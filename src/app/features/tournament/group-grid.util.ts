/**
 * Clases de grilla para la sección de resultados por grupo según cuántos
 * grupos tenga la edición: 4 grupos -> 2 por fila, 6 grupos -> 3 por fila,
 * el resto (8/12) -> 4 por fila.
 */
export function groupGridClass(count: number): string {
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
  if (count === 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
}
