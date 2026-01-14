# Folder Validator - Fullstack Application

A fullstack application with a Node.js backend and React.js frontend for validating folder contents.

## Features

### Frontend (React.js)
1. **Absolute Path Input** - Set the absolute path to a folder for validation
2. **Folder Selection** - Select a folder using the browser's folder picker to get directory information
3. **File Information Display** - Shows file/folder name, size, type, and last modified date
4. **Submit Form** - Send folder data to the backend for validation
5. **Modal with Loading Spinner** - Shows loading state during validation, then displays success or error messages

### Backend (Node.js + Express)
- Validates the absolute path is valid and points to an existing folder
- Checks read permissions on the folder
- Validates all items from the frontend exist in the specified folder
- Returns detailed error messages if validation fails

## Project Structure

```
new-project-eval/
├── backend/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       └── components/
│           └── Modal.jsx
└── README.md
```

## Setup & Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
npm start
```

The backend will run on `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Enter Absolute Path**: Type the full path to a folder on your system (e.g., `/Users/username/Documents/my-folder`)

2. **Select Folder**: Click "Select Folder" to open the folder picker and select the folder whose contents you want to validate

3. **Review Contents**: The application will display all files and folders found in the selected directory with details

4. **Submit**: Click the submit button to send the data to the backend for validation

5. **View Results**: A modal will appear showing:
   - A loading spinner while processing
   - Success message if all items are validated
   - Error details if validation fails

## API Endpoints

### POST `/api/validate-folder`

Validates folder contents.

**Request Body:**
```json
{
  "absolutePath": "/path/to/folder",
  "folderData": [
    {
      "name": "file.txt",
      "size": 1024,
      "type": "file",
      "lastModified": 1699999999999
    }
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "All items validated successfully",
  "validatedItems": [...],
  "totalItems": 5
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": ["Item not found: missing-file.txt"]
}
```

### GET `/api/health`

Health check endpoint.

## Tech Stack

- **Frontend**: React 18, Vite
- **Backend**: Node.js, Express
- **Styling**: Pure CSS
