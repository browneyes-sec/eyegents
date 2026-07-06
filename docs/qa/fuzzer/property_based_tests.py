"""
Property-Based Tests for Cobalto Middleware & State

Uses Hypothesis to discover edge cases that unit tests may miss.
Run with:  python -m pytest docs/qa/fuzzer/property_based_tests.py -v --hypothesis-show-statistics

Install:   pip install hypothesis pytest
"""

from hypothesis import given, assume, strategies as st, settings
from hypothesis.strategies import SearchStrategy


# ── Strategy Definitions ────────────────────────────────────────────

@st.composite
def alert_payload_strategy(draw) -> dict:
    """Generate valid AlertPayload instances (Wazuh format)."""
    return {
        "alert_id": draw(st.text(min_size=1, max_size=64).filter(lambda x: x.strip())),
        "rule_id": draw(st.integers(min_value=100000, max_value=999999)),
        "rule_description": draw(st.text(max_size=256)),
        "alert_level": draw(st.integers(min_value=1, max_value=4)),
        "source_ip": draw(st.one_of(st.none(), st.ip_addresses().map(str))),
        "dest_ip": draw(st.one_of(st.none(), st.ip_addresses().map(str))),
        "agent_name": draw(st.text(max_size=128).filter(lambda x: x.strip() or True)),
        "timestamp": draw(st.datetimes().map(lambda dt: dt.isoformat())),
        "raw_log": draw(st.text(max_size=4096)),
    }


@st.composite
def alert_payload_v2_strategy(draw) -> dict:
    """Generate valid AlertPayload instances (FastAPI format)."""
    severity = draw(st.sampled_from(["critical", "high", "medium", "low", "info"]))
    return {
        "alert_id": draw(st.text(min_size=1, max_size=64)),
        "title": draw(st.text(min_size=1, max_size=256)),
        "severity": severity,
        "source": draw(st.text(min_size=1, max_size=128)),
        "timestamp": draw(st.datetimes().map(lambda dt: dt.isoformat())),
        "description": draw(st.text(max_size=2048)),
        "indicators": draw(st.lists(
            st.fixed_dictionaries({
                "type": st.text(max_size=32),
                "value": st.text(max_size=256),
            }),
            max_size=50,
        )),
        "affected_assets": draw(st.lists(st.text(max_size=128), max_size=20)),
        "metadata": draw(st.dictionaries(st.text(max_size=32), st.text(max_size=256), max_size=20)),
    }


@st.composite
def arbitrary_text_strategy(draw) -> str:
    """Generate arbitrary text including control chars, unicode, etc."""
    return draw(
        st.text(
            alphabet=st.characters(
                whitelist_categories=("L", "N", "P", "S", "Z"),
                blacklist_characters=("\x00",),
            ),
            min_size=0,
            max_size=500,
        )
    )


# ── Property Tests for Prompt Injection Guard ───────────────────────

