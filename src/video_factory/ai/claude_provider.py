"""Proveedor de Claude mediante el SDK oficial de Anthropic.

Implementa la interfaz LLMProvider. Controla costos: calcula el costo de cada llamada
con los precios de config/providers.json, verifica el presupuesto diario antes de llamar
y limita los reintentos.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

import anthropic
from pydantic import ValidationError as PydanticValidationError

from ..core.errors import BudgetExceededError, ConfigurationError, ContentGenerationError
from ..core.interfaces import LLMResult, LLMUsage, T

log = logging.getLogger("video_factory.ai.claude")

# Modelos que admiten el fallback de rechazo del lado del servidor (`fallbacks: "default"`).
_FALLBACK_MODELS = {"claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"}
_FALLBACK_BETA = "server-side-fallback-2026-07-01"
_MAX_PAUSE_CONTINUATIONS = 3


class ClaudeProvider:
    def __init__(
        self,
        llm_config: dict[str, Any],
        *,
        max_retries: int = 2,
        budget_check: Callable[[], None] | None = None,
        client: Any | None = None,
    ):
        self.cfg = llm_config
        self.model: str = llm_config["model"]
        self.max_retries = max_retries
        self._budget_check = budget_check or (lambda: None)
        if client is not None:
            self.client = client
        else:
            try:
                self.client = anthropic.Anthropic(timeout=float(llm_config.get("timeout_s", 300)), max_retries=2)
            except anthropic.AnthropicError as exc:  # credenciales ausentes
                raise ConfigurationError(
                    "No hay credenciales de Anthropic. Define ANTHROPIC_API_KEY en .env"
                ) from exc

    # ------------------------------------------------------------------ costos

    def _price(self) -> dict[str, float]:
        prices = self.cfg.get("pricing_usd", {})
        if self.model not in prices:
            log.warning("Sin precio configurado para %s; el costo se registrará como 0", self.model)
            return {"input_per_mtok": 0.0, "output_per_mtok": 0.0, "cache_read_per_mtok": 0.0}
        return prices[self.model]

    def _usage_from(self, response: Any) -> LLMUsage:
        u = response.usage
        p = self._price()
        inp = int(getattr(u, "input_tokens", 0) or 0)
        out = int(getattr(u, "output_tokens", 0) or 0)
        cache_read = int(getattr(u, "cache_read_input_tokens", 0) or 0)
        cache_write = int(getattr(u, "cache_creation_input_tokens", 0) or 0)
        stu = getattr(u, "server_tool_use", None)
        searches = int(getattr(stu, "web_search_requests", 0) or 0) if stu else 0
        cost = (
            inp * p["input_per_mtok"]
            + cache_write * p["input_per_mtok"] * 1.25
            + cache_read * p.get("cache_read_per_mtok", 0.0)
            + out * p["output_per_mtok"]
        ) / 1_000_000 + searches * self.cfg.get("pricing_usd", {}).get("web_search_per_request", 0.0)
        return LLMUsage(
            model=self.model,
            input_tokens=inp + cache_read + cache_write,
            output_tokens=out,
            cache_read_tokens=cache_read,
            web_search_requests=searches,
            cost_usd=round(cost, 6),
        )

    @staticmethod
    def _add(total: LLMUsage, part: LLMUsage) -> None:
        total.input_tokens += part.input_tokens
        total.output_tokens += part.output_tokens
        total.cache_read_tokens += part.cache_read_tokens
        total.web_search_requests += part.web_search_requests
        total.cost_usd = round(total.cost_usd + part.cost_usd, 6)

    # --------------------------------------------------------------- llamadas

    def _request_kwargs(self, system: str, messages: list[dict[str, Any]]) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "model": self.model,
            "max_tokens": int(self.cfg.get("max_tokens", 16000)),
            "system": system,
            "messages": messages,
            "output_config": {"effort": self.cfg.get("effort", "medium")},
        }
        if self.model in _FALLBACK_MODELS:
            kwargs["betas"] = [_FALLBACK_BETA]
            kwargs["fallbacks"] = "default"
        return kwargs

    @staticmethod
    def _check_stop(response: Any) -> None:
        if response.stop_reason == "refusal":
            details = getattr(response, "stop_details", None)
            raise ContentGenerationError(f"Claude rechazó la solicitud ({getattr(details, 'category', None)})")
        if response.stop_reason == "max_tokens":
            raise ContentGenerationError("La respuesta se cortó por max_tokens")

    def _call(self, fn: Callable[..., Any], **kwargs: Any) -> Any:
        self._budget_check()
        try:
            return fn(**kwargs)
        except anthropic.AuthenticationError as exc:
            raise ConfigurationError("ANTHROPIC_API_KEY inválida") from exc
        except anthropic.PermissionDeniedError as exc:
            raise ConfigurationError(f"La clave no tiene permisos: {exc.message}") from exc
        except anthropic.NotFoundError as exc:
            raise ConfigurationError(f"Modelo no disponible: {self.model}") from exc
        except anthropic.BadRequestError as exc:
            raise ContentGenerationError(f"Solicitud rechazada por la API: {exc.message}") from exc
        except anthropic.RateLimitError as exc:
            raise ContentGenerationError("Límite de solicitudes alcanzado; intenta más tarde") from exc
        except anthropic.APIStatusError as exc:
            raise ContentGenerationError(f"Error de la API ({exc.status_code}): {exc.message}") from exc
        except anthropic.APIConnectionError as exc:
            raise ContentGenerationError("No hay conexión con la API de Anthropic") from exc

    def research(self, *, system: str, prompt: str, max_searches: int) -> LLMResult:
        """Investiga con búsqueda web y devuelve notas en texto + citas reales de los resultados."""
        messages: list[dict[str, Any]] = [{"role": "user", "content": prompt}]
        tools = [{"type": "web_search_20260209", "name": "web_search", "max_uses": max_searches}]
        total = LLMUsage(model=self.model)
        texts: list[str] = []
        citations: dict[str, dict[str, str]] = {}
        response = None
        for _ in range(_MAX_PAUSE_CONTINUATIONS + 1):
            response = self._call(self.client.beta.messages.create, tools=tools, **self._request_kwargs(system, messages))
            self._add(total, self._usage_from(response))
            for block in response.content:
                if block.type == "text":
                    texts.append(block.text)
                    for c in getattr(block, "citations", None) or []:
                        url = getattr(c, "url", None)
                        if url:
                            citations.setdefault(url, {"url": url, "title": getattr(c, "title", "") or "",
                                                       "cited_text": getattr(c, "cited_text", "") or ""})
                elif block.type == "web_search_tool_result" and isinstance(block.content, list):
                    for r in block.content:
                        url = getattr(r, "url", None)
                        if url:
                            citations.setdefault(url, {"url": url, "title": getattr(r, "title", "") or "", "cited_text": ""})
            if response.stop_reason != "pause_turn":
                break
            # El servidor pausó un turno largo: se continúa reenviando el contenido tal cual.
            messages = [*messages, {"role": "assistant", "content": response.content}]
        assert response is not None
        self._check_stop(response)
        return LLMResult(data="".join(texts).strip(), usage=total, citations=list(citations.values()),
                         request_id=getattr(response, "_request_id", None))

    def generate_structured(self, *, system: str, prompt: str, output_model: type[T], use_web_search: bool = False) -> LLMResult:
        if use_web_search:
            raise ValueError("Usa research() para búsquedas; generate_structured no combina herramientas")
        total = LLMUsage(model=self.model)
        messages: list[dict[str, Any]] = [{"role": "user", "content": prompt}]
        last_error = ""
        for attempt in range(self.max_retries + 1):
            response = self._call(self.client.beta.messages.parse, output_format=output_model,
                                  **self._request_kwargs(system, messages))
            self._add(total, self._usage_from(response))
            try:
                self._check_stop(response)
                parsed = response.parsed_output
                if parsed is None:
                    raise ContentGenerationError("La respuesta no contiene JSON")
                # Segunda validación completa (incluye reglas de negocio de los validadores Pydantic).
                data = output_model.model_validate(parsed.model_dump())
                return LLMResult(data=data, usage=total, request_id=getattr(response, "_request_id", None))
            except (PydanticValidationError, ContentGenerationError) as exc:
                last_error = str(exc)
                log.warning("Intento %d: salida inválida: %s", attempt + 1, last_error[:300])
                if attempt == self.max_retries:
                    break
                # Historial solo de anexos: se añade la respuesta y la corrección pedida.
                messages = [
                    *messages,
                    {"role": "assistant", "content": response.content},
                    {"role": "user", "content": f"La respuesta no cumple las reglas: {last_error[:1500]}\n"
                                                "Devuelve el JSON completo corregido."},
                ]
        raise ContentGenerationError(f"Contenido inválido tras {self.max_retries + 1} intentos: {last_error[:500]}")
