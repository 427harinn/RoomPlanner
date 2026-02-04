import React, { useEffect, useState } from "react";

const mmToM = (value) => value / 1000;
const mToMm = (value) => Number(value) * 1000;

export default function FurnitureEditor({ furniture, isMobile, dispatch }) {
  const [sizeOpen, setSizeOpen] = useState(!isMobile);
  const [radiusOpen, setRadiusOpen] = useState(!isMobile);
  const [widthInput, setWidthInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [rotationInput, setRotationInput] = useState("");

  useEffect(() => {
    setSizeOpen(!isMobile);
    setRadiusOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (!furniture) return;
    setWidthInput(String(mmToM(furniture.width)));
    setHeightInput(String(mmToM(furniture.height)));
    setRotationInput(String(furniture.rotation ?? 0));
  }, [furniture]);

  if (!furniture) {
    return (
      <div className="panel__section">
        <h2>家具編集</h2>
        <p className="muted">家具を選択してください</p>
      </div>
    );
  }

  return (
    <div className="panel__section">
      <h2>家具編集</h2>
      <div className="form-grid editor-group editor-group--open">
        <label>
          名前
          <input
            value={furniture.name}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_FURNITURE",
                payload: {
                  id: furniture.id,
                  updates: { name: e.target.value },
                },
              })
            }
          />
        </label>
        <label>
          色
          <input
            type="color"
            value={furniture.color}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_FURNITURE",
                payload: {
                  id: furniture.id,
                  updates: { color: e.target.value },
                },
              })
            }
          />
        </label>
      </div>
      <details
        className="editor-group"
        open={sizeOpen}
        onToggle={(event) => setSizeOpen(event.currentTarget.open)}
      >
        <summary>サイズ</summary>
        <div className="form-grid">
          <label>
            幅(m)
            <input
              type="number"
              step="0.01"
              value={widthInput}
              onChange={(e) => {
                const next = e.target.value;
                setWidthInput(next);
                if (next === "") return;
                dispatch({
                  type: "UPDATE_FURNITURE",
                  payload: {
                    id: furniture.id,
                    updates: { width: mToMm(next) },
                  },
                });
              }}
              onBlur={(e) => {
                if (e.target.value !== "") return;
                dispatch({
                  type: "UPDATE_FURNITURE",
                  payload: {
                    id: furniture.id,
                    updates: { width: 0 },
                  },
                });
                setWidthInput("0");
              }}
            />
          </label>
          <label>
            高さ(m)
            <input
              type="number"
              step="0.01"
              value={heightInput}
              onChange={(e) => {
                const next = e.target.value;
                setHeightInput(next);
                if (next === "") return;
                dispatch({
                  type: "UPDATE_FURNITURE",
                  payload: {
                    id: furniture.id,
                    updates: { height: mToMm(next) },
                  },
                });
              }}
              onBlur={(e) => {
                if (e.target.value !== "") return;
                dispatch({
                  type: "UPDATE_FURNITURE",
                  payload: {
                    id: furniture.id,
                    updates: { height: 0 },
                  },
                });
                setHeightInput("0");
              }}
            />
          </label>
          <label>
            回転(°)
            <input
              type="number"
              step="1"
              value={rotationInput}
              onChange={(e) => {
                const next = e.target.value;
                setRotationInput(next);
                if (next === "") return;
                dispatch({
                  type: "UPDATE_FURNITURE",
                  payload: {
                    id: furniture.id,
                    updates: { rotation: Number(next) },
                  },
                });
              }}
            />
          </label>
        </div>
      </details>
      <details
        className="editor-group"
        open={radiusOpen}
        onToggle={(event) => setRadiusOpen(event.currentTarget.open)}
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
                value={furniture.radius?.tl ?? 0}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_FURNITURE",
                    payload: {
                      id: furniture.id,
                      updates: {
                        radius: { ...furniture.radius, tl: e.target.value },
                      },
                    },
                  })
                }
              />
              <span>{furniture.radius?.tl ?? 0}°</span>
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
                value={furniture.radius?.tr ?? 0}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_FURNITURE",
                    payload: {
                      id: furniture.id,
                      updates: {
                        radius: { ...furniture.radius, tr: e.target.value },
                      },
                    },
                  })
                }
              />
              <span>{furniture.radius?.tr ?? 0}°</span>
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
                value={furniture.radius?.br ?? 0}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_FURNITURE",
                    payload: {
                      id: furniture.id,
                      updates: {
                        radius: { ...furniture.radius, br: e.target.value },
                      },
                    },
                  })
                }
              />
              <span>{furniture.radius?.br ?? 0}°</span>
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
                value={furniture.radius?.bl ?? 0}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_FURNITURE",
                    payload: {
                      id: furniture.id,
                      updates: {
                        radius: { ...furniture.radius, bl: e.target.value },
                      },
                    },
                  })
                }
              />
              <span>{furniture.radius?.bl ?? 0}°</span>
            </div>
          </label>
        </div>
      </details>
      <div className="editor-actions">
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() =>
            dispatch({ type: "DELETE_FURNITURE", payload: furniture.id })
          }
        >
          家具を削除
        </button>
      </div>
    </div>
  );
}
