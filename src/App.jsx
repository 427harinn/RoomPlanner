import React, { useEffect, useReducer, useRef, useState } from "react";
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
  const [openRooms, setOpenRooms] = useState({});
  const [selectionSource, setSelectionSource] = useState("list");
  const [editing, setEditing] = useState({
    type: null,
    id: null,
    value: ""
  });
  const clipboardRef = useRef({ type: null, data: null });
  const selectedRoomId =
    state.activeRoomId ??
    (selectedFurniture
      ? selectedFurniture.roomId ?? "unassigned"
      : null);

  const showRoomEditor = Boolean(state.activeRoomId);
  const showFurnitureEditor = Boolean(state.selectedId);
  const latestStateRef = useRef(state);
  const latestRoomRef = useRef(activeRoom);
  const latestFurnitureRef = useRef(selectedFurniture);

  const startEditing = (type, id, value) => {
    setEditing({ type, id, value });
  };

  const commitEditing = () => {
    if (!editing.id) return;
    const value = editing.value.trim();
    if (editing.type === "room") {
      dispatch({
        type: "UPDATE_ROOM",
        payload: { id: editing.id, updates: { name: value || "部屋" } }
      });
    }
    if (editing.type === "furniture") {
      dispatch({
        type: "UPDATE_FURNITURE",
        payload: { id: editing.id, updates: { name: value || "家具" } }
      });
    }
    setEditing({ type: null, id: null, value: "" });
  };

  const cancelEditing = () => {
    setEditing({ type: null, id: null, value: "" });
  };

  useEffect(() => {
    latestStateRef.current = state;
    latestRoomRef.current = activeRoom;
    latestFurnitureRef.current = selectedFurniture;
  }, [state, activeRoom, selectedFurniture]);

  useEffect(() => {
    if (!selectedRoomId) return;
    if (selectionSource === "canvas") {
      setOpenRooms({ [selectedRoomId]: true });
    } else {
      setOpenRooms(prev => ({ ...prev, [selectedRoomId]: true }));
    }
  }, [selectedRoomId, selectionSource]);

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
      const currentState = latestStateRef.current;
      const currentRoom = latestRoomRef.current;
      const currentFurniture = latestFurnitureRef.current;

      if (modifier) {
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            dispatch({ type: "REDO" });
          } else {
            dispatch({ type: "UNDO" });
          }
          return;
        }
        if (!isMac && event.key.toLowerCase() === "y") {
          event.preventDefault();
          dispatch({ type: "REDO" });
          return;
        }
        if (event.key.toLowerCase() === "c") {
          event.preventDefault();
          if (currentFurniture) {
            clipboardRef.current = {
              type: "furniture",
              data: { ...currentFurniture }
            };
          } else if (currentRoom) {
            const roomFurnitures = currentState.furnitures.filter(
              item => item.roomId === currentRoom.id
            );
            clipboardRef.current = {
              type: "room",
              data: {
                room: { ...currentRoom },
                furnitures: roomFurnitures.map(item => ({ ...item }))
              }
            };
          } else {
            clipboardRef.current = { type: null, data: null };
          }
          return;
        }
        if (event.key.toLowerCase() === "v") {
          const clipboard = clipboardRef.current;
          if (!clipboard?.data) return;
          event.preventDefault();
          setSelectionSource("list");
          if (clipboard.type === "furniture") {
            dispatch({
              type: "PASTE_FURNITURE",
              payload: {
                furniture: clipboard.data,
                targetRoomId: currentRoom?.id ?? null
              }
            });
          } else if (clipboard.type === "room") {
            dispatch({
              type: "PASTE_ROOM",
              payload: clipboard.data
            });
          }
        }
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        if (currentFurniture) {
          event.preventDefault();
          dispatch({ type: "DELETE_FURNITURE", payload: currentFurniture.id });
          return;
        }
        if (currentRoom) {
          event.preventDefault();
          dispatch({ type: "DELETE_ROOM", payload: currentRoom.id });
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const dispatchFromCanvas = action => {
    if (action.type === "SET_ACTIVE_ROOM" || action.type === "SELECT_FURNITURE") {
      setSelectionSource("canvas");
    }
    dispatch(action);
  };

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
                const isOpen = Boolean(openRooms[room.id]);
                const isEditingRoom =
                  editing.type === "room" && editing.id === room.id;
                return (
                  <li key={room.id} className="object-list__item">
                    <details
                      className="object-list__group"
                      open={isOpen}
                      onToggle={event => {
                        const isOpenNext = event.currentTarget?.open ?? false;
                        setOpenRooms(prev => ({
                          ...prev,
                          [room.id]: isOpenNext
                        }));
                      }}
                    >
                      <summary
                        className={`object-list__summary${
                          state.activeRoomId === room.id ? " is-selected" : ""
                        }`}
                        onClick={() => {
                          setSelectionSource("list");
                          dispatch({
                            type: "SET_ACTIVE_ROOM",
                            payload: room.id
                          });
                        }}
                        onDoubleClick={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectionSource("list");
                          startEditing("room", room.id, room.name);
                        }}
                      >
                        <span className="object-list__toggle" aria-hidden="true" />
                        {isEditingRoom ? (
                          <input
                            className="inline-input"
                            value={editing.value}
                            autoFocus
                            onChange={event =>
                              setEditing(prev => ({
                                ...prev,
                                value: event.target.value
                              }))
                            }
                            onBlur={commitEditing}
                            onKeyDown={event => {
                              if (event.key === "Enter") {
                                commitEditing();
                              }
                              if (event.key === "Escape") {
                                cancelEditing();
                              }
                            }}
                          />
                        ) : (
                          room.name
                        )}
                      </summary>
                      <ul className="object-list__children">
                      {roomFurnitures.map(item => (
                        <li key={item.id} className="object-list__child">
                          {editing.type === "furniture" &&
                          editing.id === item.id ? (
                            <input
                              className="inline-input inline-input--child"
                              value={editing.value}
                              autoFocus
                              onChange={event =>
                                setEditing(prev => ({
                                  ...prev,
                                  value: event.target.value
                                }))
                              }
                              onBlur={commitEditing}
                              onKeyDown={event => {
                                if (event.key === "Enter") {
                                  commitEditing();
                                }
                                if (event.key === "Escape") {
                                  cancelEditing();
                                }
                              }}
                            />
                          ) : (
                          <button
                            type="button"
                            className={`object-list__button object-list__button--child${
                              state.selectedId === item.id ? " is-selected" : ""
                            }`}
                            onClick={() => {
                              setSelectionSource("list");
                              dispatch({
                                type: "SELECT_FURNITURE",
                                payload: item.id
                              });
                            }}
                            onDoubleClick={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectionSource("list");
                              startEditing("furniture", item.id, item.name);
                            }}
                          >
                            {item.name}
                          </button>
                          )}
                        </li>
                      ))}
                      {roomFurnitures.length === 0 && (
                        <li className="object-list__empty">家具なし</li>
                      )}
                      </ul>
                    </details>
                  </li>
                );
              })}
              {state.furnitures.some(item => !item.roomId) && (
                <li className="object-list__item">
                  <details
                    className="object-list__group"
                    open={Boolean(openRooms.unassigned)}
                    onToggle={event => {
                      const isOpenNext = event.currentTarget?.open ?? false;
                      setOpenRooms(prev => ({
                        ...prev,
                        unassigned: isOpenNext
                      }));
                    }}
                  >
                    <summary
                      className={`object-list__summary${
                        selectedRoomId === "unassigned" ? " is-selected" : ""
                      }`}
                    >
                      <span className="object-list__toggle" aria-hidden="true" />
                      未割り当て
                    </summary>
                    <ul className="object-list__children">
                      {state.furnitures
                        .filter(item => !item.roomId)
                        .map(item => (
                          <li key={item.id} className="object-list__child">
                            {editing.type === "furniture" &&
                            editing.id === item.id ? (
                              <input
                                className="inline-input inline-input--child"
                                value={editing.value}
                                autoFocus
                                onChange={event =>
                                  setEditing(prev => ({
                                    ...prev,
                                    value: event.target.value
                                  }))
                                }
                                onBlur={commitEditing}
                                onKeyDown={event => {
                                  if (event.key === "Enter") {
                                    commitEditing();
                                  }
                                  if (event.key === "Escape") {
                                    cancelEditing();
                                  }
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                className={`object-list__button object-list__button--child${
                                  state.selectedId === item.id
                                    ? " is-selected"
                                    : ""
                                }`}
                                onClick={() => {
                                  setSelectionSource("list");
                                  dispatch({
                                    type: "SELECT_FURNITURE",
                                    payload: item.id
                                  });
                                }}
                                onDoubleClick={event => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setSelectionSource("list");
                                  startEditing("furniture", item.id, item.name);
                                }}
                              >
                                {item.name}
                              </button>
                            )}
                          </li>
                        ))}
                    </ul>
                  </details>
                </li>
              )}
            </ul>
          </div>
          <div className="panel__section panel__section--actions">
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => {
                setSelectionSource("list");
                dispatch({ type: "ADD_ROOM" });
              }}
            >
              部屋を追加
            </button>
            <button
              className="btn"
              type="button"
              disabled={!state.activeRoomId}
              onClick={() => {
                setSelectionSource("list");
                dispatch({ type: "ADD_FURNITURE", payload: {} });
              }}
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
            dispatch={dispatchFromCanvas}
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
