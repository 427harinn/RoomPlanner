import { useEffect } from "react";

export default function useKeyboardShortcuts({
  stateRef,
  roomRef,
  furnitureRef,
  fixtureRef,
  fixtureRoomRef,
  clipboardRef,
  onDispatch,
  onSetSelectionSource,
}) {
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const inputType = target?.type?.toLowerCase();
      const allowInInput =
        tagName === "input" &&
        (inputType === "range" || inputType === "number" || inputType === "color");
      if (
        (tagName === "input" && !allowInInput) ||
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
      const currentFixture = fixtureRef.current;
      const currentFixtureRoom = fixtureRoomRef.current;

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
          if (currentFixture) {
            clipboardRef.current = {
              type: "fixture",
              data: {
                fixture: { ...currentFixture },
                roomId: currentFixtureRoom?.id ?? null,
              },
            };
          } else if (currentFurniture) {
            clipboardRef.current = {
              type: "furniture",
              data: { ...currentFurniture },
            };
          } else if (currentRoom) {
            const roomFurnitures = currentState.furnitures.filter(
              (item) => item.roomId === currentRoom.id,
            );
            clipboardRef.current = {
              type: "room",
              data: {
                room: { ...currentRoom },
                furnitures: roomFurnitures.map((item) => ({ ...item })),
              },
            };
          } else {
            clipboardRef.current = { type: null, data: null };
          }
          return;
        }
        if (event.key.toLowerCase() === "x") {
          event.preventDefault();
          if (currentFixture && currentFixtureRoom) {
            clipboardRef.current = {
              type: "fixture",
              data: {
                fixture: { ...currentFixture },
                roomId: currentFixtureRoom.id,
              },
            };
            onDispatch({
              type: "DELETE_FIXTURE",
              payload: {
                roomId: currentFixtureRoom.id,
                fixtureId: currentFixture.id,
              },
            });
            return;
          }
          if (currentFurniture) {
            clipboardRef.current = {
              type: "furniture",
              data: { ...currentFurniture },
            };
            onDispatch({
              type: "DELETE_FURNITURE",
              payload: currentFurniture.id,
            });
            return;
          }
          if (currentRoom) {
            const roomFurnitures = currentState.furnitures.filter(
              (item) => item.roomId === currentRoom.id,
            );
            clipboardRef.current = {
              type: "room",
              data: {
                room: { ...currentRoom },
                furnitures: roomFurnitures.map((item) => ({ ...item })),
              },
            };
            onDispatch({ type: "DELETE_ROOM", payload: currentRoom.id });
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
                targetRoomId: currentRoom?.id ?? null,
              },
            });
          } else if (clipboard.type === "fixture") {
            const targetRoomId =
              clipboard.data.roomId ??
              currentFixtureRoom?.id ??
              currentRoom?.id ??
              null;
            if (!targetRoomId) return;
            const sourceFixture = clipboard.data.fixture;
            const offset = 40;
            onDispatch({
              type: "ADD_FIXTURE",
              payload: {
                roomId: targetRoomId,
                fixture: {
                  ...sourceFixture,
                  id: null,
                  x: (sourceFixture?.x ?? 0) + offset,
                  y: (sourceFixture?.y ?? 0) + offset,
                },
              },
            });
          } else if (clipboard.type === "room") {
            onDispatch({
              type: "PASTE_ROOM",
              payload: clipboard.data,
            });
          }
        }
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        if (currentFixture && currentFixtureRoom) {
          event.preventDefault();
          onDispatch({
            type: "DELETE_FIXTURE",
            payload: {
              roomId: currentFixtureRoom.id,
              fixtureId: currentFixture.id,
            },
          });
          return;
        }
        if (currentFurniture) {
          event.preventDefault();
          onDispatch({
            type: "DELETE_FURNITURE",
            payload: currentFurniture.id,
          });
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
  }, [
    clipboardRef,
    onDispatch,
    onSetSelectionSource,
    roomRef,
    stateRef,
    furnitureRef,
    fixtureRef,
    fixtureRoomRef,
  ]);
}
