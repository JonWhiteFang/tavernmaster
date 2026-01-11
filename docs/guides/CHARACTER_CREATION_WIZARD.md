# Character Creation Wizard

The Character Creation Wizard provides a step-by-step flow for creating SRD-compliant D&D 5e characters in Tavern Master.

## Overview

The wizard guides users through 6 steps:

1. **Ability Scores** - Choose standard array, point buy, or roll 4d6 drop lowest
2. **Class** - Select from all 12 SRD classes
3. **Race** - Select from 13 SRD races with ability bonuses
4. **Background** - Select from 13 SRD backgrounds with skill proficiencies
5. **Equipment** - Review starting equipment based on class
6. **Confirm** - Enter name, choose alignment, review summary

## Usage

1. Navigate to **Party Sheets**
2. Click the **Wizard** button in the roster panel
3. Complete each step and click **Next**
4. On the final step, enter a character name and click **Create Character**

The new character appears immediately in the roster with all stats calculated and starting equipment assigned.

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

## SRD Content

### Classes (12)

All SRD classes with hit dice and starting equipment:

- Barbarian (d12), Bard (d8), Cleric (d8), Druid (d8)
- Fighter (d10), Monk (d8), Paladin (d10), Ranger (d10)
- Rogue (d8), Sorcerer (d6), Warlock (d8), Wizard (d6)

### Races (13)

All SRD races with speed and ability bonuses:

- Hill Dwarf, Mountain Dwarf
- High Elf, Wood Elf
- Lightfoot Halfling, Stout Halfling
- Human, Dragonborn
- Forest Gnome, Rock Gnome
- Half-Elf (with flexible bonus choices), Half-Orc, Tiefling

### Backgrounds (13)

All SRD backgrounds with skill proficiencies:

- Acolyte, Charlatan, Criminal, Entertainer, Folk Hero
- Guild Artisan, Hermit, Noble, Outlander, Sage
- Sailor, Soldier, Urchin

## Starting Equipment

Each class has pre-defined starting equipment that is automatically added to the character's inventory:

- **Fighter**: Longsword, shield, chain mail, light crossbow, bolts, dungeoneer's pack
- **Rogue**: Rapier, shortbow, arrows, leather armor, thieves' tools, burglar's pack
- **Cleric**: Mace, scale mail, shield, holy symbol, priest's pack
- **Wizard**: Quarterstaff, component pouch, scholar's pack
- (etc. for all classes)

## Derived Stats

The wizard automatically calculates:

- **HP**: Hit die max + CON mod at level 1
- **AC**: 10 + DEX mod (unarmored)
- **Initiative**: DEX mod
- **Speed**: From selected race

Racial ability bonuses are applied on top of base scores.

## Architecture

### State Machine

`src/app/characterCreation/state.ts` - Reducer pattern with:

- `CreationStep` type for wizard flow (6 steps)
- `CharacterCreationState` for all wizard data
- `canProceed()` / `canGoBack()` selectors for navigation gating

### Types

`src/app/characterCreation/types.ts` - Shared types:

- `SrdClass` with id, name, hitDie, startingItemIds
- `SrdRace` with id, name, speed, abilityBonuses, bonusChoices
- `SrdBackground` with id, name, skillProficiencies
- `SrdItem` with id, name

### Builder

`src/app/characterCreation/builder.ts` - Pure functions:

- `applyRacialBonuses()` - Add race bonuses to base scores
- `deriveVitals()` - Calculate HP, AC, initiative, speed
- `buildNewCharacterInput()` - Output ready for `createCharacter()`

### Data Layer

`src/app/data/srdContent.ts` - Database queries:

- `listSrdClasses()` - All classes with starting equipment
- `listSrdRaces()` - All races with ability bonuses
- `listSrdBackgrounds()` - All backgrounds with skill proficiencies
- `getSrdItemsByIds()` - Resolve item IDs to names

### UI Components

- `CharacterCreationModal.tsx` - Main modal with stepper and cancel confirmation
- `AbilityScoresStep.tsx` - All three ability methods
- `ClassStep.tsx` - Class selection grid with hit die display
- `RaceStep.tsx` - Race selection with speed and ability bonuses
- `BackgroundStep.tsx` - Background selection with skill proficiencies
- `EquipmentStep.tsx` - Starting equipment display
- `ConfirmStep.tsx` - Name input, alignment dropdown, and summary

## Cancel Confirmation

If the user has made progress (moved past the first step or entered data), closing the wizard shows a confirmation dialog to prevent accidental data loss.

## Future Enhancements

- Equipment choices (Option B) for more customization
- Search/filter in selection lists
- Expanded SRD dataset
- Subrace selection
- Multiclass support
