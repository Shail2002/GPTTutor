import re
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

import requests

from app.config import settings

router = APIRouter(prefix="/api/calls", tags=["calls"])


class OutboundCallRequest(BaseModel):
    phone_number: str
    course_slug: Optional[str] = None


@router.post("/outbound")
def request_outbound_call(payload: OutboundCallRequest, request: Request):
    """Request an outbound 'live call' to the user's phone number.

    This is intentionally a thin server-side integration point.
    Wire this to your call provider (Twilio/Vapi/ElevenLabs Conversational, etc.).
    """
    session = request.cookies.get("fe524_session")
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    phone = payload.phone_number.strip()
    # Minimal sanity check (E.164-ish): allow +, digits, spaces, -, (),.
    if not re.fullmatch(r"[+0-9().\-\s]{7,}", phone):
        raise HTTPException(status_code=400, detail="Invalid phone number")

    api_key = (settings.VAPI_API_KEY or "").strip()
    assistant_id = (settings.VAPI_ASSISTANT_ID or "").strip()
    phone_number_id = (settings.VAPI_PHONE_NUMBER_ID or "").strip()
    from_number = (settings.VAPI_FROM_NUMBER or "").strip()

    if not api_key:
        return {
            "status": "queued",
            "provider": "stub",
            "message": "Call queued (Vapi not configured yet).",
        }
    if not assistant_id:
        return {
            "status": "queued",
            "provider": "stub",
            "message": "Call queued (Vapi not configured yet).",
        }
    if not phone_number_id and not from_number:
        return {
            "status": "queued",
            "provider": "stub",
            "message": "Call queued (Vapi not configured yet).",
        }

    try:
        # Vapi Create Call: https://docs.vapi.ai/api-reference/calls/create-call
        body: dict = {
            "type": "outboundPhoneCall",
            "assistantId": assistant_id,
            "customer": {
                "number": phone,
            },
            # Attach course context to the call for later routing/analytics.
            "metadata": {
                "course_slug": payload.course_slug or "",
            },
        }

        if phone_number_id:
            body["phoneNumberId"] = phone_number_id
        else:
            body["from"] = from_number

        resp = requests.post(
            "https://api.vapi.ai/call",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=30,
        )

        if resp.status_code >= 400:
            raise HTTPException(status_code=400, detail=f"Vapi error ({resp.status_code}): {resp.text}")

        call = resp.json()
        return {
            "id": call.get("id"),
            "status": call.get("status"),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to request call: {exc}")
