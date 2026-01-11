import { useEffect, useState } from "react";
import type { SrdClass, SrdItem } from "../../characterCreation/types";
import { getSrdItemsByIds } from "../../data/srdContent";

type Props = {
  selectedClass: SrdClass | null;
};

export default function EquipmentStep({ selectedClass }: Props) {
  const [items, setItems] = useState<SrdItem[]>([]);

  useEffect(() => {
    if (selectedClass?.startingItemIds.length) {
      getSrdItemsByIds(selectedClass.startingItemIds).then(setItems);
    } else {
      setItems([]);
    }
  }, [selectedClass]);

  return (
    <div className="wizard-step-content">
      <p className="wizard-step-description">
        Your {selectedClass?.name ?? "class"} starts with the following equipment:
      </p>
      {items.length > 0 ? (
        <ul className="equipment-list">
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      ) : (
        <p className="wizard-empty">No starting equipment defined.</p>
      )}
    </div>
  );
}
