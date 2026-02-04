import React from "react";

export default function MobileDrawer({ mobileTab, setMobileTab, listContent, editorContent }) {
  return (
    <div className="mobile-drawer" aria-label="モバイルメニュー">
      <div className="mobile-drawer__tabs">
        <button
          type="button"
          className={`mobile-drawer__tab${mobileTab === "list" ? " is-active" : ""}`}
          onClick={() => setMobileTab("list")}
        >
          一覧
        </button>
        <button
          type="button"
          className={`mobile-drawer__tab${mobileTab === "editor" ? " is-active" : ""}`}
          onClick={() => setMobileTab("editor")}
        >
          編集
        </button>
      </div>
      <div className="mobile-drawer__content">
        {mobileTab === "list" ? listContent : editorContent}
      </div>
    </div>
  );
}
