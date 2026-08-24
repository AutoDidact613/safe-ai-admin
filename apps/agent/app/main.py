from fastapi import FastAPI

app = FastAPI(title="foo-agent")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/run")
def run(payload: dict) -> dict:
    return {"received": payload, "result": "bar"}
