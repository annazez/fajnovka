/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Path of the server function with the live data of DPO, for example `/api/occupancy`. Empty where no function exists. */
  readonly PUBLIC_LIVE_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
