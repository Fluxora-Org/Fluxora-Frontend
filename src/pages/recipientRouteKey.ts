export function getRecipientRouteKey(pathname: string, search: string): string {
  return `${pathname}${search}`;
}
