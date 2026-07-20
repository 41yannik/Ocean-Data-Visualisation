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
        cls.meta = json.loads((data / "meta.json").read_text())

    def test_open_metadata_has_valid_provenance(self):
        validate_provenance(self.meta)
        # Offene Land-Jahr-Basis (PDH SDG 11.5.1): Lizenz bestätigt, deploy-frei.
        self.assertEqual(self.meta["variant"], "open")
        self.assertEqual(self.meta["publication"]["status"], "open")
        self.assertTrue(self.meta["publication"]["publicBuild"])
        self.assertNotIn("EM-DAT", json.dumps(self.meta))
        self.assertEqual(self.meta["unit"], "country-year")
        self.assertIn("perCapita", self.meta.get("fits", {}))
        source_ids = {s["id"] for s in self.meta["sources"]}
        self.assertEqual(
            source_ids, {"ibtracs", "wpp", "pdh-sst", "natural-earth", "pdh-affected"})

    def test_story_evidence_is_derived_from_ibtracs(self):
        # storyEvidence stammt aus IBTrACS und ist offen reproduzierbar.
        evidence = build_story_evidence(load_ibtracs())
        self.assertEqual(evidence["heta"]["radiusKm"], 370)
        self.assertEqual(evidence["heta"]["validRadiusTimes"], 50)
        self.assertEqual(evidence["pam"]["peakWindKt"], 150)
        self.assertEqual(len(evidence["pam"]["windFields"]), 2)

    def test_artifact_hashes_match_files_and_download_policy(self):
        allowed = set(self.meta["publication"]["allowedDownloads"])
        for artifact in self.meta["artifacts"]:
            path = self.data_dir / artifact["file"]
            self.assertTrue(path.exists(), artifact["file"])
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(digest, artifact["sha256"])
            self.assertEqual(artifact["downloadable"], artifact["file"] in allowed)

    def test_public_build_gate_passes_open_build(self):
        result = subprocess.run(
            ["node", "scripts/validate_publication.mjs"], cwd=ROOT / "app",
            env={**os.environ}, text=True, capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("Publication gate passed", result.stderr + result.stdout)


if __name__ == "__main__":
    unittest.main()
