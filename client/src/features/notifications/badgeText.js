/** Unread count as shown on the bell badge: 1 to 9, then "9+". */
export function badgeText(count) {
  return count > 9 ? '9+' : String(count);
}
