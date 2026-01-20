const DEFAULT_ROOM = { width: 3600, height: 2600 };
const DEFAULT_COLOR = "#8ecae6";

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const initialState = {
  room: DEFAULT_ROOM,
  furnitures: [],
  selectedId: null
};

const toNumber = value => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeFurniture = f => ({
  id: f.id ?? createId(),
  name: f.name ?? "家具",
  width: toNumber(f.width),
  height: toNumber(f.height),
  x: toNumber(f.x),
  y: toNumber(f.y),
  color: f.color ?? DEFAULT_COLOR,
  rotation: f.rotation === 90 ? 90 : 0
});

const normalizeLayout = data => {
  const roomData = data?.room ?? {};
  const width = toNumber(roomData.width ?? roomData.w ?? DEFAULT_ROOM.width);
  const height = toNumber(roomData.height ?? roomData.h ?? DEFAULT_ROOM.height);

  return {
    room: {
      width: width > 0 ? width : DEFAULT_ROOM.width,
      height: height > 0 ? height : DEFAULT_ROOM.height
    },
    furnitures: Array.isArray(data?.furnitures)
      ? data.furnitures.map(normalizeFurniture)
      : []
  };
};

export const createFurniture = ({ name, width, height, color }) => ({
  id: createId(),
  name,
  width: toNumber(width),
  height: toNumber(height),
  x: 100,
  y: 100,
  color: color || DEFAULT_COLOR,
  rotation: 0
});

export function reducer(state, action) {
  switch (action.type) {
    case "SET_ROOM": {
      const width = toNumber(action.payload.width);
      const height = toNumber(action.payload.height);
      return {
        ...state,
        room: {
          width: width > 0 ? width : state.room.width,
          height: height > 0 ? height : state.room.height
        }
      };
    }
    case "ADD_FURNITURE": {
      const furniture = createFurniture(action.payload);
      return {
        ...state,
        furnitures: [...state.furnitures, furniture],
        selectedId: furniture.id
      };
    }
    case "SELECT_FURNITURE": {
      return {
        ...state,
        selectedId: action.payload
      };
    }
    case "UPDATE_FURNITURE": {
      const { id, updates } = action.payload;
      return {
        ...state,
        furnitures: state.furnitures.map(f =>
          f.id === id
            ? {
                ...f,
                ...updates,
                width: updates.width !== undefined ? toNumber(updates.width) : f.width,
                height: updates.height !== undefined ? toNumber(updates.height) : f.height
              }
            : f
        )
      };
    }
    case "MOVE_FURNITURE": {
      const { id, x, y } = action.payload;
      return {
        ...state,
        furnitures: state.furnitures.map(f =>
          f.id === id
            ? {
                ...f,
                x: toNumber(x),
                y: toNumber(y)
              }
            : f
        )
      };
    }
    case "TOGGLE_ROTATION": {
      const id = action.payload;
      return {
        ...state,
        furnitures: state.furnitures.map(f =>
          f.id === id
            ? { ...f, rotation: f.rotation === 90 ? 0 : 90 }
            : f
        )
      };
    }
    case "IMPORT_LAYOUT": {
      const normalized = normalizeLayout(action.payload);
      return {
        room: normalized.room,
        furnitures: normalized.furnitures,
        selectedId: null
      };
    }
    default:
      return state;
  }
}
