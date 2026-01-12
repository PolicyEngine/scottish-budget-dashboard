import ScotlandTab from "./components/ScotlandTab";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="title-row">
        <div className="title-row-inner">
          <h1>Scotland's economic outlook</h1>
        </div>
      </header>
      <main className="main-content">
        <ScotlandTab />
      </main>
    </div>
  );
}

export default App;
