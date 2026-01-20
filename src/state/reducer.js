const DEFAULT_ROOM = { width: 3600, height: 2600, x: 0, y: 0 };
const DEFAULT_COLOR = "#8ecae6";

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toNumber = value => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const createRoom = ({ name, width, height, x, y } = {}) => ({
  id: createId(),
  name: name ?? "部屋",
  width: toNumber(width) || DEFAULT_ROOM.width,
  height: toNumber(height) || DEFAULT_ROOM.height,
  x: toNumber(x),
  y: toNumber(y)
});

const DEFAULT_ROOM_INSTANCE = createRoom({
  name: "部屋1",
  width: DEFAULT_ROOM.width,
  height: DEFAULT_ROOM.height,
  x: DEFAULT_ROOM.x,
  y: DEFAULT_ROOM.y
});

export const initialState = {
  rooms: [DEFAULT_ROOM_INSTANCE],
  activeRoomId: DEFAULT_ROOM_INSTANCE.id,
  furnitures: [],
  selectedId: null
};

const normalizeRoom = room => {
  const width = toNumber(room?.width ?? room?.w ?? DEFAULT_ROOM.width);
  const height = toNumber(room?.height ?? room?.h ?? DEFAULT_ROOM.height);

  return {
    id: room?.id ?? createId(),
    name: room?.name ?? "部屋",
    width: width > 0 ? width : DEFAULT_ROOM.width,
    height: height > 0 ? height : DEFAULT_ROOM.height,
    x: toNumber(room?.x),
    y: toNumber(room?.y)
  };
};

const normalizeFurniture = (f, fallbackRoomId) => ({
  id: f.id ?? createId(),
  roomId: f.roomId ?? fallbackRoomId,
  name: f.name ?? "家具",
  width: toNumber(f.width),
  height: toNumber(f.height),
  x: toNumber(f.x),
  y: toNumber(f.y),
  color: f.color ?? DEFAULT_COLOR,
  rotation: f.rotation === 90 ? 90 : 0
});

const normalizeLayout = data => {
  const rooms = Array.isArray(data?.rooms)
    ? data.rooms.map(normalizeRoom)
    : [normalizeRoom(data?.room ?? {})];

  const fallbackRoomId = rooms[0]?.id ?? createId();
  const furnitures = Array.isArray(data?.furnitures)
    ? data.furnitures.map(f => normalizeFurniture(f, fallbackRoomId))
    : [];

  const roomIds = new Set(rooms.map(room => room.id));
  const normalizedFurnitures = furnitures.map(f => ({
    ...f,
    roomId: roomIds.has(f.roomId) ? f.roomId : fallbackRoomId
  }));

  return { rooms, furnitures: normalizedFurnitures };
};

export const createFurniture = ({ name, width, height, color, roomId }) => ({
  id: createId(),
  roomId,
  name: name && name.trim() ? name : "デスク",
  width: toNumber(width) || 1200,
  height: toNumber(height) || 600,
  x: 100,
  y: 100,
  color: color || DEFAULT_COLOR,
  rotation: 0
});

export function reducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVE_ROOM": {
      return {
        ...state,
        activeRoomId: action.payload,
        selectedId: null
      };
    }
    case "ADD_ROOM": {
      const maxX = state.rooms.reduce(
        (acc, room) => Math.max(acc, room.x + room.width),
        0
      );
      const room = createRoom({
        name: action.payload?.name ?? `部屋${state.rooms.length + 1}`,
        width: action.payload?.width,
        height: action.payload?.height,
        x: action.payload?.x ?? maxX + 200,
        y: action.payload?.y ?? 0
      });

      return {
        ...state,
        rooms: [...state.rooms, room],
        activeRoomId: room.id,
        selectedId: null
      };
    }
    case "DUPLICATE_ROOM": {
      const source = state.rooms.find(room => room.id === action.payload);
      if (!source) return state;

      const room = createRoom({
        name: `${source.name} コピー`,
        width: source.width,
        height: source.height,
        x: source.x + 200,
        y: source.y + 200
      });

      const duplicatedFurnitures = state.furnitures
        .filter(item => item.roomId === source.id)
        .map(item => ({
          ...item,
          id: createId(),
          roomId: room.id
        }));

      return {
        ...state,
        rooms: [...state.rooms, room],
        furnitures: [...state.furnitures, ...duplicatedFurnitures],
        activeRoomId: room.id,
        selectedId: null
      };
    }
    case "UPDATE_ROOM": {
      const { id, updates } = action.payload;
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === id
            ? {
                ...room,
                ...updates,
                width:
                  updates.width !== undefined
                    ? Math.max(1, toNumber(updates.width))
                    : room.width,
                height:
                  updates.height !== undefined
                    ? Math.max(1, toNumber(updates.height))
                    : room.height,
                x:
                  updates.x !== undefined
                    ? Math.max(0, toNumber(updates.x))
                    : room.x,
                y:
                  updates.y !== undefined
                    ? Math.max(0, toNumber(updates.y))
                    : room.y
              }
            : room
        )
      };
    }
    case "MOVE_ROOM": {
      const { id, x, y } = action.payload;
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === id
            ? {
                ...room,
                x: Math.max(0, toNumber(x)),
                y: Math.max(0, toNumber(y))
              }
            : room
        )
      };
    }
    case "DELETE_ROOM": {
      if (state.rooms.length <= 1) return state;
      const roomId = action.payload;
      const rooms = state.rooms.filter(room => room.id !== roomId);
      if (rooms.length === state.rooms.length) return state;

      const furnitures = state.furnitures.filter(
        item => item.roomId !== roomId
      );
      const activeRoomId =
        state.activeRoomId === roomId ? rooms[0]?.id ?? null : state.activeRoomId;

      return {
        ...state,
        rooms,
        furnitures,
        activeRoomId,
        selectedId: null
      };
    }
    case "ADD_FURNITURE": {
      const furniture = createFurniture({
        ...action.payload,
        roomId: state.activeRoomId
      });
      return {
        ...state,
        furnitures: [...state.furnitures, furniture],
        selectedId: furniture.id,
        activeRoomId: null
      };
    }
    case "SELECT_FURNITURE": {
      return {
        ...state,
        selectedId: action.payload,
        activeRoomId: null
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
        rooms: normalized.rooms,
        activeRoomId: normalized.rooms[0]?.id ?? null,
        furnitures: normalized.furnitures,
        selectedId: null
      };
    }
    default:
      return state;
  }
}
