"""
FastMCP server: proxies catalog / lead tools to Laravel `/api/service/*` using MCP_SERVICE_TOKEN.
Run from repo root after exporting env (see README).
"""

import os

import httpx
from dotenv import load_dotenv
from fastmcp import FastMCP
from starlette.responses import JSONResponse

load_dotenv()

BASE = os.environ.get("LARAVEL_API_URL", "http://127.0.0.1:8000/api").rstrip("/")
TOKEN = os.environ.get("MCP_SERVICE_TOKEN", "")

mcp = FastMCP("CRM Laravel Bridge")

@mcp.custom_route("/health", methods=["GET"])
async def health(_request):
    return JSONResponse({"ok": True})


def _headers():
    if not TOKEN:
        raise RuntimeError("MCP_SERVICE_TOKEN is not set")
    return {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}


@mcp.tool()
async def get_products(query: str, max_results: int = 8) -> str:
    """Search active products by title or code."""
    params = {"search": query, "limit": max_results}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.get(f"{BASE}/service/products", params=params, headers=_headers())
    r.raise_for_status()
    return r.text


@mcp.tool()
async def get_lead_history(lead_id: int, limit: int = 20) -> str:
    """Fetch recent interactions for a lead."""
    params = {"limit": limit}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.get(
            f"{BASE}/service/leads/{lead_id}/history",
            params=params,
            headers=_headers(),
        )
    r.raise_for_status()
    return r.text


@mcp.tool()
async def update_lead_stage(lead_id: int, funnel_stage_id: int, reason: str = "") -> str:
    """Move a lead to another funnel stage by stage id."""
    payload = {"funnel_stage_id": funnel_stage_id, "reason": reason}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.patch(
            f"{BASE}/service/leads/{lead_id}/stage",
            json=payload,
            headers=_headers(),
        )
    r.raise_for_status()
    return r.text


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8001)
