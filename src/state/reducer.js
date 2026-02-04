const DEFAULT_ROOM = { width: 3600, height: 2600, x: 0, y: 0 };
const DEFAULT_COLOR = "#8ecae6";
const DEFAULT_GRID_MM = 100;

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeRadius = (radius) => ({
  tl: toNumber(radius?.tl),
  tr: toNumber(radius?.tr),
  br: toNumber(radius?.br),
  bl: toNumber(radius?.bl),
});

const createRoom = ({ name, width, height, x, y, radius } = {}) => ({
  id: createId(),
  name: name ?? "部屋",
  width:
    width === undefined || width === null || width === ""
      ? DEFAULT_ROOM.width
      : toNumber(width),
  height:
    height === undefined || height === null || height === ""
      ? DEFAULT_ROOM.height
      : toNumber(height),
  x: toNumber(x),
  y: toNumber(y),
  radius: radius ?? { tl: 0, tr: 0, br: 0, bl: 0 },
});

const DEFAULT_ROOM_INSTANCE = createRoom({
  name: "部屋1",
  width: DEFAULT_ROOM.width,
  height: DEFAULT_ROOM.height,
  x: DEFAULT_ROOM.x,
  y: DEFAULT_ROOM.y,
});

export const initialState = {
  rooms: [DEFAULT_ROOM_INSTANCE],
  activeRoomId: DEFAULT_ROOM_INSTANCE.id,
  furnitures: [],
  selectedId: null,
  gridMM: DEFAULT_GRID_MM,
};

const normalizeRoom = (room) => {
  const width = toNumber(room?.width ?? room?.w ?? DEFAULT_ROOM.width);
  const height = toNumber(room?.height ?? room?.h ?? DEFAULT_ROOM.height);

  return {
    id: room?.id ?? createId(),
    name: room?.name ?? "部屋",
    width: width >= 0 ? width : DEFAULT_ROOM.width,
    height: height >= 0 ? height : DEFAULT_ROOM.height,
    x: toNumber(room?.x),
    y: toNumber(room?.y),
    radius: {
      tl: toNumber(room?.radius?.tl ?? room?.radiusTL ?? 0),
      tr: toNumber(room?.radius?.tr ?? room?.radiusTR ?? 0),
      br: toNumber(room?.radius?.br ?? room?.radiusBR ?? 0),
      bl: toNumber(room?.radius?.bl ?? room?.radiusBL ?? 0),
    },
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
  rotation: [0, 90, 180, 270].includes(f.rotation) ? f.rotation : 0,
  radius: {
    tl: toNumber(f?.radius?.tl ?? f?.radiusTL ?? 0),
    tr: toNumber(f?.radius?.tr ?? f?.radiusTR ?? 0),
    br: toNumber(f?.radius?.br ?? f?.radiusBR ?? 0),
    bl: toNumber(f?.radius?.bl ?? f?.radiusBL ?? 0),
  },
});

const normalizeLayout = (data) => {
  const rooms = Array.isArray(data?.rooms)
    ? data.rooms.map(normalizeRoom)
    : [normalizeRoom(data?.room ?? {})];

  const fallbackRoomId = rooms[0]?.id ?? createId();
  const furnitures = Array.isArray(data?.furnitures)
    ? data.furnitures.map((f) => normalizeFurniture(f, fallbackRoomId))
    : [];

  const roomIds = new Set(rooms.map((room) => room.id));
  const normalizedFurnitures = furnitures.map((f) => ({
    ...f,
    roomId: roomIds.has(f.roomId) ? f.roomId : fallbackRoomId,
  }));

  return {
    rooms,
    furnitures: normalizedFurnitures,
    gridMM: toNumber(data?.gridMM) || DEFAULT_GRID_MM,
  };
};

const getDisplaySize = (furniture) =>
  furniture.rotation === 90
    ? { w: toNumber(furniture.height), h: toNumber(furniture.width) }
    : { w: toNumber(furniture.width), h: toNumber(furniture.height) };

const cloneFurniture = (source, roomId) => ({
  id: createId(),
  roomId,
  name: source.name && source.name.trim() ? source.name : "家具",
  width: toNumber(source.width),
  height: toNumber(source.height),
  x: toNumber(source.x) + 100,
  y: toNumber(source.y) + 100,
  color: source.color ?? DEFAULT_COLOR,
  rotation: source.rotation === 90 ? 90 : 0,
  radius: normalizeRadius(source.radius),
});

