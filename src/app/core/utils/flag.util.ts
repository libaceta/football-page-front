/**
 * Devuelve las clases CSS de `flag-icons` para un código ISO 3166 alpha-2
 * (ej. "AR" -> "fi fi-ar") o una subdivisión (ej. "GB-ENG" -> "fi fi-gb-eng",
 * para Inglaterra/Escocia/Gales/Irlanda del Norte). Se usa con un `<span>`
 * vacío; la bandera se dibuja como SVG, independiente del soporte de emoji
 * del sistema operativo.
 */
export function flagClass(code: string): string {
  const cc = code.trim().toLowerCase();
  if (!/^[a-z]{2}(-[a-z]{2,3})?$/.test(cc)) {
    return 'fi';
  }
  return `fi fi-${cc}`;
}
