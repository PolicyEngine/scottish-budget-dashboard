import ScotlandTab from "./components/ScotlandTab";
import "./App.css";

function App() {
  return (
    <div className="app">
      <main className="main-content">
        {/* Title row */}
        <div className="title-row">
          <h1>Scottish Budget 2026-27</h1>
        </div>

        {/* Dashboard content */}
        <ScotlandTab />
      </main>
    </div>
  );
}

export default App;
