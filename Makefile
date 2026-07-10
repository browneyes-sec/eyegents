.PHONY: init

# One-button init: load env, check deps, launch Aider
init:
	@OPENROUTER_API_KEY=$$(grep ^OPENROUTER_API_KEY .secrets 2>/dev/null | cut -d= -f2) \
	aider
