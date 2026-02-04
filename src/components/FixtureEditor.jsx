import React from "react";

const fixtureTypeLabel = (fixture) => {
  if (!fixture) return "";
  if (fixture.type === "door") return "ドア";
  if (fixture.type === "window") return "窓";
  if (fixture.type === "pillar") return "柱";
  return "コンセント";
};

export default function FixtureEditor({ room, fixture, dispatch }) {
  if (!room || !fixture) return null;

  return (
    <div className="panel__section">
      <h2>付属品編集</h2>
      <div className="form-grid">
        <div className="fixture-type-label">種類: {fixtureTypeLabel(fixture)}</div>
        {fixture.type === "pillar" && (
          <label>
            形状
            <select
              value={fixture.shape ?? "rect"}
              onChange={(event) =>
                dispatch({
                  type: "UPDATE_FIXTURE",
                  payload: {
                    roomId: room.id,
                    fixtureId: fixture.id,
                    updates: { shape: event.target.value },
                  },
                })
              }
            >
              <option value="rect">四角形</option>
              <option value="triangle">三角形</option>
            </select>
          </label>
        )}
        <label>
          回転 (°)
          <input
            type="number"
            step="1"
            value={fixture.rotation ?? 0}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_FIXTURE",
                payload: {
                  roomId: room.id,
                  fixtureId: fixture.id,
                  updates: { rotation: Number(event.target.value) },
                },
              })
            }
          />
        </label>
        <label>
          幅 (mm)
          <input
            type="number"
            value={fixture.width}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_FIXTURE",
                payload: {
                  roomId: room.id,
                  fixtureId: fixture.id,
                  updates: { width: event.target.value },
                },
              })
            }
          />
        </label>
        <label>
          高さ (mm)
          <input
            type="number"
            value={fixture.height}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_FIXTURE",
                payload: {
                  roomId: room.id,
                  fixtureId: fixture.id,
                  updates: { height: event.target.value },
                },
              })
            }
          />
        </label>
        <label>
          X (mm)
          <input
            type="number"
            value={fixture.x}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_FIXTURE",
                payload: {
                  roomId: room.id,
                  fixtureId: fixture.id,
                  updates: { x: event.target.value },
                },
              })
            }
          />
        </label>
        <label>
          Y (mm)
          <input
            type="number"
            value={fixture.y}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_FIXTURE",
                payload: {
                  roomId: room.id,
                  fixtureId: fixture.id,
                  updates: { y: event.target.value },
                },
              })
            }
          />
        </label>
        <label className="form-grid__full">
          メモ
          <textarea
            rows={3}
            value={fixture.memo ?? ""}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_FIXTURE",
                payload: {
                  roomId: room.id,
                  fixtureId: fixture.id,
                  updates: { memo: event.target.value },
                },
              })
            }
          />
        </label>
      </div>
      <div className="editor-actions">
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() =>
            dispatch({
              type: "DELETE_FIXTURE",
              payload: { roomId: room.id, fixtureId: fixture.id },
            })
          }
        >
          付属品を削除
        </button>
      </div>
    </div>
  );
}
