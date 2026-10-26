"""Create an unpacked MV3 folder and a ZIP with only audited runtime files."""
import hashlib
import json
from pathlib import Path
import shutil
import struct
import zipfile

root = Path(__file__).resolve().parents[1]
files = ['manifest.json', 'background.js', 'shared.js', 'content.js', 'popup.html', 'popup.js', 'options.html', 'options.js', 'ui.css']
manifest = json.loads((root / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert set(manifest['permissions']) == {'storage', 'clipboardWrite'}
assert manifest['version'] == json.loads((root / 'package.json').read_text())['version']
icons = manifest.get('icons', {})
assert set(icons) == {'16', '32', '48', '128'}
for size, name in {**icons, **manifest['action']['default_icon']}.items():
    data = (root / name).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', name
    assert struct.unpack('>II', data[16:24]) == (int(size), int(size)), name
for name in sorted(set(icons.values()) | set(manifest['action']['default_icon'].values())):
    assert Path(name).parts[0] == 'icons' and '..' not in Path(name).parts, name
    files.append(name)
for name in files:
    assert (root / name).is_file(), name
out = root / 'output'
unpacked = out / 'element-inspector'
unpacked.mkdir(parents=True, exist_ok=True)
for name in files:
    (unpacked / name).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(root / name, unpacked / name)
archive = out / f"element-inspector-{manifest['version']}.zip"
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in files:
        info = zipfile.ZipInfo(name, date_time=(2026, 10, 17, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, (root / name).read_bytes())
with zipfile.ZipFile(archive) as z:
    assert z.namelist() == files
    for name in files:
        assert z.read(name) == (unpacked / name).read_bytes() == (root / name).read_bytes()
print(json.dumps({'unpacked': str(unpacked), 'zip': str(archive), 'sha256': hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest(), 'files': len(files)}, ensure_ascii=False))
