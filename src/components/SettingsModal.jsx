import React from "react";

const defaultTemplateForm = {
  id: "",
  name: "",
  width: "1200",
  height: "600",
  color: "#8ecae6",
  rotation: "0",
  radius: { tl: "0", tr: "0", br: "0", bl: "0" },
};

export default function SettingsModal({
  settingsTab,
  setSettingsTab,
  gridInput,
  setGridInput,
  gridMM,
  templates,
  rooms,
  furnitures,
  dispatch,
  onOpenExportPreview,
  onClose,
}) {
  const [templateForm, setTemplateForm] = React.useState(defaultTemplateForm);

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
      name: templateForm.name.trim() || "テンプレ",
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
            className={`modal__tab${settingsTab === "data" ? " is-active" : ""}`}
            onClick={() => setSettingsTab("data")}
          >
            Data
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
                <p className="muted">
                  You can also double-click the grid label.
                </p>
              </div>
            </div>
          )}
          {settingsTab === "templates" && (
            <div className="panel__section">
              <h3>Templates</h3>
              <div className="form-grid">
                <label className="template-select template-select--modal">
                  テンプレート選択
                  <select value={templateForm.id} onChange={handleTemplateSelect}>
                    <option value="">未選択</option>
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
                  名称
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
                  幅 (mm)
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
                  高さ (mm)
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
                  色
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
                  回転
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
                  角丸 (左上)
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
                  角丸 (右上)
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
                  角丸 (右下)
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
                  角丸 (左下)
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
                  {templateForm.id ? "保存" : "追加"}
                </button>
                {templateForm.id && (
                  <button
                    className="btn btn--ghost"
                    type="button"
                    onClick={() => handleTemplateDelete(templateForm.id)}
                  >
                    削除
                  </button>
                )}
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={resetTemplateForm}
                >
                  クリア
                </button>
              </div>
            </div>
          )}
          {settingsTab === "data" && (
            <div className="panel__section">
              <h3>Data</h3>
              <div className="actions">
                <button className="btn" type="button" onClick={handleExport}>
                  Export JSON
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={onOpenExportPreview}
                >
                  A4プレビュー
                </button>
                <input type="file" accept=".json" onChange={handleImport} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


