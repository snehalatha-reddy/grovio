# Grovio Notes - Multi-User Markdown Studio 

A feature-rich, full-stack Markdown studio built with **React**, **Node.js**, and **SQLite**. It offers a premium "Word-style" document experience with multi-user authentication, real-time preview, and automatic version history.


---

## Features
- **User Authentication**: Secure JWT-based Login/Signup with hashed passwords.
- **Version History**: Automatically tracks every edit; browse and restore past versions.
- **Professional Editor**: Side-by-side editing with a "Notebook" (lined paper) mode.
- **Smart Search**: Full-text search across note titles, contents, and category tags.
- **Debounced Auto-Save**: Saves only when you stop typing to optimize performance.
- **Multi-Format Downloads**: Save your work as professional `.doc` files.
- **Global Themes**: State-of-the-art Dark and Light mode support.

---

##  Setup & Installation

Follow these steps to set up the project locally on your machine.

### 1. Prerequisites
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher

### 2. Install Project Dependencies
The application is split into `frontend` and `backend`. You must install dependencies for both.

```bash
# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 3. Configure Environment Variables
Create a file named `.env` inside the `backend/` directory to manage your security keys.

```env
# backend/.env (Optional - default used if omitted)
PORT=5000
JWT_SECRET=your_super_secret_key_123
```

### 4. Database Migrations & Initial Setup
This project uses **SQLite3**. There is no need to manually run complex SQL scripts.

- **Initialization**: Simply running the backend server for the first time will create the `notes.db` file automatically.
- **Automatic Migrations**: The server includes a built-in "Schema Doctor". If you have an existing database from an older version, the server will detect missing columns (`user_id`, `tags`) and **automatically migrate** your schema without deleting any notes.

### 5. Running the Application Locally

To run the full-stack app, you need to start **two** terminal processes:

**Action 1: Start the Backend (API Server)**
```bash
cd backend
npm start
```
*Port: `http://localhost:5000`*

**Action 2: Start the Frontend (Vite Dev Server)**
```bash
cd frontend
npm run dev
```
*Port: `http://localhost:5173` (unless specified otherwise by Vite)*

---

##  Repository Structure
```bash
├── backend/
│   ├── server.js    # Express logic, JWT controllers & Schema Migrations
│   ├── notes.db     # SQLite database (Stores users, notes, and history)
│   └── package.json
├── frontend/
│   ├── src/        # React source code (api.js, App.jsx, App.css)
│   ├── public/     # Static assets (Favicon, logos)
│   └── index.html  # Main UI Entry point
└── README.md       # Full project documentation
```
## Live Demo
https://grovio-rose.vercel.app/
---

