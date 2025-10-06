from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from videochat_api.config import settings
from videochat_api.models import AuthSession, Device, DeviceKind, SessionKind, User


@dataclass(slots=True)
class DeviceInfo:
    kind: DeviceKind
    identifier: str | None
    display_name: str | None


@dataclass(slots=True)
class WebSessionTokens:
    session_cookie: str
    csrf_token: str
    expires_at: datetime
    session: AuthSession


@dataclass(slots=True)
class DesktopSessionTokens:
    access_token: str
    refresh_token: str
    access_expires_at: datetime
    refresh_expires_at: datetime
    device_identifier: str
    session: AuthSession


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SessionService:
    def __init__(self) -> None:
        self.jwt_algorithm = settings.jwt_algorithm
        self.jwt_secret = settings.jwt_secret
        self.clock_skew = settings.jwt_clock_skew_seconds

    @staticmethod
    def _hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    async def _ensure_device(
        self,
        db: AsyncSession,
        user: User,
        info: DeviceInfo,
        user_agent: str | None,
    ) -> Device:
        identifier = info.identifier or secrets.token_urlsafe(12)
        result = await db.execute(
            select(Device).where(Device.user_id == user.id, Device.identifier == identifier)
        )
        device = result.scalar_one_or_none()
        if device is None:
            device = Device(
                user_id=user.id,
                identifier=identifier,
                kind=info.kind,
                display_name=info.display_name,
                user_agent=user_agent,
                last_seen_at=_now(),
            )
            db.add(device)
            await db.flush()
        else:
            device.kind = info.kind
            device.display_name = info.display_name
            device.user_agent = user_agent
            device.last_seen_at = _now()
            device.revoked_at = None
        return device

    async def create_web_session(
        self,
        db: AsyncSession,
        user: User,
        ip_address: str | None,
        user_agent: str | None,
    ) -> WebSessionTokens:
        session_token = secrets.token_urlsafe(48)
        csrf_token = secrets.token_urlsafe(32)
        expires_at = _now() + timedelta(seconds=settings.session_max_age_seconds)

        session = AuthSession(
            user_id=user.id,
            kind=SessionKind.WEB,
            session_token_hash=self._hash_token(session_token),
            csrf_token=csrf_token,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(session)
        await db.flush()
        return WebSessionTokens(
            session_cookie=session_token,
            csrf_token=csrf_token,
            expires_at=expires_at,
            session=session,
        )

    async def create_device_session(
        self,
        db: AsyncSession,
        user: User,
        device_info: DeviceInfo,
        ip_address: str | None,
        user_agent: str | None,
    ) -> DesktopSessionTokens:
        session_kind = SessionKind(device_info.kind.value)
        device = await self._ensure_device(db, user, device_info, user_agent)

        refresh_token = secrets.token_urlsafe(48)
        refresh_hash = self._hash_token(refresh_token)
        refresh_expires_at = _now() + timedelta(seconds=settings.refresh_token_ttl_seconds)

        session = AuthSession(
            user_id=user.id,
            device_id=device.id,
            kind=session_kind,
            refresh_token_hash=refresh_hash,
            refresh_token_expires_at=refresh_expires_at,
            expires_at=refresh_expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(session)
        await db.flush()

        device.refresh_token_hash = refresh_hash
        device.refresh_token_expires_at = refresh_expires_at
        device.last_seen_at = _now()
        device.revoked_at = None

        access_expires_at = _now() + timedelta(seconds=settings.access_token_ttl_seconds)
        access_token = self._encode_access_token(session, access_expires_at)

        return DesktopSessionTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            access_expires_at=access_expires_at,
            refresh_expires_at=refresh_expires_at,
            device_identifier=device.identifier,
            session=session,
        )

    def _encode_access_token(self, session: AuthSession, expires_at: datetime) -> str:
        now = _now()
        payload = {
            "sub": str(session.user_id),
            "sid": session.id,
            "typ": session.kind.value,
            "iat": int(now.timestamp()),
            "nbf": int((now - timedelta(seconds=self.clock_skew)).timestamp()),
            "exp": int(expires_at.timestamp()),
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    async def get_session_by_cookie(
        self,
        db: AsyncSession,
        raw_cookie: str,
    ) -> AuthSession | None:
        token_hash = self._hash_token(raw_cookie)
        result = await db.execute(
            select(AuthSession).where(
                AuthSession.session_token_hash == token_hash,
                AuthSession.kind == SessionKind.WEB,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            return None
        if session.revoked_at:
            return None
        if session.expires_at and session.expires_at < _now():
            return None
        return session

    async def get_session_by_refresh(
        self,
        db: AsyncSession,
        refresh_token: str,
    ) -> AuthSession | None:
        token_hash = self._hash_token(refresh_token)
        result = await db.execute(
            select(AuthSession).where(
                AuthSession.refresh_token_hash == token_hash,
                AuthSession.kind.in_([SessionKind.DESKTOP, SessionKind.TAURI]),
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            return None
        if session.revoked_at:
            return None
        if session.refresh_token_expires_at and session.refresh_token_expires_at < _now():
            return None
        return session

    def decode_access_token(self, token: str) -> dict[str, str | int] | None:
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm],
                options={"require": ["exp", "iat", "sid", "sub"]},
                leeway=self.clock_skew,
            )
        except jwt.PyJWTError:
            return None
        return payload

    async def rotate_refresh_token(
        self,
        db: AsyncSession,
        session: AuthSession,
    ) -> DesktopSessionTokens:
        if session.kind not in {SessionKind.DESKTOP, SessionKind.TAURI}:
            raise ValueError("Refresh rotation only allowed for desktop sessions")

        refresh_token = secrets.token_urlsafe(48)
        refresh_hash = self._hash_token(refresh_token)
        refresh_expires_at = _now() + timedelta(seconds=settings.refresh_token_ttl_seconds)
        session.refresh_token_hash = refresh_hash
        session.refresh_token_expires_at = refresh_expires_at
        session.expires_at = refresh_expires_at
        session.last_seen_at = _now()

        device_identifier = ""
        if session.device_id is not None:
            await db.execute(
                update(Device)
                .where(Device.id == session.device_id)
                .values(
                    refresh_token_hash=refresh_hash,
                    refresh_token_expires_at=refresh_expires_at,
                    last_seen_at=_now(),
                    revoked_at=None,
                )
            )
            result = await db.execute(select(Device.identifier).where(Device.id == session.device_id))
            device_identifier = result.scalar_one_or_none() or ""

        access_expires_at = _now() + timedelta(seconds=settings.access_token_ttl_seconds)
        access_token = self._encode_access_token(session, access_expires_at)

        await db.flush()
        return DesktopSessionTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            access_expires_at=access_expires_at,
            refresh_expires_at=refresh_expires_at,
            device_identifier=device_identifier,
            session=session,
        )

    async def revoke_session(self, db: AsyncSession, session: AuthSession) -> None:
        if session.revoked_at:
            return
        session.revoked_at = _now()
        session.session_token_hash = None
        session.refresh_token_hash = None
        session.csrf_token = None
        await db.flush()

        if session.device_id is not None:
            await db.execute(
                update(Device)
                .where(Device.id == session.device_id)
                .values(refresh_token_hash=None, refresh_token_expires_at=None, revoked_at=_now())
            )

    def touch(self, session: AuthSession) -> None:
        session.last_seen_at = _now()

    async def revoke_user_sessions(self, db: AsyncSession, user_id: int) -> None:
        await db.execute(
            update(AuthSession)
            .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
            .values(
                revoked_at=_now(),
                refresh_token_hash=None,
                session_token_hash=None,
                csrf_token=None,
            )
        )
        await db.execute(
            update(Device)
            .where(Device.user_id == user_id)
            .values(
                refresh_token_hash=None,
                refresh_token_expires_at=None,
                revoked_at=_now(),
            )
        )


session_manager = SessionService()
