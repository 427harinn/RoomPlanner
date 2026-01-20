import React from "react";

export default function RoomEditor({ room, roomsCount, dispatch }) {
  if (!room) {
    return (
      <div className="panel__section">
        <h2>部屋情報</h2>
        <p className="muted">部屋を選択してください</p>
      </div>
    );
  }

  return (
    <div className="panel__section">
      <h2>部屋情報</h2>
      <div className="form-grid">
        <label>
          名前
          <input
            value={room.name}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: { id: room.id, updates: { name: e.target.value } }
              })
            }
          />
        </label>
        <label>
          横(mm)
          <input
            type="number"
            value={room.width}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: {
                  id: room.id,
                  updates: { width: e.target.value }
                }
              })
            }
          />
        </label>
        <label>
          縦(mm)
          <input
            type="number"
            value={room.height}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: {
                  id: room.id,
                  updates: { height: e.target.value }
                }
              })
            }
          />
        </label>
        <label>
          位置X(mm)
          <input
            type="number"
            value={room.x}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: {
                  id: room.id,
                  updates: { x: e.target.value }
                }
              })
            }
          />
        </label>
        <label>
          位置Y(mm)
          <input
            type="number"
            value={room.y}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: {
                  id: room.id,
                  updates: { y: e.target.value }
                }
              })
            }
          />
        </label>
      </div>
      <div className="editor-actions">
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => dispatch({ type: "DUPLICATE_ROOM", payload: room.id })}
        >
          部屋を複製
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          disabled={roomsCount <= 1}
          onClick={() => dispatch({ type: "DELETE_ROOM", payload: room.id })}
        >
          部屋を削除
        </button>
      </div>
    </div>
  );
}
