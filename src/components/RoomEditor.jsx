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
        <label>
          角丸 左上(°)
          <div className="range-field">
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={room.radius?.tl ?? 0}
              onChange={e =>
                dispatch({
                  type: "UPDATE_ROOM",
                  payload: {
                    id: room.id,
                    updates: {
                      radius: { ...room.radius, tl: e.target.value }
                    }
                  }
                })
              }
            />
            <span>{room.radius?.tl ?? 0}°</span>
          </div>
        </label>
        <label>
          角丸 右上(°)
          <div className="range-field">
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={room.radius?.tr ?? 0}
              onChange={e =>
                dispatch({
                  type: "UPDATE_ROOM",
                  payload: {
                    id: room.id,
                    updates: {
                      radius: { ...room.radius, tr: e.target.value }
                    }
                  }
                })
              }
            />
            <span>{room.radius?.tr ?? 0}°</span>
          </div>
        </label>
        <label>
          角丸 右下(°)
          <div className="range-field">
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={room.radius?.br ?? 0}
              onChange={e =>
                dispatch({
                  type: "UPDATE_ROOM",
                  payload: {
                    id: room.id,
                    updates: {
                      radius: { ...room.radius, br: e.target.value }
                    }
                  }
                })
              }
            />
            <span>{room.radius?.br ?? 0}°</span>
          </div>
        </label>
        <label>
          角丸 左下(°)
          <div className="range-field">
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={room.radius?.bl ?? 0}
              onChange={e =>
                dispatch({
                  type: "UPDATE_ROOM",
                  payload: {
                    id: room.id,
                    updates: {
                      radius: { ...room.radius, bl: e.target.value }
                    }
                  }
                })
              }
            />
            <span>{room.radius?.bl ?? 0}°</span>
          </div>
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