class TestPromptInjectionGuardProperties:
    """Property-based tests that must hold for ALL inputs."""

    @settings(max_examples=500)
    @given(text=arbitrary_text_strategy())
    def test_sanitize_removes_control_chars(self, text):
        """After sanitize(), no control characters remain in [\x00-\x1f\x7f-\x9f]."""
        from middleware.injection_guard import PromptInjectionGuard
        
        guard = PromptInjectionGuard()
        sanitized = guard.sanitize(text)
        
        for i, ch in enumerate(sanitized):
            code = ord(ch)
            assert not (0x00 <= code <= 0x1f or code == 0x7f or 0x80 <= code <= 0x9f), \
                f"Control char U+{code:04X} at position {i}"

    @settings(max_examples=500)
    @given(text=arbitrary_text_strategy())
    def test_sanitize_length_monotonic(self, text):
        """Sanitize never produces longer output than input."""
        from middleware.injection_guard import PromptInjectionGuard
        
        guard = PromptInjectionGuard()
        sanitized = guard.sanitize(text)
        
        assert len(sanitized) <= len(text), \
            f"Sanitized {len(text)} -> {len(sanitized)} (grew!)"

    @settings(max_examples=200)
    @given(text=arbitrary_text_strategy())
    def test_sanitize_idempotent(self, text):
        """Applying sanitize twice produces the same result."""
        from middleware.injection_guard import PromptInjectionGuard
        
        guard = PromptInjectionGuard()
        once = guard.sanitize(text)
        twice = guard.sanitize(once)
        
        assert once == twice, "Sanitize is not idempotent"

    @settings(max_examples=200)
    @given(text=st.text(max_size=200))
    def test_detect_injection_no_crash(self, text):
        """detect_injection never raises for any input."""
        from middleware.injection_guard import PromptInjectionGuard
        
        guard = PromptInjectionGuard()
        try:
            result, reason = guard.detect_injection(text)
            assert isinstance(result, bool)
            assert reason is None or isinstance(reason, str)
        except Exception as e:
            raise AssertionError(f"detect_injection raised {e} for input {text!r}")

    @settings(max_examples=200)
    @given(text=st.text(max_size=200))
    def test_validate_and_sanitize_consistent(self, text):
        """validate_and_sanitize returns consistent results."""
        from middleware.injection_guard import PromptInjectionGuard
        
        guard = PromptInjectionGuard()
        sanitized, detected, reason = guard.validate_and_sanitize(text)
        
        assert isinstance(sanitized, str)
        assert isinstance(detected, bool)
        assert reason is None or isinstance(reason, str)
        
        # If detected, reason should be non-None
        if detected:
            assert reason is not None, "Detected but reason is None"
        else:
            assert reason is None, f"Not detected but has reason: {reason}"

    @settings(max_examples=200)
    @given(text=st.text(max_size=200))
    def test_wrap_for_prompt_consistency(self, text):
        """wrap_for_prompt either returns wrapped text or raises ValueError."""
        from middleware.injection_guard import PromptInjectionGuard
        
        guard = PromptInjectionGuard()
        try:
            wrapped = guard.wrap_for_prompt(text)
            assert "<user_input>" in wrapped
            assert "</user_input>" in wrapped
            assert text.strip() in wrapped or guard.sanitize(text) in wrapped
        except ValueError:
            pass  # Expected for injection attempts


# ── Property Tests for InputValidator ───────────────────────────────

class TestInputValidatorProperties:

    @settings(max_examples=500)
    @given(payload=alert_payload_v2_strategy())
    def test_valid_payloads_pass(self, payload):
        """All generated valid payloads should pass validation."""
        from middleware.validator import InputValidator
        
        validator = InputValidator()
        valid, error = validator.validate(payload)
        
        assert valid, f"Valid payload rejected: {error}\nPayload: {payload}"

    @settings(max_examples=200)
    @given(payload=st.dictionaries(st.text(max_size=10), st.none(), max_size=10))
    def test_empty_dicts_fail(self, payload):
        """Empty dicts and random key->None dicts should fail."""
        from middleware.validator import InputValidator
        import jsonschema.exceptions
        
        validator = InputValidator()
        valid, error = validator.validate(payload)
        
        assert not valid

    @settings(max_examples=100)
    @given(severity=st.sampled_from(["critical", "high", "medium", "low", "info"]))
    def test_valid_severity_levels(self, severity):
        """All defined severity levels should validate as True."""
        from middleware.validator import InputValidator
        
        validator = InputValidator()
        assert validator.validate_severity(severity)

    @settings(max_examples=200)
    @given(severity=st.text(max_size=50))
    def test_severity_never_crashes(self, severity):
        """validate_severity should never raise for any input."""
        from middleware.validator import InputValidator
        
        validator = InputValidator()
        result = validator.validate_severity(severity)
        assert isinstance(result, bool)

    @settings(max_examples=200)
    @given(indicators=st.lists(
        st.fixed_dictionaries({
            "type": st.text(max_size=20),
            "value": st.text(max_size=100),
        }),
        max_size=20,
    ))
    def test_validate_indicators_no_crash(self, indicators):
        """validate_indicators should never raise."""
        from middleware.validator import InputValidator
        
        validator = InputValidator()
        try:
            errors = validator.validate_indicators(indicators)
            assert isinstance(errors, list)
            for error in errors:
                assert isinstance(error, str)
        except Exception as e:
            raise AssertionError(f"validate_indicators raised {e}")


