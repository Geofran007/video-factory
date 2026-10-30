"""Pruebas del módulo de IA con un cliente simulado (no se hacen llamadas reales ni se gasta dinero)."""

from types import SimpleNamespace

import pytest

from video_factory.ai import prompts
from video_factory.ai.claude_provider import ClaudeProvider
from video_factory.ai.content_generator import ContentGenerator
from video_factory.ai.topic_registry import find_duplicate, similarity
from video_factory.core.errors import BudgetExceededError, ContentGenerationError
from video_factory.core.interfaces import LLMResult, LLMUsage
from video_factory.core.models import VideoContent

LLM_CFG = {
    "model": "claude-sonnet-5-5", "effort": "medium", "max_tokens": 1000,
    "pricing_usd": {"claude-sonnet-5-5": {"input_per_mtok": 2.0, "output_per_mtok": 10.0, "cache_read_per_mtok": 0.1},
                    "web_search_per_request": 0.01},
}


def usage(inp=1000, out=500, searches=0):
    return SimpleNamespace(input_tokens=inp, output_tokens=out, cache_read_input_tokens=0,
                           cache_creation_input_tokens=0, server_tool_use=SimpleNamespace(web_search_requests=searches))


class FakeMessages:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def _next(self, **kwargs):
        self.calls.append(kwargs)
        return self.responses.pop(0)

    parse = create = _next


def provider(responses, **kw):
    msgs = FakeMessages(responses)
    client = SimpleNamespace(beta=SimpleNamespace(messages=msgs))
    return ClaudeProvider(LLM_CFG, client=client, **kw), msgs


def test_cost_is_computed_from_usage(example_content):
    resp = SimpleNamespace(stop_reason="end_turn", usage=usage(10_000, 2_000), parsed_output=example_content, content=[])
    prov, msgs = provider([resp])
    result = prov.generate_structured(system="s", prompt="p", output_model=VideoContent)
    assert result.usage.cost_usd == pytest.approx(10_000 * 2 / 1e6 + 2_000 * 10 / 1e6)
    call = msgs.calls[0]
    assert call["output_format"] is VideoContent
    assert call["output_config"] == {"effort": "medium"}
    assert call["fallbacks"] == "default"


def test_invalid_output_is_retried_then_fails():
    bad = SimpleNamespace(stop_reason="end_turn", usage=usage(), parsed_output=None, content=[])
    prov, msgs = provider([bad, bad, bad], max_retries=2)
    with pytest.raises(ContentGenerationError, match="3 intentos"):
        prov.generate_structured(system="s", prompt="p", output_model=VideoContent)
    assert len(msgs.calls) == 3
    # El reintento añade la respuesta y la corrección (historial solo de anexos).
    assert len(msgs.calls[1]["messages"]) == 3


def test_refusal_is_reported():
    resp = SimpleNamespace(stop_reason="refusal", usage=usage(), parsed_output=None, content=[],
                           stop_details=SimpleNamespace(category="cyber"))
    prov, _ = provider([resp, resp, resp])
    with pytest.raises(ContentGenerationError, match="rechazó"):
        prov.generate_structured(system="s", prompt="p", output_model=VideoContent)


def test_budget_check_blocks_calls():
    def over_budget():
        raise BudgetExceededError("agotado")

    prov, msgs = provider([], budget_check=over_budget)
    with pytest.raises(BudgetExceededError):
        prov.generate_structured(system="s", prompt="p", output_model=VideoContent)
    assert msgs.calls == []


def test_research_collects_real_urls_and_search_cost():
    text = SimpleNamespace(type="text", text="- HECHO: x | FUENTE: https://a.org/x",
                           citations=[SimpleNamespace(url="https://a.org/x", title="A", cited_text="x")])
    result_block = SimpleNamespace(type="web_search_tool_result",
                                   content=[SimpleNamespace(url="https://b.org/y", title="B")])
    resp = SimpleNamespace(stop_reason="end_turn", usage=usage(20_000, 800, searches=3), content=[result_block, text])
    prov, msgs = provider([resp])
    res = prov.research(system="s", prompt="p", max_searches=3)
    assert {c["url"] for c in res.citations} == {"https://a.org/x", "https://b.org/y"}
    assert res.usage.web_search_requests == 3
    assert res.usage.cost_usd == pytest.approx(20_000 * 2 / 1e6 + 800 * 10 / 1e6 + 0.03)
    assert msgs.calls[0]["tools"][0]["type"] == "web_search_20260209"


def test_prompt_rendering(tmp_path):
    (tmp_path / "x.md").write_text("# SISTEMA\nHola {{name}}\n# USUARIO\nTema: {{topic}}", "utf-8")
    system, user = prompts.load_prompt(tmp_path, "x", name="Ana", topic="pulpos")
    assert system == "Hola Ana" and user == "Tema: pulpos"
    with pytest.raises(KeyError):
        prompts.load_prompt(tmp_path, "x", name="Ana")


def test_real_prompts_have_all_placeholders(cfg):
    system, user = prompts.load_prompt(
        cfg.path("prompts"), "script-generator", topic="t", category="ciencia", duration=30, target_words=78,
        min_scenes=4, max_scenes=6, scene_guide="g", research_block="r", recent_topics="(ninguno)")
    assert "GANCHO" in user and "inventas" in system


def test_topic_similarity():
    assert similarity("Los pulpos tienen tres corazones", "¿Sabías que los pulpos tienen 3 corazones?") > 0.6
    assert find_duplicate("El pulpo tiene tres corazones", ["Los pulpos tienen tres corazones"]) is not None
    assert find_duplicate("Por qué el cielo es azul", ["Los pulpos tienen tres corazones"]) is None


class FakeLLM:
    def __init__(self, content, citations):
        self.content = content
        self.citations = citations

    def research(self, **kw):
        return LLMResult(data="notas", usage=LLMUsage(model="m", cost_usd=0.05), citations=self.citations)

    def generate_structured(self, **kw):
        return LLMResult(data=self.content, usage=LLMUsage(model="m", cost_usd=0.08))


def test_content_generator_verifies_with_research(cfg, example_content, monkeypatch):
    monkeypatch.setattr("video_factory.validation.sources.check_urls", lambda urls: {u: True for u in urls})
    llm = FakeLLM(example_content, [{"url": "https://en.wikipedia.org/wiki/Octopus"}])
    gen = ContentGenerator(llm, prompts_dir=cfg.path("prompts"), words_per_second=2.6,
                           web_search={"enabled": True, "max_uses": 3})
    out = gen.generate(topic="pulpos", category="ciencia", duration_s=40)
    assert out.cost_usd == pytest.approx(0.13)
    assert all(c.status == "verified" for c in out.content.claims)


def test_content_generator_rejects_wrong_length(cfg, example_content):
    gen = ContentGenerator(FakeLLM(example_content, []), prompts_dir=cfg.path("prompts"), words_per_second=2.6,
                           web_search={"enabled": False})
    with pytest.raises(ContentGenerationError, match="palabras"):
        gen.generate(topic="pulpos", category="ciencia", duration_s=15)
