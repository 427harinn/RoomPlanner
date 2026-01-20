import React from "react";

export default function FurnitureEditor({ furniture, dispatch }) {
  return (
    <div className="panel__section">
      <h2>選択中の家具を編集</h2>
      {!furniture ? (
        <p className="muted">家具を選択してください</p>
      ) : (
        <div className="form-grid">
          <label>
            名前
            <input
              value={furniture.name}
              onChange={e =>
                dispatch({
                  type: "UPDATE_FURNITURE",
                  payload: {
                    id: furniture.id,
                    updates: { name: e.target.value }
                  }
                })
              }
            />
          </label>
          <label>
            横(mm)
            <input
              type="number"
              value={furniture.width}
              onChange={e =>
                dispatch({
                  type: "UPDATE_FURNITURE",
                  payload: {
                    id: furniture.id,
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
              value={furniture.height}
              onChange={e =>
                dispatch({
                  type: "UPDATE_FURNITURE",
                  payload: {
                    id: furniture.id,
                    updates: { height: e.target.value }
                  }
                })
              }
            />
          </label>
          <label>
            色
            <input
              type="color"
              value={furniture.color}
              onChange={e =>
                dispatch({
                  type: "UPDATE_FURNITURE",
                  payload: {
                    id: furniture.id,
                    updates: { color: e.target.value }
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
                value={furniture.radius?.tl ?? 0}
                onChange={e =>
                  dispatch({
                    type: "UPDATE_FURNITURE",
                    payload: {
                      id: furniture.id,
                      updates: {
                        radius: { ...furniture.radius, tl: e.target.value }
                      }
                    }
                  })
                }
              />
              <span>{furniture.radius?.tl ?? 0}°</span>
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
                value={furniture.radius?.tr ?? 0}
                onChange={e =>
                  dispatch({
                    type: "UPDATE_FURNITURE",
                    payload: {
                      id: furniture.id,
                      updates: {
                        radius: { ...furniture.radius, tr: e.target.value }
                      }
                    }
                  })
                }
              />
              <span>{furniture.radius?.tr ?? 0}°</span>
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
                value={furniture.radius?.br ?? 0}
                onChange={e =>
                  dispatch({
                    type: "UPDATE_FURNITURE",
                    payload: {
                      id: furniture.id,
                      updates: {
                        radius: { ...furniture.radius, br: e.target.value }
                      }
                    }
                  })
                }
              />
              <span>{furniture.radius?.br ?? 0}°</span>
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
                value={furniture.radius?.bl ?? 0}
                onChange={e =>
                  dispatch({
                    type: "UPDATE_FURNITURE",
                    payload: {
                      id: furniture.id,
                      updates: {
                        radius: { ...furniture.radius, bl: e.target.value }
                      }
                    }
                  })
                }
              />
              <span>{furniture.radius?.bl ?? 0}°</span>
            </div>
          </label>
        </div>
      )}
      <div className="editor-actions">
        <button
          className="btn btn--ghost"
          type="button"
          disabled={!furniture}
          onClick={() =>
            furniture &&
            dispatch({ type: "TOGGLE_ROTATION", payload: furniture.id })
          }
        >
          回転
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          disabled={!furniture}
          onClick={() =>
            furniture &&
            dispatch({ type: "DELETE_FURNITURE", payload: furniture.id })
          }
        >
          家具を削除
        </button>
      </div>
    </div>
  );
}
