import { useEffect } from "react";

export default function useKeyboardShortcuts({
  stateRef,
  roomRef,
  furnitureRef,
  clipboardRef,
  onDispatch,
  onSetSelectionSource
}) {
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
      const currentState = stateRef.current;
      const currentRoom = roomRef.current;
      const currentFurniture = furnitureRef.current;

      if (modifier) {
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            onDispatch({ type: "REDO" });
          } else {
            onDispatch({ type: "UNDO" });
          }
          return;
        }
        if (!isMac && event.key.toLowerCase() === "y") {
          event.preventDefault();
          onDispatch({ type: "REDO" });
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
          onSetSelectionSource("list");
          if (clipboard.type === "furniture") {
            onDispatch({
              type: "PASTE_FURNITURE",
              payload: {
                furniture: clipboard.data,
                targetRoomId: currentRoom?.id ?? null
              }
            });
          } else if (clipboard.type === "room") {
            onDispatch({
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
          onDispatch({ type: "DELETE_FURNITURE", payload: currentFurniture.id });
          return;
        }
        if (currentRoom) {
          event.preventDefault();
          onDispatch({ type: "DELETE_ROOM", payload: currentRoom.id });
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clipboardRef, onDispatch, onSetSelectionSource, roomRef, stateRef, furnitureRef]);
}
