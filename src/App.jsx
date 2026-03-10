import React, { useEffect, useReducer, useRef, useState } from "react";
import { initHistory, historyReducer } from "./state/history.js";
import AppHeader from "./components/AppHeader.jsx";
import { onAuthStateChanged } from "firebase/auth";
import RoomCanvas from "./components/RoomCanvas.jsx";
import ObjectListPanel from "./components/ObjectListPanel.jsx";
import EditorPanel from "./components/EditorPanel.jsx";
import MobileDrawer from "./components/MobileDrawer.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import ExportPreviewModal from "./components/ExportPreviewModal.jsx";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts.js";
import {
  auth,
  saveLastOpenedLayoutId,
  saveUserLayout,
  saveUserTemplates,
  subscribeToLastOpenedLayoutId,
  subscribeToUserLayouts,
  subscribeToUserTemplates,
} from "./firebase.js";

const toSerializableLayout = (layout) =>
  JSON.parse(JSON.stringify(layout));

const serializeLayout = (layout) =>
  JSON.stringify(toSerializableLayout(layout));

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
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [saveAsPending, setSaveAsPending] = useState(false);
  const [saveAsError, setSaveAsError] = useState("");
  const [savePromptAfterLogin, setSavePromptAfterLogin] = useState(false);
  const [suppressAutoRestore, setSuppressAutoRestore] = useState(false);
  const [gridInput, setGridInput] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentLayoutId, setCurrentLayoutId] = useState("");
  const [currentLayoutName, setCurrentLayoutName] = useState("");
  const [currentLayoutSnapshot, setCurrentLayoutSnapshot] = useState("");
  const [cloudLayouts, setCloudLayouts] = useState([]);
  const [lastOpenedLayoutId, setLastOpenedLayoutId] = useState("");
  const [cloudLayoutsReady, setCloudLayoutsReady] = useState(false);
  const [lastOpenedReady, setLastOpenedReady] = useState(false);
  const [lastOpenedHydrated, setLastOpenedHydrated] = useState(false);
  const [templatesReady, setTemplatesReady] = useState(false);
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
  const latestLayoutIdRef = useRef(currentLayoutId);
  const latestLayoutNameRef = useRef(currentLayoutName);
  const latestUserRef = useRef(currentUser);
  const latestTemplatesRef = useRef(state.templates);
  const restoredUserIdRef = useRef("");
  const currentLayoutPayload = toSerializableLayout({
    rooms: state.rooms,
    furnitures: state.furnitures,
    gridMM: state.gridMM,
  });
  const currentLayoutSerialized = serializeLayout(currentLayoutPayload);
  const isCurrentLayoutSaved =
    Boolean(currentLayoutSnapshot) &&
    currentLayoutSerialized === currentLayoutSnapshot;
  const isPasswordUser = currentUser?.providerData?.some(
    (provider) => provider.providerId === "password",
  );
  const canSaveCurrentLayout =
    Boolean(currentUser?.uid) &&
    (!isPasswordUser || currentUser?.emailVerified) &&
    Boolean(currentLayoutId) &&
    Boolean(currentLayoutName.trim()) &&
    !isCurrentLayoutSaved;
  const canStartSaveFlow =
    Boolean(currentUser?.uid) &&
    (!isPasswordUser || currentUser?.emailVerified);

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
    latestTemplatesRef.current = state.templates;
  }, [state, activeRoom, selectedFurniture, selectedFixture, selectedFixtureRoom]);

  useEffect(() => {
    latestLayoutIdRef.current = currentLayoutId;
    latestLayoutNameRef.current = currentLayoutName;
    latestUserRef.current = currentUser;
  }, [currentLayoutId, currentLayoutName, currentLayoutSnapshot, currentUser]);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const passwordUser = currentUser?.providerData?.some(
      (provider) => provider.providerId === "password",
    );
    const canUseCloud =
      Boolean(currentUser?.uid) && (!passwordUser || currentUser.emailVerified);

    if (!canUseCloud || !currentUser?.uid) {
      setCloudLayouts([]);
      setLastOpenedLayoutId("");
      setCloudLayoutsReady(false);
      setLastOpenedReady(false);
      setLastOpenedHydrated(false);
      restoredUserIdRef.current = "";
      return undefined;
    }

    const unsubscribeLayouts = subscribeToUserLayouts(
      currentUser.uid,
      (layouts) => {
        setCloudLayouts(layouts);
        setCloudLayoutsReady(true);
      },
      () => {
        setCloudLayouts([]);
        setCloudLayoutsReady(true);
      },
    );
    const unsubscribeLastOpened = subscribeToLastOpenedLayoutId(
      currentUser.uid,
      (layoutId) => {
        setLastOpenedLayoutId(layoutId);
        setLastOpenedReady(true);
      },
      () => {
        setLastOpenedLayoutId("");
        setLastOpenedReady(true);
      },
    );

    return () => {
      unsubscribeLayouts();
      unsubscribeLastOpened();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid || !cloudLayoutsReady || !lastOpenedReady) {
      return;
    }

    if (suppressAutoRestore || restoredUserIdRef.current === currentUser.uid) {
      return;
    }

    if (!lastOpenedLayoutId) {
      restoredUserIdRef.current = currentUser.uid;
      setLastOpenedHydrated(true);
      return;
    }

    const entry = cloudLayouts.find((layout) => layout.id === lastOpenedLayoutId);
    if (!entry?.layout) {
      restoredUserIdRef.current = currentUser.uid;
      setLastOpenedHydrated(true);
      return;
    }

    dispatch({ type: "IMPORT_LAYOUT", payload: entry.layout });
    setCurrentLayoutId(entry.id);
    setCurrentLayoutName(entry.name);
    setCurrentLayoutSnapshot(serializeLayout(entry.layout));
    restoredUserIdRef.current = currentUser.uid;
    setLastOpenedHydrated(true);
  }, [
    cloudLayouts,
    cloudLayoutsReady,
    currentUser,
    lastOpenedLayoutId,
    lastOpenedReady,
    suppressAutoRestore,
  ]);

  useEffect(() => {
    const passwordUser = currentUser?.providerData?.some(
      (provider) => provider.providerId === "password",
    );
    const canSyncTemplates =
      Boolean(currentUser?.uid) && (!passwordUser || currentUser.emailVerified);

    if (!canSyncTemplates || !currentUser?.uid) {
      setTemplatesReady(false);
      return undefined;
    }

    return subscribeToUserTemplates(
      currentUser.uid,
      async (templates) => {
        if (templates.length > 0) {
          dispatch({ type: "SET_TEMPLATES", payload: templates });
        } else {
          await saveUserTemplates(currentUser.uid, latestTemplatesRef.current);
        }
        setTemplatesReady(true);
      },
      () => {
        setTemplatesReady(true);
      },
    );
  }, [currentUser]);

  useEffect(() => {
    const passwordUser = currentUser?.providerData?.some(
      (provider) => provider.providerId === "password",
    );
    const canSyncTemplates =
      Boolean(currentUser?.uid) && (!passwordUser || currentUser.emailVerified);

    if (!canSyncTemplates || !currentUser?.uid || !templatesReady) {
      return;
    }

    saveUserTemplates(currentUser.uid, state.templates);
  }, [currentUser, state.templates, templatesReady]);

  useEffect(() => {
    const passwordUser = currentUser?.providerData?.some(
      (provider) => provider.providerId === "password",
    );
    const canUseCloud =
      Boolean(currentUser?.uid) && (!passwordUser || currentUser.emailVerified);

    if (!canUseCloud || !currentUser?.uid || !lastOpenedHydrated) {
      return;
    }

    saveLastOpenedLayoutId(currentUser.uid, currentLayoutId);
  }, [currentLayoutId, currentUser, lastOpenedHydrated]);

  useEffect(() => {
    if (!savePromptAfterLogin || !currentUser) {
      return;
    }

    if (!canStartSaveFlow) {
      setSettingsTab("login");
      setSettingsOpen(true);
      return;
    }

    openSaveAsModal();
    setSettingsOpen(false);
    setSavePromptAfterLogin(false);
  }, [canStartSaveFlow, currentUser, savePromptAfterLogin]);

  const saveCurrentLayout = async () => {
    const user = latestUserRef.current;
    const layoutId = latestLayoutIdRef.current;
    const layoutName = latestLayoutNameRef.current.trim();
    const passwordUser = user?.providerData?.some(
      (provider) => provider.providerId === "password",
    );

    if (!user?.uid || !layoutId || !layoutName) {
      return;
    }

    if (passwordUser && !user.emailVerified) {
      return;
    }

    await saveUserLayout(user.uid, {
      layoutId,
      name: layoutName,
      layout: currentLayoutPayload,
    });
    restoredUserIdRef.current = user.uid;
    setLastOpenedLayoutId(layoutId);
    setCurrentLayoutSnapshot(currentLayoutSerialized);
  };

  const openSaveAsModal = () => {
    setSaveAsName(currentLayoutName || "");
    setSaveAsError("");
    setSaveAsOpen(true);
  };

  const handleSaveAsNew = async () => {
    const user = latestUserRef.current;
    const layoutName = saveAsName.trim();

    if (!user?.uid) {
      setSaveAsError("Login is required to save.");
      return;
    }

    if (!layoutName) {
      setSaveAsError("Enter a set name.");
      return;
    }

    setSaveAsPending(true);
    setSaveAsError("");

    try {
      const layoutId = await saveUserLayout(user.uid, {
        name: layoutName,
        layout: currentLayoutPayload,
      });
      restoredUserIdRef.current = user.uid;
      setLastOpenedLayoutId(layoutId ?? "");
      setCurrentLayoutId(layoutId ?? "");
      setCurrentLayoutName(layoutName);
      setCurrentLayoutSnapshot(currentLayoutSerialized);
      setLastOpenedHydrated(true);
      setSuppressAutoRestore(false);
      setSavePromptAfterLogin(false);
      setSaveAsOpen(false);
    } catch (error) {
      setSaveAsError(error?.message ?? "Failed to save.");
    } finally {
      setSaveAsPending(false);
    }
  };

  const handleRequestSave = async () => {
    if (!canStartSaveFlow) {
      setSavePromptAfterLogin(true);
      setSuppressAutoRestore(true);
      setSettingsTab("login");
      setSettingsOpen(true);
      return;
    }

    if (!latestLayoutIdRef.current) {
      openSaveAsModal();
      return;
    }

    await saveCurrentLayout();
  };

  const handleCreateNewSet = () => {
    dispatch({ type: "RESET_LAYOUT" });
    setCurrentLayoutId("");
    setCurrentLayoutName("");
    setCurrentLayoutSnapshot("");
    setSuppressAutoRestore(false);
    setSavePromptAfterLogin(false);
    setSaveAsName("");
    setSaveAsError("");
    setSaveAsOpen(false);
  };

  useKeyboardShortcuts({
    stateRef: latestStateRef,
    roomRef: latestRoomRef,
    furnitureRef: latestFurnitureRef,
    fixtureRef: latestFixtureRef,
    fixtureRoomRef: latestFixtureRoomRef,
    clipboardRef,
    onDispatch: dispatch,
    onSave: handleRequestSave,
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
        canSave={canStartSaveFlow && (!currentLayoutId || !isCurrentLayoutSaved)}
        currentLayoutName={currentLayoutName}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        onSave={handleRequestSave}
        onNewSet={handleCreateNewSet}
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
          currentUser={currentUser}
          authLoading={authLoading}
          gridInput={gridInput}
          setGridInput={setGridInput}
          gridMM={state.gridMM}
          templates={state.templates}
          rooms={state.rooms}
          furnitures={state.furnitures}
          dispatch={dispatch}
          currentLayoutId={currentLayoutId}
          currentLayoutName={currentLayoutName}
          onCurrentLayoutChange={(layout) => {
            setCurrentLayoutId(layout?.id ?? "");
            setCurrentLayoutName(layout?.name ?? "");
            setCurrentLayoutSnapshot(
              layout?.snapshot ? serializeLayout(layout.snapshot) : "",
            );
            if (layout?.id) {
              setLastOpenedHydrated(true);
            }
          }}
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
      {saveAsOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSaveAsOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Save as new set"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header">
              <h2>Save As New Set</h2>
              <button
                className="btn btn--ghost btn--small"
                type="button"
                onClick={() => setSaveAsOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="modal__body">
              <div className="panel__section">
                <div className="form-grid">
                  <label>
                    Set name
                    <input
                      type="text"
                      value={saveAsName}
                      autoFocus
                      onChange={(event) => setSaveAsName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          handleSaveAsNew();
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={handleSaveAsNew}
                    disabled={saveAsPending}
                  >
                    Create set
                  </button>
                </div>
                {saveAsError && <p className="auth-error">{saveAsError}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
