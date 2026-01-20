import React, { useReducer } from "react";
import { reducer, initialState } from "./state/reducer.js";
import RoomControls from "./components/RoomControls.jsx";
import FurnitureForm from "./components/FurnitureForm.jsx";
import FurnitureEditor from "./components/FurnitureEditor.jsx";
import ImportExport from "./components/ImportExport.jsx";
import RoomCanvas from "./components/RoomCanvas.jsx";

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Room Planner</h1>
      </header>

      <div className="app__columns">
        <section className="panel">
          <RoomControls room={state.room} dispatch={dispatch} />
          <FurnitureForm dispatch={dispatch} />
          <FurnitureEditor
            furniture={state.furnitures.find(f => f.id === state.selectedId) || null}
            dispatch={dispatch}
          />
          <ImportExport state={state} dispatch={dispatch} />
        </section>

        <section className="panel panel--canvas">
          <RoomCanvas
            room={state.room}
            furnitures={state.furnitures}
            selectedId={state.selectedId}
            dispatch={dispatch}
          />
        </section>
      </div>
    </div>
  );
}
