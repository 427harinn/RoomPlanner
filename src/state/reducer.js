const DEFAULT_ROOM = { width: 3600, height: 2600, x: 0, y: 0 };
const DEFAULT_COLOR = "#8ecae6";
const DEFAULT_GRID_MM = 100;
const DEFAULT_FIXTURE = {
  type: "door",
  wall: "top",
  offset: 200,
  length: 800,
  x: 0,
  y: 0,
  rotation: 0,
  shape: "rect",
  width: 200,
  height: 200,
  memo: "",
};
const FIXTURE_DEFAULTS = {
  door: { width: 700, height: 200 },
  window: { width: 1400, height: 160 },
  outlet: { width: 120, height: 80 },
  lan: { width: 120, height: 80 },
  pillar: { width: 320, height: 320 },
};
const DEFAULT_TEMPLATE = {
  name: "家具",
  width: 1200,
  height: 600,
  color: DEFAULT_COLOR,
  rotation: 0,
  radius: { tl: 0, tr: 0, br: 0, bl: 0 },
};

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

const normalizeFixture = (fixture) => {
  const type = ["door", "window", "outlet", "lan", "pillar"].includes(
    fixture?.type,
  )
    ? fixture.type
    : DEFAULT_FIXTURE.type;
  const wall = ["top", "right", "bottom", "left", "free"].includes(
    fixture?.wall,
  )
    ? fixture.wall
    : DEFAULT_FIXTURE.wall;
  const defaults = FIXTURE_DEFAULTS[type] ?? FIXTURE_DEFAULTS.door;
  return {
    id: fixture?.id ?? createId(),
    type,
    wall: type === "pillar" ? "free" : wall,
    offset: Math.max(0, toNumber(fixture?.offset ?? DEFAULT_FIXTURE.offset)),
    x: toNumber(fixture?.x ?? DEFAULT_FIXTURE.x),
    y: toNumber(fixture?.y ?? DEFAULT_FIXTURE.y),
    rotation: Number.isFinite(Number(fixture?.rotation))
      ? Number(fixture.rotation)
      : DEFAULT_FIXTURE.rotation,
    shape:
      type === "pillar" && ["rect", "triangle"].includes(fixture?.shape)
        ? fixture.shape
        : DEFAULT_FIXTURE.shape,
    width: Math.max(
      40,
      toNumber(fixture?.width ?? fixture?.length ?? defaults.width),
    ),
    height: Math.max(
      40,
      toNumber(fixture?.height ?? fixture?.length ?? defaults.height),
    ),
    memo: typeof fixture?.memo === "string" ? fixture.memo : "",
    trianglePoints:
      type === "pillar" && fixture?.shape === "triangle"
        ? Array.isArray(fixture?.trianglePoints) &&
          fixture.trianglePoints.length === 3
          ? fixture.trianglePoints.map((point) => ({
              x: toNumber(point?.x),
              y: toNumber(point?.y),
            }))
          : defaultTrianglePoints(
              Math.max(
                40,
                toNumber(fixture?.width ?? fixture?.length ?? defaults.width),
              ),
              Math.max(
                40,
                toNumber(fixture?.height ?? fixture?.length ?? defaults.height),
              ),
            )
        : undefined,
  };
};

const normalizeFixtures = (fixtures) =>
  Array.isArray(fixtures) ? fixtures.map(normalizeFixture) : [];

const defaultTrianglePoints = (width, height) => [
  { x: width / 2, y: 0 },
  { x: 0, y: height },
  { x: width, y: height },
];

const createRoom = ({ name, width, height, x, y, radius, fixtures } = {}) => ({
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
  fixtures: normalizeFixtures(fixtures),
});

const DEFAULT_ROOM_INSTANCE = createRoom({
  name: "部屋1",
  width: DEFAULT_ROOM.width,
  height: DEFAULT_ROOM.height,
  x: DEFAULT_ROOM.x,
  y: DEFAULT_ROOM.y,
});

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
    fixtures: normalizeFixtures(room?.fixtures),
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
  rotation: Number.isFinite(Number(f.rotation)) ? Number(f.rotation) : 0,
  memo: typeof f?.memo === "string" ? f.memo : "",
  radius: {
    tl: toNumber(f?.radius?.tl ?? f?.radiusTL ?? 0),
    tr: toNumber(f?.radius?.tr ?? f?.radiusTR ?? 0),
    br: toNumber(f?.radius?.br ?? f?.radiusBR ?? 0),
    bl: toNumber(f?.radius?.bl ?? f?.radiusBL ?? 0),
  },
});

