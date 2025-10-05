# SIGNALING & WEBRTC TODO

## ICE/Servers

- STUN: свой (и/или публичные).
- TURN: coturn с long-term credentials, выдача краткоживущих пар через API.
- Порты: 3478/UDP, TCP fallback, прод — TLS на 443 (ALPN h2/http1.1).

## Сигналинг через socket.io

- Простая маршрутизация: пользовательские personal-каналы (`user:{id}`), комнатные (`room:{id}`).
- События звонка (см. API SPEC) + пересылка SDP/ICE.

## Топология

- Mesh P2P для 1:1 и малых групп (до ~4–6). Дальнейший план — SFU.

## Безопасность

- Авторизованный сокет (cookie/JWT).
- Валидация payload (zod на клиенте, Pydantic на сервере).
- Ограничение размеров сообщений, rate‑limit по WS (basic).
