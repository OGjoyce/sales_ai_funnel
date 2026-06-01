"""
FastMCP server: proxies catalog / lead tools to Laravel `/api/service/*` using MCP_SERVICE_TOKEN.
Run from repo root after exporting env (see README).

Personal trained agents must pass `user_id` on every tool call; Laravel scopes products/leads to that user.
Shared agents: Lina (creates user-tagged leads via CRM), Fernando (landing sales, no CRM rows), Invoker (admin).
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


def _headers(user_id: int) -> dict[str, str]:
    if not TOKEN:
        raise RuntimeError("MCP_SERVICE_TOKEN is not set")
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/json",
        "X-Velora-User-Id": str(user_id),
    }


@mcp.tool()
async def get_products(user_id: int, query: str, max_results: int = 8) -> str:
    """Search active products by title or code for a Velora user."""
    params = {"search": query, "limit": max_results, "user_id": user_id}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.get(
            f"{BASE}/service/products",
            params=params,
            headers=_headers(user_id),
        )
    r.raise_for_status()
    return r.text


@mcp.tool()
async def get_lead_history(user_id: int, lead_id: int, limit: int = 20) -> str:
    """Fetch recent interactions for a lead owned by the user."""
    params = {"limit": limit, "user_id": user_id}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.get(
            f"{BASE}/service/leads/{lead_id}/history",
            params=params,
            headers=_headers(user_id),
        )
    r.raise_for_status()
    return r.text


@mcp.tool()
async def update_lead_stage(
    user_id: int,
    lead_id: int,
    funnel_stage_id: int,
    reason: str = "",
) -> str:
    """Move a user's lead to another funnel stage by stage id."""
    payload = {"funnel_stage_id": funnel_stage_id, "reason": reason}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.patch(
            f"{BASE}/service/leads/{lead_id}/stage",
            json=payload,
            headers=_headers(user_id),
        )
    r.raise_for_status()
    return r.text


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8001)
