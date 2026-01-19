# Folder Bulk Operations

A fullstack application built with Node.js (Express) and Vite that allows users to validate folder structures against server paths.

## Features

### Frontend (Vite)
- 📁 Input field for absolute server path
- 📂 Local folder selection using browser's file picker
- 👀 Preview of folder structure with:
  - File/folder names
  - File and directory sizes
  - Last modification dates
- 🚀 Fixed footer with "Start Changes" button
- 💫 Modal with spinner for loading states
- ✅ Success/error feedback display

### Backend (Express)
- 🔍 Endpoint to validate folder structures
- ✔️ Checks if absolute path is accessible on server
- 🔄 Compares client-side folder structure with server-side
- 📊 Returns detailed mismatch information if structures don't match

## Project Structure

```
node_folder_bulk_operations/
├── package.json           # Root package.json with scripts
├── README.md
├── client/                # Vite frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js        # Main application logic
│       └── styles.css     # Application styles
└── server/                # Express backend
    ├── package.json
    └── index.js           # Server with validation endpoint
```

## Installation

1. Install all dependencies:

```bash
npm run install:all
```

Or install each separately:

```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install
```

## Running the Application

### Development Mode

Start both server and client in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Server (runs on port 3001)
npm run dev:server

# Terminal 2 - Client (runs on port 5173)
npm run dev:client
```

### Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## API Endpoints

### POST /api/validate

Validates that an absolute path is accessible and the folder structure matches.

**Request Body:**
```json
{
  "absolutePath": "/path/to/folder",
  "folderStructure": [
    {
      "name": "file.txt",
      "isDirectory": false,
      "size": 1024,
      "lastModified": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "subfolder",
      "isDirectory": true,
      "size": 2048,
      "lastModified": "2024-01-15T10:30:00.000Z",
      "children": [...]
    }
  ]
}
```

**Success Response:**
```json
{
  "ok": true,
  "message": "Validation successful! Folder structure matches."
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Folder structure mismatch",
  "details": [
    {
      "type": "missing_on_server",
      "path": "file.txt",
      "message": "File/folder \"file.txt\" exists in uploaded structure but not on server"
    }
  ]
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Usage

1. Enter the absolute path of the folder on the server you want to validate against
2. Click "Select Folder" to choose a local folder from your computer
3. Review the folder preview showing all files and directories with their sizes and dates
4. Click "Start Changes" to validate that the selected folder matches the server path
5. View the result in the modal:
   - ✅ Success if structures match
   - ❌ Error with details if there's a mismatch

## Technical Notes

- The folder comparison checks:
  - File and folder names
  - Whether items are files or directories
  - Nested folder structures
- Size and date mismatches are not considered errors (only structure is validated)
- The server uses `fs/promises` for async file system operations
- The client uses the `webkitdirectory` attribute for folder selection

## Browser Support

The folder selection feature requires a browser that supports the `webkitdirectory` attribute:
- Chrome 49+
- Edge 14+
- Firefox 50+
- Opera 43+
- Safari 11.1+

## License

MIT
