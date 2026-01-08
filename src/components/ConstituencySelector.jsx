import { useState, useRef, useEffect, useMemo } from "react";
import "./ConstituencySelector.css";

function ConstituencySelector({
  constituencies,
  selectedConstituency,
  onConstituencySelect,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Filter constituencies based on search
  const filteredConstituencies = useMemo(() => {
    if (!searchQuery.trim()) {
      return constituencies.slice(0, 15);
    }
    const query = searchQuery.toLowerCase();
    return constituencies
      .filter((c) => c.name.toLowerCase().includes(query))
      .slice(0, 15);
  }, [constituencies, searchQuery]);

  const handleSelect = (constituency) => {
    onConstituencySelect(constituency);
    setIsExpanded(false);
    setSearchQuery("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsExpanded(false);
    }
  };

  return (
    <div className="constituency-selector" ref={dropdownRef}>
      <button
        className="constituency-selector-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label="Select constituency"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="constituency-selector-label">
          {selectedConstituency ? selectedConstituency.name : "Select area"}
        </span>
        <span className="constituency-selector-icon">
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>

      {isExpanded && (
        <div className="constituency-selector-dropdown" onKeyDown={handleKeyDown}>
          <div className="constituency-search">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search constituencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="constituency-list">
            {filteredConstituencies.length === 0 ? (
              <div className="constituency-no-results">
                No constituencies found
              </div>
            ) : (
              filteredConstituencies.map((constituency) => (
                <button
                  key={constituency.code}
                  className={`constituency-item ${
                    selectedConstituency?.code === constituency.code
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleSelect(constituency)}
                >
                  {constituency.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConstituencySelector;
