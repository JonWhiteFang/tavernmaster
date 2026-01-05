export type SrdIndex = {
  spells: string[];
  items: string[];
  monsters: string[];
  conditions: string[];
};

// Placeholder for the SRD content index; load from bundled JSON once ingested.
export const emptySrdIndex: SrdIndex = {
  spells: [],
  items: [],
  monsters: [],
  conditions: []
};
