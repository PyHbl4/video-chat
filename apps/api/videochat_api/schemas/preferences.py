from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BasePreferencesModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ThemePreferences(BasePreferencesModel):
    mode: Literal["system", "light", "dark"] = "system"


class SidebarPreferences(BasePreferencesModel):
    collapsed: bool = False


class AudioPreferences(BasePreferencesModel):
    mute_microphone_on_join: bool = Field(
        default=False,
        alias="muteMicrophoneOnJoin",
        serialization_alias="muteMicrophoneOnJoin",
    )


class VideoPreferences(BasePreferencesModel):
    start_with_camera: bool = Field(
        default=True,
        alias="startWithCamera",
        serialization_alias="startWithCamera",
    )
    mirror_video: bool = Field(
        default=True,
        alias="mirrorVideo",
        serialization_alias="mirrorVideo",
    )


class NotificationPreferences(BasePreferencesModel):
    play_sounds: bool = Field(
        default=True,
        alias="playSounds",
        serialization_alias="playSounds",
    )
    show_toasts: bool = Field(
        default=True,
        alias="showToasts",
        serialization_alias="showToasts",
    )


class ThemePreferencesUpdate(BasePreferencesModel):
    mode: Literal["system", "light", "dark"] | None = None


class SidebarPreferencesUpdate(BasePreferencesModel):
    collapsed: bool | None = None


class AudioPreferencesUpdate(BasePreferencesModel):
    mute_microphone_on_join: bool | None = Field(
        default=None,
        alias="muteMicrophoneOnJoin",
        serialization_alias="muteMicrophoneOnJoin",
    )


class VideoPreferencesUpdate(BasePreferencesModel):
    start_with_camera: bool | None = Field(
        default=None,
        alias="startWithCamera",
        serialization_alias="startWithCamera",
    )
    mirror_video: bool | None = Field(
        default=None,
        alias="mirrorVideo",
        serialization_alias="mirrorVideo",
    )


class NotificationPreferencesUpdate(BasePreferencesModel):
    play_sounds: bool | None = Field(
        default=None,
        alias="playSounds",
        serialization_alias="playSounds",
    )
    show_toasts: bool | None = Field(
        default=None,
        alias="showToasts",
        serialization_alias="showToasts",
    )


class UserPreferencesPayload(BasePreferencesModel):
    theme: ThemePreferences = Field(default_factory=ThemePreferences)
    sidebar: SidebarPreferences = Field(default_factory=SidebarPreferences)
    audio: AudioPreferences = Field(default_factory=AudioPreferences)
    video: VideoPreferences = Field(default_factory=VideoPreferences)
    notifications: NotificationPreferences = Field(default_factory=NotificationPreferences)


class UserPreferencesRead(UserPreferencesPayload):
    updated_at: datetime = Field(alias="updatedAt", serialization_alias="updatedAt")


class UserPreferencesUpdate(BasePreferencesModel):
    updated_at: datetime | None = Field(
        default=None, alias="updatedAt", serialization_alias="updatedAt"
    )
    theme: ThemePreferencesUpdate | None = None
    sidebar: SidebarPreferencesUpdate | None = None
    audio: AudioPreferencesUpdate | None = None
    video: VideoPreferencesUpdate | None = None
    notifications: NotificationPreferencesUpdate | None = None
