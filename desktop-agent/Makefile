.PHONY: setup run test sync-prompt gen-config lint clean

VENV := .venv
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

setup:
	python3 -m venv $(VENV)
	$(PIP) install -U pip
	C_INCLUDE_PATH=/opt/homebrew/include LIBRARY_PATH=/opt/homebrew/lib $(PIP) install -r requirements.txt
	$(PY) -m playwright install chromium
	$(MAKE) gen-config
	$(MAKE) sync-prompt
	@echo "✅ Setup complete — run 'make run' to start JARVIS"

gen-config:
	$(PY) scripts/generate_config.py

sync-prompt:
	cp ../shared/jarvis-core-prompt.txt core/prompt.txt

run:
	$(PY) main.py

test:
	$(PY) -m pytest tests/ -v

lint:
	$(VENV)/bin/ruff check .

clean:
	rm -rf $(VENV) __pycache__ .pytest_cache
	find . -name '__pycache__' -exec rm -rf {} +
