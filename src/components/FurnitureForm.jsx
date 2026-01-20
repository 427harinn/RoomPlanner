import React, { useState } from "react";

const defaultForm = {
  name: "デスク",
  width: 1200,
  height: 600,
  color: "#8ecae6"
};

export default function FurnitureForm({ room, dispatch }) {
  const [form, setForm] = useState(defaultForm);

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="panel__section">
      <h2>家具追加</h2>
      {room ? (
        <p className="muted">追加先: {room.name}</p>
      ) : (
        <p className="muted">部屋を選択してください</p>
      )}
      <div className="form-grid">
        <label>
          名前
          <input
            value={form.name}
            onChange={e => update("name", e.target.value)}
          />
        </label>
        <label>
          横(mm)
          <input
            type="number"
            value={form.width}
            onChange={e => update("width", e.target.value)}
          />
        </label>
        <label>
          縦(mm)
          <input
            type="number"
            value={form.height}
            onChange={e => update("height", e.target.value)}
          />
        </label>
        <label>
          色
          <input
            type="color"
            value={form.color}
            onChange={e => update("color", e.target.value)}
          />
        </label>
      </div>
      <button
        className="btn"
        type="button"
        disabled={!room}
        onClick={() => dispatch({ type: "ADD_FURNITURE", payload: form })}
      >
        家具を追加
      </button>
    </div>
  );
}
