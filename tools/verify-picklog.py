#!/usr/bin/env python3
"""Idea61582 owned-fixture live verification. Exact OpenBao record, private pipe only.

Loads the installed hash-pinned machine consumer; no raw secret get, env fallback,
custom origin, PAT issuance, user-data upload or caller-selected API operation.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import resource
import stat
import subprocess
import sys
import tempfile

PIN = '62e1e064bae1de2aceea3d03a1aa3321bc369c63756a2188664f113396d47ed0'
ROOT = Path(__file__).resolve().parents[1]


def main():
    if len(sys.argv) not in {2, 3} or (len(sys.argv) == 3 and sys.argv[2] != '--area'):
        raise ValueError('Use verify-picklog.py /verified/external/run [--area]')
    area = len(sys.argv) == 3
    out = Path(sys.argv[1]).resolve(strict=True)
    artifact_root = Path('/Volumes/1TB_SK_NVME/Artifacts/AgentOps/VerificationEvidence/runs').resolve(strict=True)
    if not out.is_relative_to(artifact_root) or out == artifact_root:
        raise ValueError('evidence_root_rejected')
    volume = subprocess.run(['diskutil', 'info', '-plist', '/Volumes/1TB_SK_NVME'], check=True, capture_output=True).stdout
    import plistlib
    if plistlib.loads(volume).get('VolumeUUID') != '804FEED3-8782-4DCE-9797-47DEF6CEAB11':
        raise ValueError('volume_identity_rejected')
    consumer = Path.home() / '.local/libexec/openbao-service-consumer' / PIN / 'openbao-service-consumer.py'
    info = consumer.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o022 or hashlib.sha256(consumer.read_bytes()).hexdigest() != PIN:
        raise ValueError('machine_consumer_identity_rejected')
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    spec = importlib.util.spec_from_file_location('approved_picklog_machine', consumer)
    base = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(base)
    env = {key: value for key, value in os.environ.items() if key in {'PATH', 'HOME', 'TMPDIR', 'LANG'}}
    env['QA_DIR'] = str(out)
    args = ['node', str(ROOT / 'tests/picklog-live.cjs')]
    with tempfile.TemporaryDirectory(prefix='element-inspector-qa-') as scratch:
        if area:
            args.append('--area')
            if sys.platform == 'darwin':
                helper = str(Path(scratch) / 'press-area-shortcut')
                subprocess.run(['/usr/bin/swiftc', str(ROOT / 'tests/native-area-shortcut.swift'), '-o', helper],
                               check=True, capture_output=True, timeout=25)
                env['NATIVE_SHORTCUT'] = helper
        values = base.load_service('picklog-api')
        try:
            # Fixed code is reviewed with the extension; the only secret transport is stdin.
            result = subprocess.run(args, cwd=ROOT, env=env,
                                    input=json.dumps({'token': values['token'].decode('ascii'), 'project': 'CHROMEEXT'}).encode(),
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
            # Child output is restricted to its non-secret summary. Raw stderr is never printed.
            if result.stdout:
                payload = json.loads(result.stdout)
                if set(payload) - {'passed', 'publicId', 'cleanup', 'durationMs', 'error'}:
                    raise ValueError('child_output_rejected')
                print(json.dumps(payload))
            if result.returncode:
                raise ValueError('live_verification_failed')
        finally:
            base.wipe(values)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Picklog verification: ' + (str(error) if type(error) is ValueError else type(error).__name__), file=sys.stderr)
        sys.exit(1)