const normalizeTemplate = (t) => ({
  id: t?.id ?? createId(),
  name: t?.name ?? DEFAULT_TEMPLATE.name,
  width: toNumber(t?.width) || DEFAULT_TEMPLATE.width,
  height: toNumber(t?.height) || DEFAULT_TEMPLATE.height,
  color: t?.color ?? DEFAULT_TEMPLATE.color,
  rotation: Number.isFinite(Number(t?.rotation)) ? Number(t.rotation) : 0,
  radius: normalizeRadius(t?.radius ?? DEFAULT_TEMPLATE.radius),
});

const normalizeTemplates = (templates) =>
  Array.isArray(templates) ? templates.map(normalizeTemplate) : [];

export const initialState = {
  rooms: [DEFAULT_ROOM_INSTANCE],
  activeRoomId: DEFAULT_ROOM_INSTANCE.id,
  furnitures: [],
  selectedId: null,
  selectedFixtureId: null,
  gridMM: DEFAULT_GRID_MM,
  templates: normalizeTemplates([
    {
      name: "シングルベッド",
      width: 970,
      height: 1950,
      color: "#93c5fd",
      rotation: 0,
      radius: { tl: 0, tr: 0, br: 0, bl: 0 },
    },
    {
      name: "デスク",
      width: 1200,
      height: 600,
      color: "#fde68a",
      rotation: 0,
      radius: { tl: 0, tr: 0, br: 0, bl: 0 },
    },
    {
      name: "チェア",
      width: 450,
      height: 450,
      color: "#bbf7d0",
      rotation: 0,
      radius: { tl: 90, tr: 90, br: 90, bl: 90 },
    },
    {
      name: "ソファ(2人掛け)",
      width: 1500,
      height: 800,
      color: "#fecaca",
      rotation: 0,
      radius: { tl: 8, tr: 8, br: 8, bl: 8 },
    },
    {
      name: "本棚",
      width: 900,
      height: 300,
      color: "#e9d5ff",
      rotation: 0,
      radius: { tl: 0, tr: 0, br: 0, bl: 0 },
    },
    {
      name: "ローテーブル",
      width: 1000,
      height: 500,
      color: "#fed7aa",
      rotation: 0,
      radius: { tl: 4, tr: 4, br: 4, bl: 4 },
    },
    {
      name: "ダイニングテーブル(4人)",
      width: 1400,
      height: 800,
      color: "#fef3c7",
      rotation: 0,
      radius: { tl: 6, tr: 6, br: 6, bl: 6 },
    },
    {
      name: "テレビ台",
      width: 1200,
      height: 400,
      color: "#e2e8f0",
      rotation: 0,
      radius: { tl: 0, tr: 0, br: 0, bl: 0 },
    },
    {
      name: "冷蔵庫",
      width: 650,
      height: 650,
      color: "#cbd5f5",
      rotation: 0,
      radius: { tl: 4, tr: 4, br: 4, bl: 4 },
    },
  ]),
};

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
    templates: normalizeTemplates(data?.templates),
  };
};

const getDisplaySize = (furniture) => {
  const rotation = Number(furniture.rotation) || 0;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = toNumber(furniture.width);
  const h = toNumber(furniture.height);
  return {
    w: w * cos + h * sin,
    h: w * sin + h * cos,
  };
};

const cloneFurniture = (source, roomId) => ({
  id: createId(),
  roomId,
  name: source.name && source.name.trim() ? source.name : "家具",
  width: toNumber(source.width),
  height: toNumber(source.height),
  x: toNumber(source.x) + 100,
  y: toNumber(source.y) + 100,
  color: source.color ?? DEFAULT_COLOR,
  rotation: Number.isFinite(Number(source.rotation)) ? source.rotation : 0,
  radius: normalizeRadius(source.radius),
});

const cloneFixture = (source) => ({
  ...normalizeFixture(source),
  id: createId(),
});

