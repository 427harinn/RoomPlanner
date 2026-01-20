import React, { useEffect, useState } from "react";

const mmToM = value => value / 1000;
const mToMm = value => Number(value) * 1000;

export default function RoomEditor({ room, roomsCount, isMobile, dispatch }) {
  const [sizeOpen, setSizeOpen] = useState(!isMobile);
  const [positionOpen, setPositionOpen] = useState(!isMobile);
  const [radiusOpen, setRadiusOpen] = useState(!isMobile);

  useEffect(() => {
    setSizeOpen(!isMobile);
    setPositionOpen(!isMobile);
    setRadiusOpen(!isMobile);
  }, [isMobile]);
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
      <div className="form-grid editor-group editor-group--open">
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
      </div>
      <details
        className="editor-group"
        open={sizeOpen}
        onToggle={event => setSizeOpen(event.currentTarget.open)}
      >
        <summary>サイズ</summary>
        <div className="form-grid">
          <label>
            横(m)
            <input
              type="number"
              step="0.01"
              value={mmToM(room.width)}
              onChange={e =>
                dispatch({
                  type: "UPDATE_ROOM",
                  payload: {
                    id: room.id,
                    updates: { width: mToMm(e.target.value) }
                  }
                })
              }
            />
          </label>
          <label>
            縦(m)
            <input
              type="number"
              step="0.01"
              value={mmToM(room.height)}
              onChange={e =>
                dispatch({
                  type: "UPDATE_ROOM",
                  payload: {
                    id: room.id,
                    updates: { height: mToMm(e.target.value) }
                  }
                })
              }
            />
          </label>
        </div>
      </details>
      <details
        className="editor-group"
        open={positionOpen}
        onToggle={event => setPositionOpen(event.currentTarget.open)}
      >
        <summary>座標</summary>
        <div className="form-grid">
          <label>
            位置X(m)
            <input
              type="number"
              step="0.01"
              value={mmToM(room.x)}
              onChange={e =>
                dispatch({
                  type: "UPDATE_ROOM",
                  payload: {
                    id: room.id,
                    updates: { x: mToMm(e.target.value) }
                  }
                })
              }
            />
          </label>
          <label>
            位置Y(m)
            <input
              type="number"
              step="0.01"
              value={mmToM(room.y)}
              onChange={e =>
                dispatch({
                  type: "UPDATE_ROOM",
                  payload: {
                    id: room.id,
                    updates: { y: mToMm(e.target.value) }
                  }
                })
              }
            />
          </label>
        </div>
      </details>
      <details
        className="editor-group"
        open={radiusOpen}
        onToggle={event => setRadiusOpen(event.currentTarget.open)}
      >
        <summary>角丸</summary>
        <div className="form-grid">
          <label>
            左上(°)
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
            右上(°)
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
            右下(°)
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
            左下(°)
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
      </details>
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
