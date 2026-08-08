"""Scanner history endpoints"""

import logging
from fastapi import APIRouter, Header, HTTPException, Request
from rate_limit import limiter
from services.db_service import _lookup_profile_id, get_user_scans, get_scan_result, delete_scan_result

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scans", tags=["Scans"])


@router.get("")
@limiter.limit("120/minute")
async def list_scans(request: Request, x_user_id: str | None = Header(None, alias="X-User-Id"), limit: int = 50):
    if not x_user_id:
        return []
    profile_id = await _lookup_profile_id(x_user_id)
    if not profile_id:
        return []
    return await get_user_scans(profile_id, limit=min(limit, 100))


@router.get("/{scan_id}")
@limiter.limit("120/minute")
async def get_scan(request: Request, scan_id: str, x_user_id: str | None = Header(None, alias="X-User-Id")):
    scan = await get_scan_result(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if x_user_id:
        profile_id = await _lookup_profile_id(x_user_id)
        if profile_id and scan.get("user_id") and scan["user_id"] != profile_id:
            raise HTTPException(status_code=403, detail="Access denied")
    return scan


@router.delete("/{scan_id}")
@limiter.limit("60/minute")
async def delete_scan(request: Request, scan_id: str, x_user_id: str | None = Header(None, alias="X-User-Id")):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    profile_id = await _lookup_profile_id(x_user_id)
    if not profile_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    scan = await get_scan_result(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.get("user_id") and scan["user_id"] != profile_id:
        raise HTTPException(status_code=403, detail="Access denied")
    ok = await delete_scan_result(scan_id, profile_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete scan")
    return {"ok": True}
