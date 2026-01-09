import ScotlandTab from "./components/ScotlandTab";
import "./App.css";

function App() {
  return (
    <div className="app">
      <main className="main-content">
        {/* Title row */}
        <div className="title-row">
          <h1>Scotland economic outlook pre-budget 2026</h1>
        </div>

        {/* Dashboard content */}
        <ScotlandTab />
      </main>
    </div>
  );
}

export default App;
