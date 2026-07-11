from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, chat, session
from config import settings

app = FastAPI(
    title="TableTalk API",
    description="Chat with your data. No SQL required.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(session.router)


@app.get("/")
async def root():
    return {"message": "TableTalk API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
