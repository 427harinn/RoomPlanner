import React from "react";

export default function AppHeader({
  canUndo,
  canRedo,
  canSave,
  currentLayoutName,
  onUndo,
  onRedo,
  onSave,
  onNewSet,
  onOpenSettings,
}) {
  return (
    <header className="app__header">
      <div className="app__header-title">
        <h1>Room Planner</h1>
        <p className="app__header-layout">
          Current Set: {currentLayoutName || "Unsaved"}
        </p>
      </div>
      <div className="app__header-actions">
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
        >
          Redo
        </button>
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={onSave}
          disabled={!canSave}
        >
          Save
        </button>
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={onNewSet}
        >
          New Set
        </button>
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
