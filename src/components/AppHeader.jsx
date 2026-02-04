import React from "react";

export default function AppHeader({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings
}) {
  return (
    <header className="app__header">
      <h1>Room Planner</h1>
      <div className="app__header-actions">
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
        >
          戻る
        </button>
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
        >
          進む
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
