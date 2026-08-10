declare module "vanta/dist/vanta.fog.min" {
  type VantaEffect = { destroy(): void; setOptions(options: Record<string, unknown>): void; resize(): void };
  type VantaOptions = Record<string, unknown> & { el: HTMLElement };
  const createFog: (options: VantaOptions) => VantaEffect;
  export default createFog;
}
