# AdaptIQ — AI-Powered Personalized Study Assistant

AdaptIQ is a full-stack web application for adaptive learning. It evaluates student quiz performance via machine learning, provides personalized recommendations, enables collaborative note-sharing, and supports real-time document co-editing.

## Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL
- Redis

## Setup Instructions (Native)

### 1. Database Setup
Create a PostgreSQL database named `adaptiq`:
```bash
createdb adaptiq
```
*(Ensure Redis is running locally on port 6379)*

### 2. Backend Setup
Navigate to the `backend` directory and create a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
```

Run the seed script to apply the schema and seed data:
```bash
python seed.py
```

Train the ML recommendation model:
```bash
python ../ml/train_recommender.py
```

Start the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
Navigate to the `frontend` directory in a new terminal:
```bash
npm install
npm run dev
```

Visit `http://localhost:5173` to view the application.
