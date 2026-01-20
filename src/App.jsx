import React, { useEffect, useReducer } from "react";
import { reducer, initialState } from "./state/reducer.js";
import RoomEditor from "./components/RoomEditor.jsx";
import FurnitureEditor from "./components/FurnitureEditor.jsx";
import ImportExport from "./components/ImportExport.jsx";
import RoomCanvas from "./components/RoomCanvas.jsx";

const initHistory = () => ({
  past: [],
  present: initialState,
  future: [],
  isDragging: false
});

const nonRecordableActions = new Set(["SELECT_FURNITURE", "SET_ACTIVE_ROOM"]);

const isMoveAction = action =>
  action.type === "MOVE_ROOM" || action.type === "MOVE_FURNITURE";

const historyReducer = (state, action) => {
  switch (action.type) {
    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        isDragging: false
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
        isDragging: false
      };
    }
    case "BEGIN_DRAG": {
      if (state.isDragging) return state;
      return {
        ...state,
        past: [...state.past, state.present],
        future: [],
        isDragging: true
      };
    }
    case "END_DRAG": {
      return {
        ...state,
        isDragging: false
      };
    }
    default: {
      const newPresent = reducer(state.present, action);
      if (newPresent === state.present) return state;
      if (state.isDragging && isMoveAction(action)) {
        return {
          ...state,
          present: newPresent
        };
      }
      if (nonRecordableActions.has(action.type)) {
        return {
          ...state,
          present: newPresent
        };
      }
      return {
        ...state,
        past: [...state.past, state.present],
        present: newPresent,
        future: []
      };
    }
  }
};

export default function App() {
  const [history, dispatch] = useReducer(historyReducer, undefined, initHistory);
  const state = history.present;
  const activeRoom =
    state.rooms.find(room => room.id === state.activeRoomId) || null;
  const selectedFurniture =
    state.furnitures.find(f => f.id === state.selectedId) || null;

  const showRoomEditor = Boolean(state.activeRoomId);
  const showFurnitureEditor = Boolean(state.selectedId);

  useEffect(() => {
    const onKeyDown = event => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      if (!modifier) return;

      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          dispatch({ type: "REDO" });
        } else {
          dispatch({ type: "UNDO" });
        }
      } else if (!isMac && event.key.toLowerCase() === "y") {
        event.preventDefault();
        dispatch({ type: "REDO" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Room Planner</h1>
        <div className="app__header-actions">
          <button
            className="btn btn--ghost btn--small"
            type="button"
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={history.past.length === 0}
          >
            戻る
          </button>
          <button
            className="btn btn--ghost btn--small"
            type="button"
            onClick={() => dispatch({ type: "REDO" })}
            disabled={history.future.length === 0}
          >
            進む
          </button>
          <ImportExport state={state} dispatch={dispatch} />
        </div>
      </header>

      <div className="app__columns">
        <section className="panel panel--list">
          <div className="panel__section panel__section--list">
            <h2>部屋 / 家具</h2>
            <ul className="object-list">
              {state.rooms.map(room => {
                const roomFurnitures = state.furnitures.filter(
                  item => item.roomId === room.id
                );
                return (
                  <li key={room.id} className="object-list__item">
                    <button
                      type="button"
                      className={`object-list__button${
                        state.activeRoomId === room.id ? " is-selected" : ""
                      }`}
                      onClick={() =>
                        dispatch({ type: "SET_ACTIVE_ROOM", payload: room.id })
                      }
                    >
                      {room.name}
                    </button>
                    <ul className="object-list__children">
                      {roomFurnitures.map(item => (
                        <li key={item.id} className="object-list__child">
                          <button
                            type="button"
                            className={`object-list__button object-list__button--child${
                              state.selectedId === item.id ? " is-selected" : ""
                            }`}
                            onClick={() =>
                              dispatch({
                                type: "SELECT_FURNITURE",
                                payload: item.id
                              })
                            }
                          >
                            {item.name}
                          </button>
                        </li>
                      ))}
                      {roomFurnitures.length === 0 && (
                        <li className="object-list__empty">家具なし</li>
                      )}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="panel__section panel__section--actions">
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => dispatch({ type: "ADD_ROOM" })}
            >
              部屋を追加
            </button>
            <button
              className="btn"
              type="button"
              disabled={!state.activeRoomId}
              onClick={() => dispatch({ type: "ADD_FURNITURE", payload: {} })}
            >
              家具を追加
            </button>
          </div>
        </section>

        <section className="panel panel--canvas">
          <RoomCanvas
            rooms={state.rooms}
            furnitures={state.furnitures}
            selectedId={state.selectedId}
            activeRoomId={state.activeRoomId}
            dispatch={dispatch}
          />
        </section>

        <section className="panel panel--editor">
          {showRoomEditor && (
            <RoomEditor
              room={activeRoom}
              roomsCount={state.rooms.length}
              dispatch={dispatch}
            />
          )}
          {showFurnitureEditor && !showRoomEditor && (
            <FurnitureEditor
              furniture={selectedFurniture}
              dispatch={dispatch}
            />
          )}
          {!showRoomEditor && !showFurnitureEditor && (
            <div className="panel__section">
              <h2>編集</h2>
              <p className="muted">左の一覧から部屋か家具を選択してください</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
