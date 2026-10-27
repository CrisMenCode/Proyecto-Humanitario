import ast
from pathlib import Path
from django.test import SimpleTestCase


class ArchitectureTests(SimpleTestCase):
    def test_domain_and_application_do_not_import_frameworks_or_adapters(self):
        root = Path(__file__).resolve().parents[1]
        forbidden = (
            "django",
            "rest_framework",
            "celery",
            "openai",
            "ayuda.adapters",
            "ayuda.models",
            "ayuda.composition",
        )
        for layer in ["domain", "application"]:
            for path in (root / layer).rglob("*.py"):
                tree = ast.parse(path.read_text())
                for node in ast.walk(tree):
                    names = (
                        [alias.name for alias in node.names]
                        if isinstance(node, ast.Import)
                        else [node.module or ""]
                        if isinstance(node, ast.ImportFrom)
                        else []
                    )
                    for name in names:
                        self.assertFalse(
                            name.startswith(forbidden),
                            f"{path}: importación prohibida {name}",
                        )
