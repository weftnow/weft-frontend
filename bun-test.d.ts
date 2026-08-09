declare module "bun:test" {
  type TestBody = () => void | Promise<void>;

  type Matchers = {
    toBe(expected: unknown): void;
    toBeDefined(): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeNull(): void;
    toBeTruthy(): void;
    toBeUndefined(): void;
    toContain(expected: string): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
    toMatch(expected: RegExp | string): void;
    toThrow(expected?: RegExp | string): void;
    /** Every matcher above, inverted. Nesting `not.not` is not a thing. */
    not: Omit<Matchers, "not">;
  };

  type AsyncMatchers = {
    rejects: Omit<Matchers, "not">;
  };

  export function afterEach(body: TestBody): void;
  export function beforeEach(body: TestBody): void;
  export function describe(name: string, body: TestBody): void;
  export function expect(actual: unknown, message?: string): Matchers & AsyncMatchers;
  export const mock: {
    module(moduleName: string, factory: () => unknown): void;
  };
  export function test(name: string, body: TestBody, timeout?: number): void;
}

declare const Bun: {
  spawn(options: {
    cmd: string[];
    cwd: string;
    stderr: "pipe";
    stdout: "pipe";
  }): {
    stderr: ReadableStream<Uint8Array>;
    stdout: ReadableStream<Uint8Array>;
    exited: Promise<number>;
  };
};
