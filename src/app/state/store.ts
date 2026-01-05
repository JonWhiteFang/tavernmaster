import type { Campaign, Character, Encounter, JournalEntry } from "../data/types";

export interface AppState {
  campaign?: Campaign;
  characters: Character[];
  encounter?: Encounter;
  journal: JournalEntry[];
}

export const initialState: AppState = {
  characters: [],
  journal: []
};