# ── Property Tests for RateLimiter ─────────────────────────────────

class TestRateLimiterProperties:

    @settings(max_examples=100)
    @given(requests_per_minute=st.integers(min_value=1, max_value=1000))
    def test_allow_respects_capacity(self, requests_per_minute):
        """Rate limiter should never allow more than capacity per burst."""
        from middleware.rate_limiter import RateLimiter
        
        limiter = RateLimiter(requests_per_minute=requests_per_minute)
        allowed = sum(1 for _ in range(requests_per_minute + 5) 
                     if limiter.allow("test_agent"))
        
        assert allowed <= requests_per_minute, \
            f"Allowed {allowed} > capacity {requests_per_minute}"

    @settings(max_examples=50)
    @given(rpm_a=st.integers(min_value=1, max_value=100),
           rpm_b=st.integers(min_value=1, max_value=100))
    def test_agent_isolation(self, rpm_a, rpm_b):
        """Different agents should not share rate limit state."""
        from middleware.rate_limiter import RateLimiter
        
        limiter = RateLimiter(requests_per_minute=rpm_a)
        
        # Exhaust agent_a
        for _ in range(rpm_a):
            limiter.allow("agent_a")
        
        # agent_b should still be allowed
        assert limiter.allow("agent_b"), "agent_b blocked by agent_a's consumption"

    @settings(max_examples=20)
    @given(rpm=st.integers(min_value=1, max_value=100))
    def test_reset_restores_capacity(self, rpm):
        """Reset should restore full capacity."""
        from middleware.rate_limiter import RateLimiter
        
        limiter = RateLimiter(requests_per_minute=rpm)
        
        # Exhaust
        for _ in range(rpm):
            limiter.allow("agent_r")
        assert not limiter.allow("agent_r"), "Should be exhausted"
        
        # Reset
        limiter.reset("agent_r")
        assert limiter.allow("agent_r"), "Should work after reset"


# ── Property Tests for Audit Logger ─────────────────────────────────

class TestAuditLoggerProperties:

    @settings(max_examples=100)
    @given(secret=st.text(min_size=1, max_size=64),
           agent_id=st.text(max_size=64),
           action=st.text(max_size=64))
    def test_signature_length(self, secret, agent_id, action):
        """HMAC signature should always be 64 hex characters."""
        from middleware.audit import AuditLogger
        
        logger = AuditLogger(secret_key=secret)
        entry = logger.log_action(agent_id, action)
        
        sig = entry.get("hmac_signature", "")
        assert len(sig) == 64, f"Expected 64, got {len(sig)}: {sig}"
        assert all(c in "0123456789abcdef" for c in sig), "Not hex"

    @settings(max_examples=100)
    @given(secret=st.text(min_size=1, max_size=64))
    def test_signature_tamper_detection(self, secret):
        """Any change to entry should cause verification to fail."""
        from middleware.audit import AuditLogger
        import copy
        
        logger = AuditLogger(secret_key=secret)
        entry = logger.log_action("agent", "test", {"key": "value"})
        
        # Verify original passes
        orig = copy.deepcopy(entry)
        assert logger.verify_signature(orig), "Original should verify"
        
        # Tamper with different fields
        tampered = copy.deepcopy(entry)
        tampered["details"] = {"key": "tampered"}
        assert not logger.verify_signature(tampered), "Tampered details should fail"
        
        tampered2 = copy.deepcopy(entry)
        tampered2["action"] = "different"
        assert not logger.verify_signature(tampered2), "Tampered action should fail"
        
        tampered3 = copy.deepcopy(entry)
        tampered3["agent_id"] = "hacker"
        assert not logger.verify_signature(tampered3), "Tampered agent_id should fail"


# ── Run All ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import pytest
    import sys
    
    sys.exit(pytest.main([__file__, "-v", "--tb=short", "--hypothesis-show-statistics"]))
