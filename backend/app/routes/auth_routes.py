import secrets
from datetime import timedelta, datetime, timezone
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from app.config import settings

router = APIRouter()


@router.get("/api/auth/me")
def me(request: Request):
    """Return current user info (MVP) based on cookies set after OAuth.

    NOTE: For production, replace with a DB-backed session lookup.
    """
    user_email = request.cookies.get("fe524_user")
    user_name = request.cookies.get("fe524_name")
    session = request.cookies.get(settings.SESSION_COOKIE_NAME)

    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Prefer showing the email as the identifier for now.
    display_name = user_name or (
        user_email.split("@")[0] if user_email and "@" in user_email else (user_email or "User")
    )

    return {
        "email": user_email,
        "name": display_name,
    }


@router.post("/api/auth/logout")
def logout():
    """Clear auth cookies."""
    resp = RedirectResponse(url=settings.FRONTEND_URL, status_code=303)
    resp.delete_cookie(settings.SESSION_COOKIE_NAME)
    resp.delete_cookie("fe524_user")
    resp.delete_cookie("fe524_name")
    resp.delete_cookie("oauth_state")
    return resp


def _require_google_config() -> None:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail=(
                "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend env (.env). "
                "If you used setup.sh, edit backend/.env."
            ),
        )


@router.get("/auth/google")
def google_login(request: Request):
    """Redirect user to Google's OAuth consent screen."""
    _require_google_config()

    state = secrets.token_urlsafe(24)

    # Store state in a short-lived cookie to validate callback.
    redirect = RedirectResponse(
        url=(
            "https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id={settings.GOOGLE_CLIENT_ID}"
            f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
            "&response_type=code"
            "&scope=openid%20email%20profile"
            f"&state={state}"
            "&access_type=offline"
            "&prompt=consent"
        )
    )
    redirect.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=False,
        samesite="lax",
    # Use an aware UTC datetime to keep Starlette happy when formatting expires.
    expires=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    return redirect


@router.get("/auth/google/callback")
def google_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None):
    """Handle Google OAuth callback: exchange code -> fetch profile -> set session cookie."""
    _require_google_config()

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code/state")

    expected_state = request.cookies.get("oauth_state")
    if not expected_state or expected_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=20,
    )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_resp.text}")

    token_json = token_resp.json()
    access_token = token_json.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access_token returned")

    userinfo_resp = requests.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20,
    )

    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch user profile: {userinfo_resp.text}")

    profile = userinfo_resp.json()
    # Minimal session payload for MVP
    session_value = secrets.token_urlsafe(32)

    # TODO: persist session -> user in DB. For now, cookie-only "logged in" state.
    resp = RedirectResponse(url=f"{settings.FRONTEND_URL}/onboarding")

    # Starlette's delete_cookie doesn't accept max_age; it sets an expires value internally.
    # Because we set oauth_state with a proper UTC expires, deleting it is safe.
    resp.delete_cookie("oauth_state")
    resp.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_value,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )

    # Helpful non-sensitive info for UI/debug. Safe-ish, but still keep minimal.
    resp.set_cookie(
        key="fe524_user",
        value=(profile.get("email") or "user"),
        httponly=False,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )

    resp.set_cookie(
        key="fe524_name",
        value=(profile.get("name") or profile.get("given_name") or "User"),
        httponly=False,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )

    return resp
