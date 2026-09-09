declare const process: {
  argv: string[];
  version: string;
  exit(code?: number): never;
  env: Record<string, string | undefined>;
};
