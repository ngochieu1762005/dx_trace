# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
"""DX-TRACE Caddy routing regression tests. SPDX-License-Identifier: MIT
"""
import importlib.util
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('installer', ROOT / 'selfhost/scripts/install-saas-caddy.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)

class RoutingTests(unittest.TestCase):
    def test_preserves_unrelated_sites(self):
        source = 'other.example.org {\n reverse_proxy localhost:7000\n}\nold.example.org {\n root * /old\n}\nid.example.org {\n reverse_proxy localhost:8181\n}\napp.example.org {\n reverse_proxy localhost:8180\n}\n'
        retained, counts = installer.remove_exact_blocks(source, ('old.example.org', 'id.example.org', 'app.example.org'))
        self.assertIn('other.example.org', retained)
        self.assertNotIn('root * /old', retained)
        self.assertEqual(counts['app.example.org'], 1)

    def test_fixed_login_targets_and_explicit_home(self):
        source = (ROOT / 'selfhost/Caddyfile.ubuntu.saas.snippet').read_text()
        self.assertIn('rewrite @home /index.html', source)
        self.assertIn('https://app.example.org/oauth2/start?rd=%2F%23overview', source)
        self.assertNotIn('area%3Dtraining', source)
        self.assertIn('rd=%2F%23requests', source)

    def test_duplicate_blocks_abort_instead_of_overwriting(self):
        source = 'old.example.org {\n}\nold.example.org {\n}\nid.example.org {\n}\n'
        with self.assertRaises(ValueError):
            installer.remove_exact_blocks(source, ('old.example.org', 'id.example.org', 'app.example.org'))

if __name__ == '__main__':
    unittest.main()
