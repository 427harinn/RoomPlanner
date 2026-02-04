import React from "react";

export default function SettingsModal({
  settingsTab,
  setSettingsTab,
  gridInput,
  setGridInput,
  gridMM,
  rooms,
  furnitures,
  dispatch,
  onClose
}) {
  const handleExport = () => {
    const payload = {
      rooms,
      furnitures,
      gridMM
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

  const handleGridChange = event => {
    const next = event.target.value;
    setGridInput(next);
    if (next === "") return;
    const parsed = Number(next);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    dispatch({
      type: "SET_GRID_MM",
      payload: Math.max(1, Math.round(parsed * 1000))
    });
  };

  const handleGridBlur = event => {
    if (event.target.value !== "") return;
    dispatch({ type: "SET_GRID_MM", payload: 1 });
    setGridInput("0.001");
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={event => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2>Settings</h2>
          <button
            className="btn btn--ghost btn--small"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="modal__tabs">
          <button
            type="button"
            className={`modal__tab${settingsTab === "grid" ? " is-active" : ""}`}
            onClick={() => setSettingsTab("grid")}
          >
            Grid
          </button>
          <button
            type="button"
            className={`modal__tab${
              settingsTab === "templates" ? " is-active" : ""
            }`}
            onClick={() => setSettingsTab("templates")}
          >
            Templates
          </button>
          <button
            type="button"
            className={`modal__tab${settingsTab === "data" ? " is-active" : ""}`}
            onClick={() => setSettingsTab("data")}
          >
            Data
          </button>
        </div>
        <div className="modal__body">
          {settingsTab === "grid" && (
            <div className="panel__section">
              <h3>Grid</h3>
              <div className="form-grid">
                <label>
                  Grid (m)
                  <input
                    type="number"
                    step="0.01"
                    value={gridInput}
                    onChange={handleGridChange}
                    onBlur={handleGridBlur}
                  />
                </label>
                <p className="muted">You can also double-click the grid label.</p>
              </div>
            </div>
          )}
          {settingsTab === "templates" && (
            <div className="panel__section">
              <h3>Templates</h3>
              <p className="muted">
                Add templates here and choose them when adding furniture.
              </p>
            </div>
          )}
          {settingsTab === "data" && (
            <div className="panel__section">
              <h3>Data</h3>
              <div className="actions">
                <button className="btn" type="button" onClick={handleExport}>
                  Export JSON
                </button>
                <input type="file" accept=".json" onChange={handleImport} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
