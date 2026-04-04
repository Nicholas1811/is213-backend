JMS - Just Meal Savers

Backend code for IS213, G3, T06
(Note: Atomic services start with lowercase, composite services start with uppercase.)
Frontend: http://localhost:5173
Backend: http://localhost:8000

⸻

🚀 Frontend Setup
	1.	Navigate to the frontend folder:
cd frontend
	2.	Ensure your .env file is placed in the root of the frontend folder.
	3.	Install dependencies (if not already installed):
npm install
	4.	Run the frontend:
npm run dev

⸻

🐳 Backend Setup
	1.	Open Docker:
open -a Docker
	2.	Start all backend services:
docker compose up –build

⸻

⚠️ Troubleshooting
	•	If services are not working properly:
	•	Open the Docker Desktop UI
	•	Try restarting individual services or the entire compose stack
	•	Common issues:
	•	Containers not starting → restart Docker
	•	Services failing → check logs in Docker UI

⸻

📌 Notes
	•	Ensure all required environment variables are configured before running
	•	Backend services are managed entirely via Docker
	•	Frontend runs separately using Vite (npm run dev)
