import React from "react";
import RoomEditor from "./RoomEditor.jsx";
import FurnitureEditor from "./FurnitureEditor.jsx";

export default function EditorPanel({
  activeRoom,
  roomsCount,
  selectedFurniture,
  showRoomEditor,
  showFurnitureEditor,
  dispatch,
  isMobile,
}) {
  if (showRoomEditor) {
    return (
      <RoomEditor
        room={activeRoom}
        roomsCount={roomsCount}
        isMobile={isMobile}
        dispatch={dispatch}
      />
    );
  }

  if (showFurnitureEditor) {
    return (
      <FurnitureEditor
        furniture={selectedFurniture}
        isMobile={isMobile}
        dispatch={dispatch}
      />
    );
  }

  return (
    <div className="panel__section">
      <h2>編集</h2>
      <p className="muted">左の一覧から部屋か家具を選択してください</p>
    </div>
  );
}