export const createFurniture = ({ name, width, height, color, roomId }) => ({
  id: createId(),
  roomId,
  name: name && name.trim() ? name : "デスク",
  width: toNumber(width) || 1200,
  height: toNumber(height) || 600,
  x: 100,
  y: 100,
  color: color || DEFAULT_COLOR,
  rotation: 0,
  radius: { tl: 0, tr: 0, br: 0, bl: 0 },
});

export function reducer(state, action) {
  switch (action.type) {
    case "SET_ACTIVE_ROOM": {
      return {
        ...state,
        activeRoomId: action.payload,
        selectedId: null,
      };
    }
    case "ADD_ROOM": {
      const maxX = state.rooms.reduce(
        (acc, room) => Math.max(acc, room.x + room.width),
        0,
      );
      const room = createRoom({
        name: action.payload?.name ?? `部屋${state.rooms.length + 1}`,
        width: action.payload?.width,
        height: action.payload?.height,
        x: action.payload?.x ?? maxX + 200,
        y: action.payload?.y ?? 0,
      });

      return {
        ...state,
        rooms: [...state.rooms, room],
        activeRoomId: room.id,
        selectedId: null,
      };
    }
    case "DUPLICATE_ROOM": {
      const source = state.rooms.find((room) => room.id === action.payload);
      if (!source) return state;

      const room = createRoom({
        name: `${source.name} コピー`,
        width: source.width,
        height: source.height,
        x: source.x + 200,
        y: source.y + 200,
      });

      const duplicatedFurnitures = state.furnitures
        .filter((item) => item.roomId === source.id)
        .map((item) => ({
          ...item,
          id: createId(),
          roomId: room.id,
        }));

      return {
        ...state,
        rooms: [...state.rooms, room],
        furnitures: [...state.furnitures, ...duplicatedFurnitures],
        activeRoomId: room.id,
        selectedId: null,
      };
    }
    case "PASTE_ROOM": {
      const payload = action.payload;
      if (!payload?.room) return state;
      const room = createRoom({
        name: `${payload.room.name ?? "部屋"} コピー`,
        width: payload.room.width,
        height: payload.room.height,
        x: toNumber(payload.room.x) + 200,
        y: toNumber(payload.room.y) + 200,
      });
      const furnitures = Array.isArray(payload.furnitures)
        ? payload.furnitures.map((item) => cloneFurniture(item, room.id))
        : [];
      return {
        ...state,
        rooms: [...state.rooms, room],
        furnitures: [...state.furnitures, ...furnitures],
        activeRoomId: room.id,
        selectedId: null,
      };
    }
    case "UPDATE_ROOM": {
      const { id, updates } = action.payload;
      return {
        ...state,
        rooms: state.rooms.map((room) =>
          room.id === id
            ? {
                ...room,
                ...updates,
                width:
                  updates.width !== undefined
                    ? Math.max(0, toNumber(updates.width))
                    : room.width,
                height:
                  updates.height !== undefined
                    ? Math.max(0, toNumber(updates.height))
                    : room.height,
                x:
                  updates.x !== undefined
                    ? Math.max(0, toNumber(updates.x))
                    : room.x,
                y:
                  updates.y !== undefined
                    ? Math.max(0, toNumber(updates.y))
                    : room.y,
                radius:
                  updates.radius !== undefined
                    ? normalizeRadius(updates.radius)
                    : room.radius,
              }
            : room,
        ),
      };
    }
    case "MOVE_ROOM": {
      const { id, x, y } = action.payload;
      return {
        ...state,
        rooms: state.rooms.map((room) =>
          room.id === id
            ? {
                ...room,
                x: Math.max(0, toNumber(x)),
                y: Math.max(0, toNumber(y)),
              }
            : room,
        ),
      };
    }
    case "DELETE_ROOM": {
      if (state.rooms.length <= 1) return state;
      const roomId = action.payload;
      const rooms = state.rooms.filter((room) => room.id !== roomId);
      if (rooms.length === state.rooms.length) return state;

      const furnitures = state.furnitures.filter(
        (item) => item.roomId !== roomId,
      );
      const activeRoomId =
        state.activeRoomId === roomId
          ? (rooms[0]?.id ?? null)
          : state.activeRoomId;

      return {
        ...state,
        rooms,
        furnitures,
        activeRoomId,
        selectedId: null,
      };
    }
    case "DELETE_FURNITURE": {
      const id = action.payload;
      const furnitures = state.furnitures.filter((item) => item.id !== id);
      if (furnitures.length === state.furnitures.length) return state;
      return {
        ...state,
        furnitures,
        selectedId: null,
      };
    }
    case "ADD_FURNITURE": {
      const selected = state.furnitures.find(
        (item) => item.id === state.selectedId,
      );
      const targetRoomId = state.activeRoomId ?? selected?.roomId ?? null;
      if (!targetRoomId) return state;
      const furniture = createFurniture({
        ...action.payload,
        roomId: targetRoomId,
      });
      return {
        ...state,
        furnitures: [...state.furnitures, furniture],
        selectedId: furniture.id,
        activeRoomId: null,
      };
    }
    case "DUPLICATE_FURNITURE": {
      const source = state.furnitures.find(
        (item) => item.id === action.payload,
      );
      if (!source) return state;

      const furniture = {
        ...source,
        id: createId(),
        name: `${source.name} コピー`,
        x: source.x + 100,
        y: source.y + 100,
      };

      return {
        ...state,
        furnitures: [...state.furnitures, furniture],
        selectedId: furniture.id,
        activeRoomId: null,
      };
    }
    case "PASTE_FURNITURE": {
      const payload = action.payload;
      if (!payload?.furniture) return state;
      const roomIds = new Set(state.rooms.map((room) => room.id));
      const preferredRoomId = payload.targetRoomId;
      const roomId = roomIds.has(preferredRoomId)
        ? preferredRoomId
        : roomIds.has(payload.furniture.roomId)
          ? payload.furniture.roomId
          : null;
      const furniture = cloneFurniture(payload.furniture, roomId);
      return {
        ...state,
        furnitures: [...state.furnitures, furniture],
        selectedId: furniture.id,
        activeRoomId: null,
      };
    }
    case "SELECT_FURNITURE": {
      return {
        ...state,
        selectedId: action.payload,
        activeRoomId: null,
      };
    }
    case "UPDATE_FURNITURE": {
      const { id, updates } = action.payload;
      return {
        ...state,
        furnitures: state.furnitures.map((f) =>
          f.id === id
            ? {
                ...f,
                ...updates,
                width:
                  updates.width !== undefined
                    ? toNumber(updates.width)
                    : f.width,
                height:
                  updates.height !== undefined
                    ? toNumber(updates.height)
                    : f.height,
                radius:
                  updates.radius !== undefined
                    ? normalizeRadius(updates.radius)
                    : f.radius,
              }
            : f,
        ),
      };
    }
    case "MOVE_FURNITURE": {
      const { id, x, y, absX, absY } = action.payload;
      const target = state.furnitures.find((item) => item.id === id);
      if (!target) return state;
      const { w, h } = getDisplaySize(target);
      const currentRoom = state.rooms.find((room) => room.id === target.roomId);
      const absoluteX =
        absX !== undefined
          ? toNumber(absX)
          : currentRoom
            ? currentRoom.x + toNumber(x)
            : toNumber(x);
      const absoluteY =
        absY !== undefined
          ? toNumber(absY)
          : currentRoom
            ? currentRoom.y + toNumber(y)
            : toNumber(y);
      const nextRoom = state.rooms.find(
        (room) =>
          absoluteX >= room.x &&
          absoluteY >= room.y &&
          absoluteX + w <= room.x + room.width &&
          absoluteY + h <= room.y + room.height,
      );

      const nextRoomId = nextRoom ? nextRoom.id : null;
      const nextX = nextRoom ? absoluteX - nextRoom.x : absoluteX;
      const nextY = nextRoom ? absoluteY - nextRoom.y : absoluteY;
      return {
        ...state,
        furnitures: state.furnitures.map((f) =>
          f.id === id
            ? {
                ...f,
                roomId: nextRoomId,
                x: toNumber(nextX),
                y: toNumber(nextY),
              }
            : f,
        ),
      };
    }
    case "TOGGLE_ROTATION": {
      const id = action.payload;
      return {
        ...state,
        furnitures: state.furnitures.map((f) =>
          f.id === id
            ? {
                ...f,
                rotation: (f.rotation + 90) % 360,
                width: f.height,
                height: f.width,
                radius: {
                  tl: f.radius?.bl ?? 0,
                  tr: f.radius?.tl ?? 0,
                  br: f.radius?.tr ?? 0,
                  bl: f.radius?.br ?? 0,
                },
              }
            : f,
        ),
      };
    }
    case "IMPORT_LAYOUT": {
      const normalized = normalizeLayout(action.payload);
      return {
        rooms: normalized.rooms,
        activeRoomId: normalized.rooms[0]?.id ?? null,
        furnitures: normalized.furnitures,
        selectedId: null,
        gridMM: normalized.gridMM,
      };
    }
    case "SET_GRID_MM": {
      return {
        ...state,
        gridMM: action.payload,
      };
    }
    default:
      return state;
  }
}
