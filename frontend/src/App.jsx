import React, { useState } from "react";
import Modal from "./components/Modal";

function App() {
  const [absolutePath, setAbsolutePath] = useState("");
  const [folderData, setFolderData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState("loading");
  const [modalResponse, setModalResponse] = useState(null);

  // Handle folder selection using webkitdirectory
  const handleFolderSelect = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const items = [];
    const seenNames = new Set();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Get the relative path and extract the top-level item name
      const relativePath = file.webkitRelativePath;
      const pathParts = relativePath.split("/");

      // Skip the root folder name (first part)
      if (pathParts.length > 1) {
        const itemName = pathParts[1];

        if (!seenNames.has(itemName)) {
          seenNames.add(itemName);

          // Determine if it's a folder (has more path parts) or file
          const isFolder = pathParts.length > 2;

          if (!isFolder) {
            // It's a file directly in the selected folder
            items.push({
              name: file.name,
              size: file.size,
              type: "file",
              lastModified: file.lastModified,
            });
          } else {
            // It's a folder - add it if we haven't already
            items.push({
              name: itemName,
              size: 0,
              type: "folder",
              lastModified: Date.now(),
            });
          }
        }
      }
    }

    setFolderData(items);
  };

  // Format file size for display
  const formatSize = (bytes) => {
    if (bytes === 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString();
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!absolutePath.trim()) {
      alert("Please enter an absolute path");
      return;
    }

    if (folderData.length === 0) {
      alert("Please select a folder first");
      return;
    }

    setShowModal(true);
    setModalStatus("loading");
    setModalResponse(null);

    try {
      const response = await fetch("/api/validate-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          absolutePath: absolutePath.trim(),
          folderData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setModalStatus("success");
        setModalResponse(data);
      } else {
        setModalStatus("error");
        setModalResponse(data);
      }
    } catch (error) {
      setModalStatus("error");
      setModalResponse({
        error: "Network error",
        details: [error.message],
      });
    }
  };

  // Close modal
  const handleCloseModal = () => {
    if (modalStatus !== "loading") {
      setShowModal(false);
    }
  };

  return (
    <div className="container">
      <h1>📁 Folder Validator</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="absolutePath">Absolute Path</label>
          <input
            type="text"
            id="absolutePath"
            value={absolutePath}
            onChange={(e) => setAbsolutePath(e.target.value)}
            placeholder="e.g., /Users/username/Documents/my-folder"
          />
        </div>

        <div className="form-group">
          <label>Select Folder</label>
          <div className="folder-input-wrapper">
            <input
              type="file"
              id="folderInput"
              webkitdirectory=""
              directory=""
              onChange={handleFolderSelect}
            />
            <button
              type="button"
              className="folder-select-btn"
              onClick={() => document.getElementById("folderInput").click()}
            >
              📂 Select Folder
            </button>
          </div>
        </div>

        {folderData.length > 0 && (
          <div className="file-list">
            <div className="file-list-header">
              <span>Name</span>
              <span>Size</span>
              <span>Type</span>
              <span>Last Modified</span>
            </div>
            {folderData.map((item, index) => (
              <div key={index} className="file-list-item">
                <div className="file-name">
                  <span className="file-icon">
                    {item.type === "folder" ? "📁" : "📄"}
                  </span>
                  <span>{item.name}</span>
                </div>
                <span>{formatSize(item.size)}</span>
                <span>{item.type}</span>
                <span>{formatDate(item.lastModified)}</span>
              </div>
            ))}
          </div>
        )}

        {folderData.length === 0 && (
          <div className="empty-state">
            <p>No folder selected. Click "Select Folder" to choose a folder.</p>
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={!absolutePath.trim() || folderData.length === 0}
        >
          Validate Folder
        </button>
      </form>

      {showModal && (
        <Modal
          status={modalStatus}
          response={modalResponse}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default App;
