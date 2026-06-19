"""Optional Supabase persistence for sessions and user level tracking.

The app works fully without Supabase configured. When SUPABASE_URL and
SUPABASE_SERVICE_KEY are set, completed sessions and level updates are stored.
"""
from typing import Optional

from config import settings

_client = None


def get_client():
    global _client
    if not settings.supabase_enabled:
        return None
    if _client is None:
        from supabase import create_client

        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client


def save_session(
    user_id: Optional[str],
    scenario: str,
    level: str,
    score: int,
    level_estimate: str,
    summary: str,
    mistakes: list,
    messages: list,
) -> Optional[dict]:
    """Persist a finished practice session. Returns the inserted row or None."""
    client = get_client()
    if client is None:
        return None
    try:
        row = {
            "user_id": user_id,
            "scenario": scenario,
            "level": level,
            "score": score,
            "level_estimate": level_estimate,
            "summary": summary,
            "mistakes": mistakes,
            "transcript": messages,
        }
        res = client.table("sessions").insert(row).execute()
        if user_id:
            _update_user_level(client, user_id, level_estimate)
        return res.data[0] if res.data else None
    except Exception as exc:  # noqa: BLE001 - persistence is best-effort
        print(f"[supabase] save_session failed: {exc}")
        return None


def _update_user_level(client, user_id: str, level_estimate: str) -> None:
    try:
        client.table("profiles").upsert(
            {"id": user_id, "level": level_estimate},
            on_conflict="id",
        ).execute()
    except Exception as exc:  # noqa: BLE001
        print(f"[supabase] update level failed: {exc}")


def get_user_level(user_id: str) -> Optional[str]:
    client = get_client()
    if client is None:
        return None
    try:
        res = client.table("profiles").select("level").eq("id", user_id).limit(1).execute()
        if res.data:
            return res.data[0].get("level")
    except Exception as exc:  # noqa: BLE001
        print(f"[supabase] get_user_level failed: {exc}")
    return None
