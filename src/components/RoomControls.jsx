import React from "react";

export default function RoomControls({ room, dispatch }) {
  return (
    <div className="panel__section">
      <h2>部屋サイズ</h2>
      <div className="form-grid">
        <label>
          横(mm)
          <input
            type="number"
            value={room.width}
            onChange={e =>
              dispatch({
                type: "SET_ROOM",
                payload: { width: e.target.value, height: room.height }
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
                type: "SET_ROOM",
                payload: { width: room.width, height: e.target.value }
              })
            }
          />
        </label>
      </div>
    </div>
  );
}
