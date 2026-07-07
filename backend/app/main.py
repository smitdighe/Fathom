from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes

app = FastAPI(title="Fathom")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://fathom-dev.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(routes.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
