import React from "react";

export default function ObjectListPanel({
  state,
  selectedFixtureId,
  openRooms,
  setOpenRooms,
  selectedRoomId,
  selectedFurniture,
  templates = [],
  selectedTemplateId,
  setSelectedTemplateId,
  selectionSource,
  setSelectionSource,
  editing,
  startEditing,
  commitEditing,
  cancelEditing,
  setEditing,
  setViewMode,
  setMobileTab,
  isMobile,
  dispatch,
}) {
  const selectedFixtureRoomId =
    state.rooms.find((room) =>
      (room.fixtures ?? []).some((fixture) => fixture.id === selectedFixtureId),
    )?.id ?? null;
  const targetRoomId =
    state.activeRoomId ?? selectedFurniture?.roomId ?? selectedFixtureRoomId;

  const fixtureLabel = (type) => {
    switch (type) {
      case "door":
        return "ドア";
      case "window":
        return "窓";
      case "pillar":
        return "柱";
      default:
        return "コンセント";
    }
  };

  return (
    <>
      <div className="panel__section panel__section--actions">
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => {
            setSelectionSource("list");
            setViewMode("all");
            if (isMobile) {
              setMobileTab("editor");
            }
            dispatch({ type: "ADD_ROOM" });
          }}
        >
          部屋を追加
        </button>
        <div className="furniture-add-row">
          <label>
            家具テンプレ
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              disabled={templates.length === 0}
            >
              <option value="">通常</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn"
            type="button"
            disabled={!targetRoomId}
            onClick={() => {
              setSelectionSource("list");
              if (isMobile) {
                setMobileTab("editor");
              }
              dispatch({
                type: "ADD_FURNITURE",
                payload: selectedTemplateId
                  ? { templateId: selectedTemplateId, roomId: targetRoomId }
                  : { roomId: targetRoomId },
              });
            }}
          >
            家具追加
          </button>
        </div>
        <div className="fixture-add-row">
          <div className="fixture-add-row__label">付属品追加</div>
          <div className="fixture-add-row__buttons">
            <button
              className="btn btn--ghost btn--small"
              type="button"
              disabled={!targetRoomId}
              onClick={() => {
                const room = state.rooms.find(
                  (entry) => entry.id === targetRoomId,
                );
                const size = 700;
                dispatch({
                  type: "ADD_FIXTURE",
                  payload: {
                    roomId: targetRoomId,
                    fixture: {
                      type: "door",
                      width: size,
                      height: 200,
                      x: room ? room.width / 2 - size / 2 : 0,
                      y: room ? room.height / 2 - 100 : 0,
                    },
                  },
                });
              }}
            >
              ドア
            </button>
            <button
              className="btn btn--ghost btn--small"
              type="button"
              disabled={!targetRoomId}
              onClick={() => {
                const room = state.rooms.find(
                  (entry) => entry.id === targetRoomId,
                );
                const size = 1400;
                dispatch({
                  type: "ADD_FIXTURE",
                  payload: {
                    roomId: targetRoomId,
                    fixture: {
                      type: "window",
                      width: size,
                      height: 160,
                      x: room ? room.width / 2 - size / 2 : 0,
                      y: room ? room.height / 2 - 80 : 0,
                    },
                  },
                });
              }}
            >
              窓
            </button>
            <button
              className="btn btn--ghost btn--small"
              type="button"
              disabled={!targetRoomId}
              onClick={() => {
                const room = state.rooms.find(
                  (entry) => entry.id === targetRoomId,
                );
                const size = 120;
                dispatch({
                  type: "ADD_FIXTURE",
                  payload: {
                    roomId: targetRoomId,
                    fixture: {
                      type: "outlet",
                      width: size,
                      height: 80,
                      x: room ? room.width / 2 - size / 2 : 0,
                      y: room ? room.height / 2 - 40 : 0,
                    },
                  },
                });
              }}
            >
              コンセント
            </button>
            <button
              className="btn btn--ghost btn--small"
              type="button"
              disabled={!targetRoomId}
              onClick={() => {
                const room = state.rooms.find(
                  (entry) => entry.id === targetRoomId,
                );
                const size = 320;
                dispatch({
                  type: "ADD_FIXTURE",
                  payload: {
                    roomId: targetRoomId,
                    fixture: {
                      type: "pillar",
                      width: size,
                      height: size,
                      x: room ? room.width / 2 - size / 2 : 0,
                      y: room ? room.height / 2 - size / 2 : 0,
                    },
                  },
                });
              }}
            >
              柱
            </button>
          </div>
        </div>
      </div>
      <div className="panel__section panel__section--list">
        <h2>部屋 / 家具</h2>
        <ul className="object-list">
          {state.rooms.map((room) => {
            const roomFurnitures = state.furnitures.filter(
              (item) => item.roomId === room.id,
            );
            const roomFixtures = room.fixtures ?? [];
            const isOpen = Boolean(openRooms[room.id]);
            const isEditingRoom =
              editing.type === "room" && editing.id === room.id;
            return (
              <li key={room.id} className="object-list__item">
                <details
                  className="object-list__group"
                  open={isOpen}
                  onToggle={(event) => {
                    const isOpenNext = event.currentTarget?.open ?? false;
                    setOpenRooms((prev) => ({
                      ...prev,
                      [room.id]: isOpenNext,
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
                        payload: room.id,
                      });
                    }}
                    onDoubleClick={(event) => {
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
                        onChange={(event) =>
                          setEditing((prev) => ({
                            ...prev,
                            value: event.target.value,
                          }))
                        }
                        onBlur={commitEditing}
                        onKeyDown={(event) => {
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
                    {roomFurnitures.map((item) => (
                      <li key={item.id} className="object-list__child">
                        {editing.type === "furniture" &&
                        editing.id === item.id ? (
                          <input
                            className="inline-input inline-input--child"
                            value={editing.value}
                            autoFocus
                            onChange={(event) =>
                              setEditing((prev) => ({
                                ...prev,
                                value: event.target.value,
                              }))
                            }
                            onBlur={commitEditing}
                            onKeyDown={(event) => {
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
                                payload: item.id,
                              });
                            }}
                            onDoubleClick={(event) => {
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
                  <div className="fixture-list">
                    <div className="fixture-list__title">付属品</div>
                    {roomFixtures.length === 0 && (
                      <div className="object-list__empty">付属品なし</div>
                    )}
                    {roomFixtures.length > 0 && (
                      <ul className="fixture-list__items">
                        {(() => {
                          const counts = {
                            door: 0,
                            window: 0,
                            outlet: 0,
                            pillar: 0,
                          };
                          return roomFixtures.map((fixture) => {
                            counts[fixture.type] =
                              (counts[fixture.type] ?? 0) + 1;
                            const index = counts[fixture.type];
                            return (
                              <li
                                key={fixture.id}
                                className="fixture-list__item"
                              >
                                <button
                                  type="button"
                                  className="fixture-list__button"
                                  onClick={() => {
                                    setSelectionSource("list");
                                    dispatch({
                                      type: "SELECT_FIXTURE",
                                      payload: fixture.id,
                                    });
                                  }}
                                >
                                  {fixtureLabel(fixture.type)} {index}
                                </button>
                              </li>
                            );
                          });
                        })()}
                      </ul>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
          {state.furnitures.some((item) => !item.roomId) && (
            <li className="object-list__item">
              <details
                className="object-list__group"
                open={Boolean(openRooms.unassigned)}
                onToggle={(event) => {
                  const isOpenNext = event.currentTarget?.open ?? false;
                  setOpenRooms((prev) => ({
                    ...prev,
                    unassigned: isOpenNext,
                  }));
                }}
              >
                <summary
                  className={`object-list__summary${
                    selectedRoomId === "unassigned" ? " is-selected" : ""
                  }`}
                >
                  <span className="object-list__toggle" aria-hidden="true" />
                  未割当
                </summary>
                <ul className="object-list__children">
                  {state.furnitures
                    .filter((item) => !item.roomId)
                    .map((item) => (
                      <li key={item.id} className="object-list__child">
                        {editing.type === "furniture" &&
                        editing.id === item.id ? (
                          <input
                            className="inline-input inline-input--child"
                            value={editing.value}
                            autoFocus
                            onChange={(event) =>
                              setEditing((prev) => ({
                                ...prev,
                                value: event.target.value,
                              }))
                            }
                            onBlur={commitEditing}
                            onKeyDown={(event) => {
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
                                payload: item.id,
                              });
                            }}
                            onDoubleClick={(event) => {
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
    </>
  );
}
