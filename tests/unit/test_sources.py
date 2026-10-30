from video_factory.validation.sources import verify_claims

URL = "https://en.wikipedia.org/wiki/Octopus"


def test_without_research_everything_needs_review(example_content):
    verify_claims(example_content, researched_urls=None, reachable={URL: True})
    assert all(c.status == "needs_review" for c in example_content.claims)
    assert "verificación manual" in example_content.claims[0].review_note


def test_verified_only_with_research_reachable_and_high_confidence(example_content):
    example_content.claims[1].confidence = "media"
    verify_claims(example_content, researched_urls={"https://www.en.wikipedia.org/wiki/Octopus/"}, reachable={URL: True})
    statuses = [c.status for c in example_content.claims]
    assert statuses == ["verified", "needs_review", "verified", "verified"]
    assert "confianza media" in example_content.claims[1].review_note


def test_unreachable_or_unlisted_urls_need_review(example_content):
    example_content.claims[0].source_urls = ["https://inventado.example/x"]
    verify_claims(example_content, researched_urls={URL}, reachable={URL: False, "https://inventado.example/x": True})
    assert example_content.claims[0].status == "needs_review"
    assert "no listada" in example_content.claims[0].review_note
    assert "no accesible" in example_content.claims[2].review_note


def test_url_not_from_search_needs_review(example_content):
    verify_claims(example_content, researched_urls={"https://otro.org/a"}, reachable={URL: True})
    assert all("no proviene de la búsqueda" in c.review_note for c in example_content.claims)
