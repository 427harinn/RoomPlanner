import { reducer, initialState } from "./reducer.js";

export const initHistory = () => ({
  past: [],
  present: initialState,
  future: [],
  isDragging: false,
});

const nonRecordableActions = new Set(["SELECT_FURNITURE", "SET_ACTIVE_ROOM"]);

const isMoveAction = (action) =>
  action.type === "MOVE_ROOM" || action.type === "MOVE_FURNITURE";

export const historyReducer = (state, action) => {
  switch (action.type) {
    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        isDragging: false,
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
        isDragging: false,
      };
    }
    case "BEGIN_DRAG": {
      if (state.isDragging) return state;
      return {
        ...state,
        past: [...state.past, state.present],
        future: [],
        isDragging: true,
      };
    }
    case "END_DRAG": {
      return {
        ...state,
        isDragging: false,
      };
    }
    default: {
      const newPresent = reducer(state.present, action);
      if (newPresent === state.present) return state;
      if (state.isDragging && isMoveAction(action)) {
        return {
          ...state,
          present: newPresent,
        };
      }
      if (nonRecordableActions.has(action.type)) {
        return {
          ...state,
          present: newPresent,
        };
      }
      return {
        ...state,
        past: [...state.past, state.present],
        present: newPresent,
        future: [],
      };
    }
  }
};
