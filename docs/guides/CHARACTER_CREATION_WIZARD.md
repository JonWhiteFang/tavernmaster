# Character Creation Wizard

The Character Creation Wizard provides a step-by-step flow for creating SRD-compliant D&D 5e characters in Tavern Master.

## Overview

The wizard guides users through:

1. **Ability Scores** - Choose standard array, point buy, or roll 4d6 drop lowest
2. **Class** - Select from SRD classes (Fighter, Rogue, Cleric, Wizard, etc.)
3. **Race** - Select from SRD races (Human, Elf, Dwarf, Halfling, etc.)
4. **Background** - Select from SRD backgrounds (Acolyte, Criminal, Soldier, Sage, Outlander, etc.)
5. **Equipment** - Review starting equipment based on class
6. **Confirm** - Enter name, choose alignment, review summary

## Usage

1. Navigate to **Party Sheets**
2. Click the **Wizard** button in the roster panel
3. Complete each step and click **Next**
4. On the final step, enter a character name and click **Create Character**

The new character appears immediately in the roster.

## Ability Score Methods

### Standard Array

Pre-set scores: 15, 14, 13, 12, 10, 8. Assign each score to one ability.

### Point Buy

Start with 8 in each ability and spend 27 points to increase scores (max 15).

| Score | Cost |
| ----- | ---- |
| 8     | 0    |
| 9     | 1    |
| 10    | 2    |
| 11    | 3    |
| 12    | 4    |
| 13    | 5    |
| 14    | 7    |
| 15    | 9    |

### Rolling

Roll 4d6, drop the lowest die, for each of 6 scores. Assign rolled scores to abilities.

## Derived Stats

The wizard automatically calculates:

- **HP**: Hit die max + CON mod at level 1
- **AC**: 10 + DEX mod (unarmored)
- **Initiative**: DEX mod
- **Speed**: From selected race

## Architecture

### State Machine

`src/app/characterCreation/state.ts` - Reducer pattern with:

- `CreationStep` type for wizard flow
- `CharacterCreationState` for all wizard data
- `canProceed()` / `canGoBack()` selectors for navigation gating

### Builder

`src/app/characterCreation/builder.ts` - Pure functions:

- `applyRacialBonuses()` - Add race bonuses to base scores
- `deriveVitals()` - Calculate HP, AC, initiative, speed
- `buildNewCharacterInput()` - Output ready for `createCharacter()`

### UI Components

- `CharacterCreationModal.tsx` - Main modal with stepper
- `AbilityScoresStep.tsx` - All three ability methods
- `ClassStep.tsx`, `RaceStep.tsx`, `BackgroundStep.tsx` - Selection grids
- `EquipmentStep.tsx` - Starting equipment display
- `ConfirmStep.tsx` - Name input and summary

## Future Enhancements

- Equipment choices (Option B) for more customization
- Search/filter in selection lists
- Expanded SRD dataset
