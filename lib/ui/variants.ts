import { cn } from "./cn";

type VariantSchema = Record<string, Record<string, string>>;
type VariantSelection<T extends VariantSchema> = {
  [K in keyof T]?: keyof T[K];
};

/** A small typed variant composer. Replace with CVA once the approved package is available. */
export function variants<T extends VariantSchema>(
  base: string,
  schema: T,
  defaults: VariantSelection<T> = {},
) {
  return (selection: VariantSelection<T> = {}, className?: string) => {
    const choices = { ...defaults, ...selection };
    return cn(
      base,
      ...Object.entries(choices).map(([key, value]) =>
        value === undefined ? undefined : schema[key]?.[String(value)],
      ),
      className,
    );
  };
}
