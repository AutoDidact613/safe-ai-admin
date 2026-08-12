import { useState } from "react";

interface ArrayInputProps {
  label: string;
  items: string[];
  placeholder: string;
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
}

export default function ArrayInput({
  label,
  items,
  placeholder,
  onAdd,
  onRemove,
  onUpdate,
}: ArrayInputProps) {
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem("");
    }
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(idx, e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onRemove(idx)}
              style={{ padding: "5px 15px" }}
            >
              ×
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1 }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAdd}
            style={{ padding: "5px 15px" }}
          >
            + הוסף
          </button>
        </div>
      </div>
    </div>
  );
}
