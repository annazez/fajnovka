/** Gives the tools of a page to the AI agent of the browser, if the browser has one (WebMCP). */
import { registerTools, type ModelContext, type Tool } from '../lib/tools.ts';

interface Host {
  modelContext?: ModelContext;
}

/** WebMCP lives on `document`. The first browsers that had it used `navigator`. */
export function offerTools(tools: readonly Tool[]): void {
  registerTools((document as Host).modelContext ?? (navigator as Host).modelContext, tools);
}
