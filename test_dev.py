import subprocess
import sys
import unittest
from unittest.mock import ANY, call, patch

import dev


class DevSetupTests(unittest.TestCase):
    def setUp(self):
        python_path = "Scripts/python.exe" if sys.platform == "win32" else "bin/python"
        self.venv_python = dev.VENV_DIR / python_path
        self.run = self.enterContext(
            patch("dev.run", return_value=subprocess.CompletedProcess([], 0))
        )
        self.python_exists = self.enterContext(patch("dev.Path.exists", return_value=True))
        self.enterContext(patch("builtins.print"))
        self.probe = call([str(self.venv_python), "-c", ANY], check=False)
        self.bootstrap = [str(self.venv_python), "-m", "ensurepip", "--upgrade"]
        self.install = [
            str(self.venv_python), "-m", "pip", "install", "-q", "-r", str(dev.REQUIREMENTS)
        ]

    def test_creates_missing_environment(self):
        self.python_exists.return_value = False

        self.assertEqual(dev.ensure_venv(), self.venv_python)

        self.assertEqual(self.run.call_args_list, [
            call([sys.executable, "-m", "venv", str(dev.VENV_DIR)]),
            self.probe,
            call(self.install),
        ])

    def test_reuses_environment_and_installs_via_python_module(self):
        self.assertEqual(dev.ensure_venv(), self.venv_python)

        self.assertEqual(self.run.call_args_list, [self.probe, call(self.install)])

    def test_bootstraps_missing_pip_before_installing_dependencies(self):
        self.run.side_effect = [
            subprocess.CompletedProcess([], 1),
            subprocess.CompletedProcess([], 0),
            subprocess.CompletedProcess([], 0),
        ]

        self.assertEqual(dev.ensure_venv(), self.venv_python)

        self.assertEqual(self.run.call_args_list, [
            self.probe, call(self.bootstrap), call(self.install),
        ])

    def test_bootstrap_failure_stops_setup(self):
        self.run.side_effect = [
            subprocess.CompletedProcess([], 1),
            subprocess.CalledProcessError(1, self.bootstrap),
        ]

        with self.assertRaises(subprocess.CalledProcessError):
            dev.ensure_venv()

        self.assertEqual(self.run.call_args_list, [self.probe, call(self.bootstrap)])

    def test_install_failure_prevents_app_start(self):
        self.run.side_effect = [
            subprocess.CompletedProcess([], 0),
            subprocess.CalledProcessError(1, self.install),
        ]

        with self.assertRaises(subprocess.CalledProcessError):
            dev.main()

        self.assertEqual(self.run.call_args_list, [self.probe, call(self.install)])

    def test_unexpected_probe_failure_stops_setup(self):
        self.run.return_value = subprocess.CompletedProcess([], 2)

        with self.assertRaises(subprocess.CalledProcessError):
            dev.ensure_venv()

        self.assertEqual(self.run.call_args_list, [self.probe])

    def test_uses_windows_python_path(self):
        with patch("dev.sys.platform", "win32"):
            venv_python = dev.ensure_venv()

        self.assertEqual(venv_python, dev.VENV_DIR / "Scripts" / "python.exe")
        self.assertEqual(self.run.call_args_list, [
            call([str(venv_python), "-c", ANY], check=False),
            call([str(venv_python), "-m", "pip", "install", "-q", "-r", str(dev.REQUIREMENTS)]),
        ])


if __name__ == "__main__":
    unittest.main()
