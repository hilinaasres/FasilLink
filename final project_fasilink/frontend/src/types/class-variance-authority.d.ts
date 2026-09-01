declare module 'class-variance-authority' {
  export function cva(base?: string, options?: any): (args?: any) => string;
  export type VariantProps<T> = Record<string, any>;
}
