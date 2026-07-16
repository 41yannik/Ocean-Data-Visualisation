import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from pipeline.evidence import build_story_evidence
from pipeline.io_load import load_ibtracs
from pipeline.validate import validate_provenance


class ProvenanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data = ROOT / "app" / "public" / "data"
        cls.data_dir = data
        cls.kurs = json.loads((data / "meta.json").read_text())
        cls.challenge = json.loads((data / "meta.challenge.json").read_text())

    def test_both_metadata_variants_have_valid_provenance(self):
        validate_provenance(self.kurs)
        validate_provenance(self.challenge)
        self.assertEqual(self.kurs["publication"]["status"], "restricted")
        self.assertEqual(self.challenge["publication"]["status"], "blocked")
        self.assertNotIn("EM-DAT", json.dumps(self.challenge))

    def test_story_evidence_is_derived_from_ibtracs(self):
        evidence = build_story_evidence(load_ibtracs())
        self.assertEqual(evidence, self.kurs["analysis"]["storyEvidence"])
        self.assertEqual(evidence["heta"]["radiusKm"], 370)
        self.assertEqual(evidence["heta"]["validRadiusTimes"], 50)
        self.assertEqual(evidence["pam"]["peakWindKt"], 150)
        self.assertEqual(len(evidence["pam"]["windFields"]), 2)

    def test_artifact_hashes_match_files_and_download_policy(self):
        allowed = set(self.kurs["publication"]["allowedDownloads"])
        for artifact in self.kurs["artifacts"]:
            path = self.data_dir / artifact["file"]
            self.assertTrue(path.exists(), artifact["file"])
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(digest, artifact["sha256"])
            self.assertEqual(artifact["downloadable"], artifact["file"] in allowed)

    def test_public_build_gate_rejects_blocked_variant(self):
        env = {**os.environ, "VITE_DATA_VARIANT": "challenge"}
        result = subprocess.run(
            ["node", "scripts/validate_publication.mjs"], cwd=ROOT / "app",
            env=env, text=True, capture_output=True,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("publication.status=blocked", result.stderr + result.stdout)


if __name__ == "__main__":
    unittest.main()
