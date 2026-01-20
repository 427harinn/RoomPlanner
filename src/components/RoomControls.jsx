import React from "react";

export default function RoomControls({ rooms, activeRoomId, dispatch }) {
  const activeRoom = rooms.find(room => room.id === activeRoomId) || rooms[0];

  if (!activeRoom) {
    return null;
  }

  return (
    <div className="panel__section">
      <h2>部屋設定</h2>
      <div className="form-grid">
        <label>
          選択中の部屋
          <select
            value={activeRoomId}
            onChange={e =>
              dispatch({ type: "SET_ACTIVE_ROOM", payload: e.target.value })
            }
          >
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        className="btn btn--ghost"
        type="button"
        onClick={() => dispatch({ type: "ADD_ROOM" })}
      >
        部屋を追加
      </button>
      <div className="room-actions">
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() =>
            dispatch({ type: "DUPLICATE_ROOM", payload: activeRoom.id })
          }
        >
          部屋を複製
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          disabled={rooms.length <= 1}
          onClick={() =>
            dispatch({ type: "DELETE_ROOM", payload: activeRoom.id })
          }
        >
          部屋を削除
        </button>
      </div>
      <div className="form-grid">
        <label>
          名前
          <input
            value={activeRoom.name}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: { id: activeRoom.id, updates: { name: e.target.value } }
              })
            }
          />
        </label>
        <label>
          横(mm)
          <input
            type="number"
            value={activeRoom.width}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: {
                  id: activeRoom.id,
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
            value={activeRoom.height}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: {
                  id: activeRoom.id,
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
            value={activeRoom.x}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: {
                  id: activeRoom.id,
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
            value={activeRoom.y}
            onChange={e =>
              dispatch({
                type: "UPDATE_ROOM",
                payload: {
                  id: activeRoom.id,
                  updates: { y: e.target.value }
                }
              })
            }
          />
        </label>
      </div>
    </div>
  );
}