export const createFurniture = ({ name, width, height, color, roomId }) => ({
  id: createId(),
  roomId,
  name: name && name.trim() ? name : "家具",
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
        selectedFixtureId: null,
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
        selectedFixtureId: null,
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
        fixtures: (source.fixtures ?? []).map(cloneFixture),
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
        selectedFixtureId: null,
      };
    }
    case "PASTE_ROOM": {
      const payload = action.payload;
      if (!payload?.room) return state;
      const roomFixtures = Array.isArray(payload.room.fixtures)
        ? payload.room.fixtures.map(cloneFixture)
        : [];
      const room = createRoom({
        name: `${payload.room.name ?? "部屋"} コピー`,
        width: payload.room.width,
        height: payload.room.height,
        x: toNumber(payload.room.x) + 200,
        y: toNumber(payload.room.y) + 200,
        fixtures: roomFixtures,
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
        selectedFixtureId: null,
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
      const remainingFixtureIds = new Set(
        rooms.flatMap((room) => room.fixtures ?? []).map((fixture) => fixture.id),
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
        selectedFixtureId: remainingFixtureIds.has(state.selectedFixtureId)
          ? state.selectedFixtureId
          : null,
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
        selectedFixtureId:
          state.selectedFixtureId && state.selectedFixtureId === id
            ? null
            : state.selectedFixtureId,
      };
    }
    case "ADD_FURNITURE": {
      const selected = state.furnitures.find(
        (item) => item.id === state.selectedId,
      );
      const targetRoomId =
        action.payload?.roomId ?? state.activeRoomId ?? selected?.roomId ?? null;
      if (!targetRoomId) return state;
      const template =
        action.payload?.templateId &&
        state.templates.find((t) => t.id === action.payload.templateId);
      const furniture = createFurniture({
        ...action.payload,
        roomId: targetRoomId,
      });
      if (template) {
        furniture.name = template.name;
        furniture.width = template.width;
        furniture.height = template.height;
        furniture.color = template.color;
        furniture.rotation = template.rotation;
        furniture.radius = normalizeRadius(template.radius);
      }
      return {
        ...state,
        furnitures: [...state.furnitures, furniture],
        selectedId: furniture.id,
        activeRoomId: null,
        selectedFixtureId: null,
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
        selectedFixtureId: null,
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
        selectedFixtureId: null,
      };
    }
    case "SELECT_FURNITURE": {
      return {
        ...state,
        selectedId: action.payload,
        activeRoomId: null,
        selectedFixtureId: null,
      };
    }
    case "SELECT_FIXTURE": {
      return {
        ...state,
        selectedId: null,
        activeRoomId: null,
        selectedFixtureId: action.payload,
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
      const baseW = toNumber(target.width);
      const baseH = toNumber(target.height);
      const centerX = absoluteX + baseW / 2;
      const centerY = absoluteY + baseH / 2;
      const aabbX = centerX - w / 2;
      const aabbY = centerY - h / 2;
      const nextRoom = state.rooms.find(
        (room) =>
          aabbX >= room.x &&
          aabbY >= room.y &&
          aabbX + w <= room.x + room.width &&
          aabbY + h <= room.y + room.height,
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
                rotation: Number(f.rotation) + 90,
                width: f.width,
                height: f.height,
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
        selectedFixtureId: null,
        gridMM: normalized.gridMM,
        templates:
          normalized.templates.length > 0
            ? normalized.templates
            : state.templates,
      };
    }
    case "SET_TEMPLATES": {
      return {
        ...state,
        templates: normalizeTemplates(action.payload),
      };
    }
    case "ADD_TEMPLATE": {
      const template = normalizeTemplate(action.payload);
      return {
        ...state,
        templates: [...state.templates, template],
      };
    }
    case "UPDATE_TEMPLATE": {
      const { id, updates } = action.payload;
      return {
        ...state,
        templates: state.templates.map((t) =>
          t.id === id
            ? { ...t, ...normalizeTemplate({ ...t, ...updates }) }
            : t,
        ),
      };
    }
    case "DELETE_TEMPLATE": {
      const id = action.payload;
      return {
        ...state,
        templates: state.templates.filter((t) => t.id !== id),
      };
    }
    case "ADD_FIXTURE": {
      const roomId = action.payload?.roomId;
      const fixture = normalizeFixture(action.payload?.fixture ?? {});
      if (!roomId) return state;
      return {
        ...state,
        rooms: state.rooms.map((room) =>
          room.id === roomId
            ? { ...room, fixtures: [...(room.fixtures ?? []), fixture] }
            : room,
        ),
        selectedFixtureId: fixture.id,
        selectedId: null,
        activeRoomId: null,
      };
    }
    case "UPDATE_FIXTURE": {
      const { roomId, fixtureId, updates } = action.payload ?? {};
      if (!roomId || !fixtureId) return state;
      return {
        ...state,
        rooms: state.rooms.map((room) =>
          room.id === roomId
            ? {
                ...room,
                fixtures: (room.fixtures ?? []).map((fixture) =>
                  fixture.id === fixtureId
                    ? normalizeFixture({ ...fixture, ...updates })
                    : fixture,
                ),
              }
            : room,
        ),
      };
    }
    case "DELETE_FIXTURE": {
      const { roomId, fixtureId } = action.payload ?? {};
      if (!roomId || !fixtureId) return state;
      return {
        ...state,
        rooms: state.rooms.map((room) =>
          room.id === roomId
            ? {
                ...room,
                fixtures: (room.fixtures ?? []).filter(
                  (fixture) => fixture.id !== fixtureId,
                ),
              }
            : room,
        ),
        selectedFixtureId:
          state.selectedFixtureId === fixtureId
            ? null
            : state.selectedFixtureId,
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
