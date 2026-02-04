import React, { useEffect, useReducer, useRef, useState } from "react";
import { initHistory, historyReducer } from "./state/history.js";
import AppHeader from "./components/AppHeader.jsx";
import RoomCanvas from "./components/RoomCanvas.jsx";
import ObjectListPanel from "./components/ObjectListPanel.jsx";
import EditorPanel from "./components/EditorPanel.jsx";
import MobileDrawer from "./components/MobileDrawer.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import ExportPreviewModal from "./components/ExportPreviewModal.jsx";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts.js";

export default function App() {
  const [history, dispatch] = useReducer(
    historyReducer,
    undefined,
    initHistory,
  );
  const state = history.present;
  const activeRoom =
    state.rooms.find((room) => room.id === state.activeRoomId) || null;
  const selectedFurniture =
    state.furnitures.find((f) => f.id === state.selectedId) || null;
  const selectedFixtureRoom =
    state.rooms.find((room) =>
      (room.fixtures ?? []).some(
        (fixture) => fixture.id === state.selectedFixtureId,
      ),
    ) || null;
  const selectedFixture =
    selectedFixtureRoom?.fixtures?.find(
      (fixture) => fixture.id === state.selectedFixtureId,
    ) || null;
  const [openRooms, setOpenRooms] = useState({});
  const [selectionSource, setSelectionSource] = useState("list");
  const editorPanelRef = useRef(null);
  const [editorFocus, setEditorFocus] = useState(false);
  const editorFocusRef = useRef(false);
  const [editing, setEditing] = useState({
    type: null,
    id: null,
    value: "",
  });
  const [mobileTab, setMobileTab] = useState("list");
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 900px)").matches;
  });
  const [viewMode, setViewMode] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("grid");
  const [exportOpen, setExportOpen] = useState(false);
  const [gridInput, setGridInput] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const clipboardRef = useRef({ type: null, data: null });
  const selectedRoomId =
    state.activeRoomId ??
    (selectedFurniture ? (selectedFurniture.roomId ?? "unassigned") : null);

  const showRoomEditor = Boolean(state.activeRoomId);
  const showFurnitureEditor = Boolean(state.selectedId);
  const showFixtureEditor = Boolean(state.selectedFixtureId);
  const viewRoomId =
    viewMode === "room"
      ? (state.activeRoomId ?? selectedFurniture?.roomId ?? null)
      : null;
  const canToggleViewMode = Boolean(
    state.activeRoomId || selectedFurniture?.roomId,
  );
  const latestStateRef = useRef(state);
  const latestRoomRef = useRef(activeRoom);
  const latestFurnitureRef = useRef(selectedFurniture);
  const latestFixtureRef = useRef(selectedFixture);
  const latestFixtureRoomRef = useRef(selectedFixtureRoom);

  const startEditing = (type, id, value) => {
    setEditing({ type, id, value });
  };

  const commitEditing = () => {
    if (!editing.id) return;
    const value = editing.value.trim();
    if (editing.type === "room") {
      dispatch({
        type: "UPDATE_ROOM",
        payload: { id: editing.id, updates: { name: value || "部屋" } },
      });
    }
    if (editing.type === "furniture") {
      dispatch({
        type: "UPDATE_FURNITURE",
        payload: { id: editing.id, updates: { name: value || "家具" } },
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
    latestFixtureRef.current = selectedFixture;
    latestFixtureRoomRef.current = selectedFixtureRoom;
  }, [state, activeRoom, selectedFurniture, selectedFixture, selectedFixtureRoom]);

  useEffect(() => {
    setGridInput(Number((state.gridMM / 1000).toFixed(5)).toString());
  }, [state.gridMM]);

  useEffect(() => {
    if (!selectedRoomId) return;
    if (selectionSource === "canvas") {
      setOpenRooms({ [selectedRoomId]: true });
    } else {
      setOpenRooms((prev) => ({ ...prev, [selectedRoomId]: true }));
    }
  }, [selectedRoomId, selectionSource]);

  useEffect(() => {
    if (!isMobile) {
      setMobileTab("editor");
    }
  }, [isMobile]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
    } else {
      media.addListener(update);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", update);
      } else {
        media.removeListener(update);
      }
    };
  }, []);

  useKeyboardShortcuts({
    stateRef: latestStateRef,
    roomRef: latestRoomRef,
    furnitureRef: latestFurnitureRef,
    fixtureRef: latestFixtureRef,
    fixtureRoomRef: latestFixtureRoomRef,
    clipboardRef,
    onDispatch: dispatch,
    onSetSelectionSource: setSelectionSource,
    isBlocked: editorFocus,
  });

  useEffect(() => {
    if (!editorFocusRef.current) return;
    const active = document.activeElement;
    if (editorPanelRef.current && active && editorPanelRef.current.contains(active)) {
      active.blur();
    }
    editorFocusRef.current = false;
    setEditorFocus(false);
  }, [state.activeRoomId, state.selectedId, state.selectedFixtureId]);

  const dispatchFromCanvas = (action) => {
    if (
      action.type === "SET_ACTIVE_ROOM" ||
      action.type === "SELECT_FURNITURE"
    ) {
      setSelectionSource("canvas");
    }
    dispatch(action);
  };

  const listContent = (
    <ObjectListPanel
      state={state}
      selectedFixtureId={state.selectedFixtureId}
      openRooms={openRooms}
      setOpenRooms={setOpenRooms}
      selectedRoomId={selectedRoomId}
      selectedFurniture={selectedFurniture}
      templates={state.templates}
      selectedTemplateId={selectedTemplateId}
      setSelectedTemplateId={setSelectedTemplateId}
      selectionSource={selectionSource}
      setSelectionSource={setSelectionSource}
      editing={editing}
      startEditing={startEditing}
      commitEditing={commitEditing}
      cancelEditing={cancelEditing}
      setEditing={setEditing}
      setViewMode={setViewMode}
      setMobileTab={setMobileTab}
      isMobile={isMobile}
      dispatch={dispatch}
    />
  );

  const editorContentDesktop = (
    <EditorPanel
      activeRoom={activeRoom}
      roomsCount={state.rooms.length}
      selectedFurniture={selectedFurniture}
      selectedFixture={selectedFixture}
      selectedFixtureRoom={selectedFixtureRoom}
      showRoomEditor={showRoomEditor}
      showFurnitureEditor={showFurnitureEditor}
      showFixtureEditor={showFixtureEditor}
      dispatch={dispatch}
      isMobile={false}
    />
  );
  const editorContentMobile = (
    <EditorPanel
      activeRoom={activeRoom}
      roomsCount={state.rooms.length}
      selectedFurniture={selectedFurniture}
      selectedFixture={selectedFixture}
      selectedFixtureRoom={selectedFixtureRoom}
      showRoomEditor={showRoomEditor}
      showFurnitureEditor={showFurnitureEditor}
      showFixtureEditor={showFixtureEditor}
      dispatch={dispatch}
      isMobile
    />
  );
  return (
    <div className="app">
      <AppHeader
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="app__columns">
        <section className="panel panel--list">{listContent}</section>

        <section className="panel panel--canvas">
          <RoomCanvas
            rooms={state.rooms}
            furnitures={state.furnitures}
            selectedId={state.selectedId}
            selectedFixtureId={state.selectedFixtureId}
            activeRoomId={state.activeRoomId}
            viewMode={viewMode}
            viewRoomId={viewRoomId}
            canToggleViewMode={canToggleViewMode}
            onToggleViewMode={() =>
              setViewMode((prev) => (prev === "all" ? "room" : "all"))
            }
            gridMM={state.gridMM}
            isMobile={isMobile}
            dispatch={dispatchFromCanvas}
          />
        </section>

        <section
          className="panel panel--editor"
          ref={editorPanelRef}
          onFocusCapture={() => {
            editorFocusRef.current = true;
            setEditorFocus(true);
          }}
          onBlurCapture={(event) => {
            const next = event.relatedTarget;
            if (editorPanelRef.current && next && editorPanelRef.current.contains(next)) {
              return;
            }
            editorFocusRef.current = false;
            setEditorFocus(false);
          }}
        >
          {editorContentDesktop}
        </section>
      </div>

      <MobileDrawer
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
        listContent={listContent}
        editorContent={editorContentMobile}
      />

      {settingsOpen && (
        <SettingsModal
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          gridInput={gridInput}
          setGridInput={setGridInput}
          gridMM={state.gridMM}
          templates={state.templates}
          rooms={state.rooms}
          furnitures={state.furnitures}
          dispatch={dispatch}
          onOpenExportPreview={() => {
            setSettingsOpen(false);
            setExportOpen(true);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {exportOpen && (
        <ExportPreviewModal
          rooms={state.rooms}
          furnitures={state.furnitures}
          gridMM={state.gridMM}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
