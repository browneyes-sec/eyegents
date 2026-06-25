#!/usr/bin/env python3
"""
OpenRouter Connectivity Test for eyegents
Tests Nemotron and DeepSeek models via OpenRouter API.

Usage:
  source .venvs/openrouter/bin/activate
  python scripts/openrouter-test.py
"""

import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent / ".venvs" / "openrouter" / "lib" / "python3.14" / "site-packages"))

env_path = Path(__file__).parent.parent / "config" / "openrouter.env"
secrets_path = Path(__file__).parent.parent / ".secrets"

# Load config first, then secrets (secrets take priority)
load_dotenv(env_path)
load_dotenv(secrets_path, override=True)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
SITE_URL = os.getenv("OPENROUTER_SITE_URL", "https://github.com/browneyes-sec/eyegents")
SITE_TITLE = os.getenv("OPENROUTER_SITE_TITLE", "eyegents")

MODELS = {
    "Nemotron 3 Super (free)": "nvidia/nemotron-3-super-120b-a12b:free",
    "Nemotron 3 Nano (free)": "nvidia/nemotron-3-nano-30b-a3b:free",
    "DeepSeek V4 Flash": "deepseek/deepseek-v4-flash",
    "DeepSeek V4 Pro": "deepseek/deepseek-v4-pro",
}

ROUTES = {
    "orchestrator": {
        "simple": "qwen2.5-coder:7b (local)",
        "complex": "nvidia/nemotron-3-super-120b-a12b:free (openrouter)"
    },
    "backend": {
        "primary": "deepseek/deepseek-v4-flash (openrouter)",
        "fallback": "qwen2.5-coder:7b (local)"
    },
    "certifier": {
        "primary": "nvidia/nemotron-3-ultra-550b-a55b (openrouter)",
        "fallback": "deepseek/deepseek-v4-pro (openrouter)"
    }
}


def test_models():
    from openai import OpenAI

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
        default_headers={
            "HTTP-Referer": SITE_URL,
            "X-Title": SITE_TITLE,
        }
    )

    print("=" * 60)
    print("eyegents OpenRouter Connectivity Test")
    print("=" * 60)
    print()

    if not OPENROUTER_API_KEY:
        print("[ERROR] OPENROUTER_API_KEY not set!")
        print(f"  Check: {env_path}")
        return False

    print(f"[OK] API key found: {OPENROUTER_API_KEY[:12]}...")
    print(f"[OK] Site: {SITE_TITLE}")
    print()

    results = []

    for name, model_id in MODELS.items():
        print(f"Testing {name} ({model_id})...")
        start = time.time()
        try:
            response = client.chat.completions.create(
                model=model_id,
                messages=[
                    {"role": "user", "content": "Say 'eyegents connected' in exactly 3 words."}
                ],
                max_tokens=50,
                temperature=0.3
            )
            elapsed = time.time() - start
            content = response.choices[0].message.content
            content = content.strip() if content else "(empty response)"
            tokens_in = response.usage.prompt_tokens if response.usage else 0
            tokens_out = response.usage.completion_tokens if response.usage else 0

            print(f"  [OK] Response: {content[:80]}")
            print(f"  [OK] Latency: {elapsed:.2f}s | Tokens: {tokens_in}in/{tokens_out}out")
            results.append({"model": name, "status": "OK", "latency": elapsed})
        except Exception as e:
            elapsed = time.time() - start
            print(f"  [FAIL] {e}")
            results.append({"model": name, "status": "FAIL", "error": str(e), "latency": elapsed})
        print()

    print("=" * 60)
    print("Routing Configuration")
    print("=" * 60)
    for agent, routes in ROUTES.items():
        print(f"  {agent}:")
        for route_type, model in routes.items():
            print(f"    {route_type}: {model}")
    print()

    print("=" * 60)
    print("Summary")
    print("=" * 60)
    ok_count = sum(1 for r in results if r["status"] == "OK")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")
    print(f"  Passed: {ok_count}/{len(results)}")
    print(f"  Failed: {fail_count}/{len(results)}")
    print()

    if fail_count > 0:
        print("Failed models:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  - {r['model']}: {r.get('error', 'unknown')}")
        print()

    return fail_count == 0


def test_typescript_integration():
    print("=" * 60)
    print("TypeScript Integration Check")
    print("=" * 60)

    pkg_path = Path(__file__).parent.parent / "packages" / "openrouter-client"
    src_path = pkg_path / "src"

    required_files = [
        "types.ts",
        "router.ts",
        "cost-tracker.ts",
        "index.ts"
    ]

    all_ok = True
    for f in required_files:
        fp = src_path / f
        if fp.exists():
            size = fp.stat().st_size
            print(f"  [OK] {f} ({size} bytes)")
        else:
            print(f"  [MISSING] {f}")
            all_ok = False

    config_path = Path(__file__).parent.parent / "config" / "openrouter-routes.json"
    if config_path.exists():
        with open(config_path) as fh:
            config = json.load(fh)
        model_count = len(config.get("models", {}))
        agent_count = len(config.get("agentRoutes", {}))
        print(f"  [OK] openrouter-routes.json ({model_count} models, {agent_count} agent routes)")
    else:
        print(f"  [MISSING] openrouter-routes.json")
        all_ok = False

    print()
    return all_ok


if __name__ == "__main__":
    ts_ok = test_typescript_integration()
    api_ok = test_models()

    print("=" * 60)
    if ts_ok and api_ok:
        print("ALL TESTS PASSED")
    else:
        print("SOME TESTS FAILED")
    print("=" * 60)

    sys.exit(0 if (ts_ok and api_ok) else 1)
