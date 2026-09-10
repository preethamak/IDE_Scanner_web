type ClassValue = string | false | null | undefined;

/** Joins static and conditional class names without introducing a runtime dependency. */
export function cn(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}
