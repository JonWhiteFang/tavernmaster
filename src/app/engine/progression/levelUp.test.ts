import { describe, expect, it } from "vitest";
import {
  applyInventoryPatch,
  applyLevelUp,
  validateLevelUpChoices,
  type InventoryItem,
  type LevelUpProposal
} from "./levelUp";

describe("progression", () => {
  describe("applyInventoryPatch", () => {
    const baseInventory: InventoryItem[] = [
      { id: "sword", name: "Longsword", quantity: 1, equipped: true },
      { id: "potion", name: "Health Potion", quantity: 3, equipped: false }
    ];

    it("adds new items", () => {
      const result = applyInventoryPatch(baseInventory, {
        add: [{ id: "shield", name: "Shield", quantity: 1, equipped: false }]
      });
      expect(result).toHaveLength(3);
      expect(result.find((i) => i.id === "shield")).toBeDefined();
    });

    it("stacks existing items", () => {
      const result = applyInventoryPatch(baseInventory, {
        add: [{ id: "potion", name: "Health Potion", quantity: 2, equipped: false }]
      });
      expect(result.find((i) => i.id === "potion")?.quantity).toBe(5);
    });

    it("removes items", () => {
      const result = applyInventoryPatch(baseInventory, { remove: ["sword"] });
      expect(result).toHaveLength(1);
      expect(result.find((i) => i.id === "sword")).toBeUndefined();
    });

    it("updates item properties", () => {
      const result = applyInventoryPatch(baseInventory, {
        update: [{ id: "sword", equipped: false }]
      });
      expect(result.find((i) => i.id === "sword")?.equipped).toBe(false);
    });

    it("removes items with zero quantity", () => {
      const result = applyInventoryPatch(baseInventory, {
        update: [{ id: "potion", quantity: 0 }]
      });
      expect(result.find((i) => i.id === "potion")).toBeUndefined();
    });
  });

  describe("validateLevelUpChoices", () => {
    it("validates complete choices", () => {
      const proposal: LevelUpProposal = {
        characterId: "char-1",
        fromLevel: 3,
        toLevel: 4,
        hpIncrease: 8,
        choices: [{ type: "ability_score", options: ["str", "dex"], selected: "str" }]
      };
      expect(validateLevelUpChoices(proposal).valid).toBe(true);
    });

    it("reports missing selections", () => {
      const proposal: LevelUpProposal = {
        characterId: "char-1",
        fromLevel: 3,
        toLevel: 4,
        hpIncrease: 8,
        choices: [{ type: "ability_score", options: ["str", "dex"] }]
      };
      const result = validateLevelUpChoices(proposal);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain("ability_score");
    });

    it("reports invalid selections", () => {
      const proposal: LevelUpProposal = {
        characterId: "char-1",
        fromLevel: 3,
        toLevel: 4,
        hpIncrease: 8,
        choices: [{ type: "feat", options: ["alert", "lucky"], selected: "invalid" }]
      };
      const result = validateLevelUpChoices(proposal);
      expect(result.valid).toBe(false);
    });
  });

  describe("applyLevelUp", () => {
    it("applies level up with HP increase", () => {
      const character = { level: 3, hp: 25, maxHp: 25 };
      const proposal: LevelUpProposal = {
        characterId: "char-1",
        fromLevel: 3,
        toLevel: 4,
        hpIncrease: 8,
        choices: []
      };
      const result = applyLevelUp(character, proposal);
      expect(result.level).toBe(4);
      expect(result.hp).toBe(33);
      expect(result.maxHp).toBe(33);
    });

    it("throws on incomplete choices", () => {
      const character = { level: 3, hp: 25, maxHp: 25 };
      const proposal: LevelUpProposal = {
        characterId: "char-1",
        fromLevel: 3,
        toLevel: 4,
        hpIncrease: 8,
        choices: [{ type: "ability_score", options: ["str", "dex"] }]
      };
      expect(() => applyLevelUp(character, proposal)).toThrow("Missing choices");
    });
  });
});
