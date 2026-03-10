import React from "react";
import {
  deleteUserLayout,
  logOut,
  refreshAuthUser,
  resetPassword,
  saveUserLayout,
  sendVerificationEmail,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  subscribeToUserLayouts,
} from "../firebase.js";

const defaultTemplateForm = {
  id: "",
  name: "",
  width: "1200",
  height: "600",
  color: "#8ecae6",
  rotation: "0",
  radius: { tl: "0", tr: "0", br: "0", bl: "0" },
};

const usesPasswordAuth = (user) =>
  user?.providerData?.some((provider) => provider.providerId === "password");

const formatTimestamp = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString();
};

const toSerializableLayout = (layout) =>
  JSON.parse(JSON.stringify(layout));

export default function SettingsModal({
  settingsTab,
  setSettingsTab,
  currentUser,
  authLoading,
  gridInput,
  setGridInput,
  gridMM,
  templates,
  rooms,
  furnitures,
  dispatch,
  currentLayoutId,
  currentLayoutName,
  onCurrentLayoutChange,
  onOpenExportPreview,
  onClose,
}) {
  const [templateForm, setTemplateForm] = React.useState(defaultTemplateForm);
  const [authMode, setAuthMode] = React.useState("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authError, setAuthError] = React.useState("");
  const [authMessage, setAuthMessage] = React.useState("");
  const [authPending, setAuthPending] = React.useState(false);
  const [savedLayouts, setSavedLayouts] = React.useState([]);
  const [selectedSavedLayoutId, setSelectedSavedLayoutId] = React.useState(
    currentLayoutId ?? "",
  );
  const [saveName, setSaveName] = React.useState(currentLayoutName ?? "");
  const [cloudLoading, setCloudLoading] = React.useState(false);
  const [cloudPending, setCloudPending] = React.useState(false);
  const [cloudError, setCloudError] = React.useState("");
  const [cloudMessage, setCloudMessage] = React.useState("");

  const isPasswordUser = usesPasswordAuth(currentUser);
  const canUseCloud =
    Boolean(currentUser) && (!isPasswordUser || currentUser.emailVerified);
  const selectedSavedLayout = savedLayouts.find(
    (entry) => entry.id === selectedSavedLayoutId,
  );

  React.useEffect(() => {
    setCloudError("");
    setCloudMessage("");

    if (!canUseCloud || !currentUser?.uid) {
      setSavedLayouts([]);
      setSelectedSavedLayoutId("");
      onCurrentLayoutChange?.({ id: "", name: "", snapshot: null });
      return undefined;
    }

    setCloudLoading(true);
    return subscribeToUserLayouts(
      currentUser.uid,
      (layouts) => {
        setSavedLayouts(layouts);
        setCloudLoading(false);
      },
      (error) => {
        setCloudError(error?.message ?? "Failed to load saved layouts.");
        setCloudLoading(false);
      },
    );
  }, [canUseCloud, currentUser?.uid, onCurrentLayoutChange]);

  React.useEffect(() => {
    setSelectedSavedLayoutId(currentLayoutId ?? "");
  }, [currentLayoutId]);

  React.useEffect(() => {
    setSaveName(currentLayoutName ?? "");
  }, [currentLayoutName]);

  const handleExport = () => {
    const payload = {
      rooms,
      furnitures,
      gridMM,
      templates,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "room-layout.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        dispatch({ type: "IMPORT_LAYOUT", payload: data });
      } catch (error) {
        console.error("Invalid JSON", error);
      }
    };
    reader.readAsText(file);
  };

  const handleGridChange = (event) => {
    const next = event.target.value;
    setGridInput(next);
    if (next === "") return;
    const parsed = Number(next);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    dispatch({
      type: "SET_GRID_MM",
      payload: Math.max(1, Math.round(parsed * 1000)),
    });
  };

  const handleGridBlur = (event) => {
    if (event.target.value !== "") return;
    dispatch({ type: "SET_GRID_MM", payload: 1 });
    setGridInput("0.001");
  };

  const resetTemplateForm = () => {
    setTemplateForm(defaultTemplateForm);
  };

  const handleTemplateEdit = (template) => {
    if (!template) return;
    setTemplateForm({
      id: template.id,
      name: template.name ?? "",
      width: String(template.width ?? 0),
      height: String(template.height ?? 0),
      color: template.color ?? "#8ecae6",
      rotation: String(template.rotation ?? 0),
      radius: {
        tl: String(template.radius?.tl ?? 0),
        tr: String(template.radius?.tr ?? 0),
        br: String(template.radius?.br ?? 0),
        bl: String(template.radius?.bl ?? 0),
      },
    });
  };

  const handleTemplateSelect = (event) => {
    const nextId = event.target.value;
    if (!nextId) {
      resetTemplateForm();
      return;
    }
    const selected = templates.find((template) => template.id === nextId);
    handleTemplateEdit(selected);
  };

  const handleTemplateSave = () => {
    const payload = {
      name: templateForm.name.trim() || "Template",
      width: Number(templateForm.width) || 0,
      height: Number(templateForm.height) || 0,
      color: templateForm.color,
      rotation: Number(templateForm.rotation) || 0,
      radius: {
        tl: Number(templateForm.radius.tl) || 0,
        tr: Number(templateForm.radius.tr) || 0,
        br: Number(templateForm.radius.br) || 0,
        bl: Number(templateForm.radius.bl) || 0,
      },
    };

    if (templateForm.id) {
      dispatch({
        type: "UPDATE_TEMPLATE",
        payload: { id: templateForm.id, updates: payload },
      });
    } else {
      dispatch({ type: "ADD_TEMPLATE", payload });
    }

    resetTemplateForm();
  };

  const handleTemplateDelete = (id) => {
    dispatch({ type: "DELETE_TEMPLATE", payload: id });
    if (templateForm.id === id) {
      resetTemplateForm();
    }
  };

  const handleAuthAction = async (action) => {
    setAuthPending(true);
    setAuthError("");
    setAuthMessage("");

    try {
      await action();
      setPassword("");
    } catch (error) {
      setAuthError(error?.message ?? "Authentication failed.");
    } finally {
      setAuthPending(false);
    }
  };

  const handleEmailSubmit = (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setAuthError("Email and password are required.");
      setAuthMessage("");
      return;
    }

    if (authMode === "signup") {
      handleAuthAction(async () => {
        await signUpWithEmail(email.trim(), password);
        setAuthMessage(
          "Verification email sent. Open the link in the email, then refresh status.",
        );
      });
      return;
    }

    handleAuthAction(() => signInWithEmail(email.trim(), password));
  };

  const handlePasswordReset = () => {
    if (!email.trim()) {
      setAuthError("Enter your email address first.");
      setAuthMessage("");
      return;
    }

    handleAuthAction(async () => {
      await resetPassword(email.trim());
      setAuthMessage("Password reset email sent.");
    });
  };

  const handleCloudAction = async (action) => {
    setCloudPending(true);
    setCloudError("");
    setCloudMessage("");

    try {
      await action();
    } catch (error) {
      setCloudError(error?.message ?? "Cloud save failed.");
    } finally {
      setCloudPending(false);
    }
  };

  const buildCurrentLayout = () => ({
    rooms,
    furnitures,
    gridMM,
    templates,
  });

  const buildCloudLayout = () => ({
    rooms,
    furnitures,
    gridMM,
  });

  const buildSerializableCurrentLayout = () =>
    toSerializableLayout(buildCurrentLayout());

  const buildSerializableCloudLayout = () =>
    toSerializableLayout(buildCloudLayout());

  const handleSaveAsNew = () => {
    if (!canUseCloud || !currentUser?.uid) {
      setCloudError("Login is required to use cloud save.");
      return;
    }
    if (!saveName.trim()) {
      setCloudError("Enter a layout name.");
      return;
    }

    handleCloudAction(async () => {
      const layoutId = await saveUserLayout(currentUser.uid, {
        name: saveName.trim(),
        layout: buildSerializableCloudLayout(),
      });
      setSelectedSavedLayoutId(layoutId ?? "");
      onCurrentLayoutChange?.({
        id: layoutId ?? "",
        name: saveName.trim(),
        snapshot: buildSerializableCloudLayout(),
      });
      setCloudMessage("Saved as a new layout.");
    });
  };

  const handleUpdateSelected = () => {
    if (!canUseCloud || !currentUser?.uid) {
      setCloudError("Login is required to use cloud save.");
      return;
    }
    if (!selectedSavedLayout) {
      setCloudError("Select a saved layout to overwrite.");
      return;
    }
    if (!saveName.trim()) {
      setCloudError("Enter a layout name.");
      return;
    }

    handleCloudAction(async () => {
      await saveUserLayout(currentUser.uid, {
        layoutId: selectedSavedLayout.id,
        name: saveName.trim(),
        layout: buildSerializableCloudLayout(),
        createdAt: selectedSavedLayout.createdAt,
      });
      onCurrentLayoutChange?.({
        id: selectedSavedLayout.id,
        name: saveName.trim(),
        snapshot: buildSerializableCloudLayout(),
      });
      setCloudMessage("Saved over the selected layout.");
    });
  };

  const handleLoadLayout = (entry) => {
    if (!entry?.layout) return;
    dispatch({ type: "IMPORT_LAYOUT", payload: entry.layout });
    setSelectedSavedLayoutId(entry.id);
    setSaveName(entry.name);
    onCurrentLayoutChange?.({
      id: entry.id,
      name: entry.name,
      snapshot: entry.layout,
    });
    setCloudMessage(`Loaded "${entry.name}".`);
    setCloudError("");
  };

  const handleSelectSavedLayout = (entry) => {
    setSelectedSavedLayoutId(entry.id);
    setSaveName(entry.name);
    onCurrentLayoutChange?.({
      id: entry.id,
      name: entry.name,
      snapshot: entry.layout,
    });
    setCloudMessage("");
    setCloudError("");
  };

  const handleDeleteSavedLayout = (entry) => {
    if (!currentUser?.uid) return;

    handleCloudAction(async () => {
      await deleteUserLayout(currentUser.uid, entry.id);
      if (selectedSavedLayoutId === entry.id) {
        setSelectedSavedLayoutId("");
        setSaveName("");
        onCurrentLayoutChange?.({ id: "", name: "", snapshot: null });
      }
      setCloudMessage(`Deleted "${entry.name}".`);
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2>Settings</h2>
          <button
            className="btn btn--ghost btn--small"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="modal__tabs">
          <button
            type="button"
            className={`modal__tab${settingsTab === "grid" ? " is-active" : ""}`}
            onClick={() => setSettingsTab("grid")}
          >
            Grid
          </button>
          <button
            type="button"
            className={`modal__tab${
              settingsTab === "templates" ? " is-active" : ""
            }`}
            onClick={() => setSettingsTab("templates")}
          >
            Templates
          </button>
          <button
            type="button"
            className={`modal__tab${settingsTab === "cloud" ? " is-active" : ""}`}
            onClick={() => setSettingsTab("cloud")}
          >
            Cloud
          </button>
          <button
            type="button"
            className={`modal__tab${settingsTab === "json" ? " is-active" : ""}`}
            onClick={() => setSettingsTab("json")}
          >
            JSON
          </button>
          <button
            type="button"
            className={`modal__tab${settingsTab === "login" ? " is-active" : ""}`}
            onClick={() => setSettingsTab("login")}
          >
            Login
          </button>
        </div>
        <div className="modal__body">
          {settingsTab === "grid" && (
            <div className="panel__section">
              <h3>Grid</h3>
              <div className="form-grid">
                <label>
                  Grid (m)
                  <input
                    type="number"
                    step="0.01"
                    value={gridInput}
                    onChange={handleGridChange}
                    onBlur={handleGridBlur}
                  />
                </label>
                <p className="muted">You can also double-click the grid label.</p>
              </div>
            </div>
          )}

          {settingsTab === "templates" && (
            <div className="panel__section">
              <h3>Templates</h3>
              <div className="form-grid">
                <label className="template-select template-select--modal">
                  Template
                  <select value={templateForm.id} onChange={handleTemplateSelect}>
                    <option value="">None</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Name
                  <input
                    value={templateForm.name}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Width (mm)
                  <input
                    type="number"
                    value={templateForm.width}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        width: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Height (mm)
                  <input
                    type="number"
                    value={templateForm.height}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        height: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Color
                  <input
                    type="color"
                    value={templateForm.color}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        color: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Rotation
                  <select
                    value={templateForm.rotation}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        rotation: event.target.value,
                      }))
                    }
                  >
                    <option value="0">0°</option>
                    <option value="90">90°</option>
                    <option value="180">180°</option>
                    <option value="270">270°</option>
                  </select>
                </label>
                <label>
                  Radius TL
                  <input
                    type="number"
                    value={templateForm.radius.tl}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        radius: { ...prev.radius, tl: event.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  Radius TR
                  <input
                    type="number"
                    value={templateForm.radius.tr}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        radius: { ...prev.radius, tr: event.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  Radius BR
                  <input
                    type="number"
                    value={templateForm.radius.br}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        radius: { ...prev.radius, br: event.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  Radius BL
                  <input
                    type="number"
                    value={templateForm.radius.bl}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        radius: { ...prev.radius, bl: event.target.value },
                      }))
                    }
                  />
                </label>
              </div>
              <div className="actions">
                <button className="btn" type="button" onClick={handleTemplateSave}>
                  {templateForm.id ? "Save" : "Add"}
                </button>
                {templateForm.id && (
                  <button
                    className="btn btn--ghost"
                    type="button"
                    onClick={() => handleTemplateDelete(templateForm.id)}
                  >
                    Delete
                  </button>
                )}
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={resetTemplateForm}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {settingsTab === "json" && (
            <div className="panel__section">
              <h3>JSON</h3>
              <div className="actions">
                <button className="btn" type="button" onClick={handleExport}>
                  Export JSON
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={onOpenExportPreview}
                >
                  A4 Preview
                </button>
                <input type="file" accept=".json" onChange={handleImport} />
              </div>
            </div>
          )}

          {(settingsTab === "cloud" || settingsTab === "data") && (
            <div className="panel__section">
              <h3>Cloud</h3>
              <div className="cloud-save">
                <div className="cloud-save__header">
                  <h4>Cloud Save</h4>
                  <p className="muted">
                    Save multiple layouts under your account and load them later.
                  </p>
                </div>

                {!currentUser && (
                  <p className="muted">Login from the Login tab to use cloud save.</p>
                )}

                {currentUser && isPasswordUser && !currentUser.emailVerified && (
                  <p className="muted">
                    Verify your email address before using cloud save.
                  </p>
                )}

                {canUseCloud && (
                  <>
                    <div className="form-grid">
                      <label>
                        Layout name
                        <input
                          type="text"
                          value={saveName}
                          onChange={(event) => setSaveName(event.target.value)}
                          placeholder="Example: Living room plan"
                        />
                      </label>
                    </div>

                    <div className="actions">
                      <button
                        className="btn"
                        type="button"
                        onClick={handleSaveAsNew}
                        disabled={cloudPending}
                      >
                        Save as new
                      </button>
                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={handleUpdateSelected}
                        disabled={cloudPending || !selectedSavedLayout}
                      >
                        Overwrite selected
                      </button>
                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => {
                          setSelectedSavedLayoutId("");
                          setSaveName("");
                          setCloudError("");
                          setCloudMessage("");
                          onCurrentLayoutChange?.({
                            id: "",
                            name: "",
                            snapshot: null,
                          });
                        }}
                        disabled={cloudPending}
                      >
                        Clear selection
                      </button>
                    </div>

                    {cloudMessage && <p className="muted">{cloudMessage}</p>}
                    {cloudError && <p className="auth-error">{cloudError}</p>}

                    <div className="saved-layouts">
                      <div className="saved-layouts__header">
                        <h4>Saved layouts</h4>
                        {cloudLoading && <span className="muted">Loading...</span>}
                      </div>

                      {!cloudLoading && savedLayouts.length === 0 && (
                        <p className="muted">No saved layouts yet.</p>
                      )}

                      {savedLayouts.length > 0 && (
                        <ul className="saved-layouts__list">
                          {savedLayouts.map((entry) => (
                            <li
                              key={entry.id}
                              className={`saved-layouts__item${
                                selectedSavedLayoutId === entry.id ? " is-selected" : ""
                              }`}
                              onClick={() => handleSelectSavedLayout(entry)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  handleSelectSavedLayout(entry);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="saved-layouts__meta">
                                <strong>{entry.name}</strong>
                                <span className="muted">
                                  Updated: {formatTimestamp(entry.updatedAt)}
                                </span>
                              </div>
                              <div className="saved-layouts__actions">
                                <button
                                  className="btn btn--ghost btn--small"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleLoadLayout(entry);
                                  }}
                                  disabled={cloudPending}
                                >
                                  Load
                                </button>
                                <button
                                  className="btn btn--ghost btn--small"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteSavedLayout(entry);
                                  }}
                                  disabled={cloudPending}
                                >
                                  Delete
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {settingsTab === "login" && (
            <div className="panel__section">
              <h3>Login</h3>
              <div className="auth-card">
                <p className="muted">
                  {authLoading
                    ? "Checking authentication state."
                    : currentUser
                      ? `Logged in: ${currentUser.email ?? currentUser.uid}`
                      : "Not logged in."}
                </p>

                {currentUser && isPasswordUser && (
                  <p className="muted">
                    {currentUser.emailVerified
                      ? "Email verified."
                      : "Email verification is still pending."}
                  </p>
                )}

                {!currentUser && (
                  <>
                    <div className="auth-mode-toggle">
                      <button
                        type="button"
                        className={`modal__tab${authMode === "login" ? " is-active" : ""}`}
                        onClick={() => setAuthMode("login")}
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        className={`modal__tab${authMode === "signup" ? " is-active" : ""}`}
                        onClick={() => setAuthMode("signup")}
                      >
                        Sign up
                      </button>
                    </div>

                    <form className="form-grid" onSubmit={handleEmailSubmit}>
                      <label>
                        Email
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          autoComplete="email"
                        />
                      </label>
                      <label>
                        Password
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          autoComplete={
                            authMode === "signup"
                              ? "new-password"
                              : "current-password"
                          }
                        />
                      </label>
                      <button className="btn" type="submit" disabled={authPending}>
                        {authMode === "signup" ? "Create account" : "Sign in"}
                      </button>
                    </form>

                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={authPending}
                    >
                      Reset password
                    </button>

                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={() => handleAuthAction(() => signInWithGoogle())}
                      disabled={authPending}
                    >
                      Sign in with Google
                    </button>
                  </>
                )}

                {currentUser && (
                  <div className="actions">
                    {isPasswordUser && !currentUser.emailVerified && (
                      <>
                        <button
                          className="btn"
                          type="button"
                          onClick={() =>
                            handleAuthAction(async () => {
                              await sendVerificationEmail();
                              setAuthMessage("Verification email sent again.");
                            })
                          }
                          disabled={authPending}
                        >
                          Send verification email
                        </button>
                        <button
                          className="btn btn--ghost"
                          type="button"
                          onClick={() =>
                            handleAuthAction(async () => {
                              await refreshAuthUser();
                              setAuthMessage("Authentication status refreshed.");
                            })
                          }
                          disabled={authPending}
                        >
                          Refresh status
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={() => handleAuthAction(() => logOut())}
                      disabled={authPending}
                    >
                      Log out
                    </button>
                  </div>
                )}

                {authMessage && <p className="muted">{authMessage}</p>}
                {authError && <p className="auth-error">{authError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
