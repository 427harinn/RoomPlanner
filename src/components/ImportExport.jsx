import React, { useRef } from "react";

export default function ImportExport({ state, dispatch }) {
  const inputRef = useRef(null);

  const handleExport = () => {
    const payload = {
      rooms: state.rooms,
      furnitures: state.furnitures,
      gridMM: state.gridMM
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "room-layout.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        dispatch({ type: "IMPORT_LAYOUT", payload: data });
      } catch (error) {
        console.error("Invalid JSON", error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="panel__section">
      <h2>保存 / 読み込み</h2>
      <div className="actions">
        <button className="btn" type="button" onClick={handleExport}>
          Export JSON
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
        />
      </div>
    </div>
  );
}
