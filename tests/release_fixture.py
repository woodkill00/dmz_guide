"""Explicitly synthetic identity/manifest for archive and readiness tests."""
import hashlib
import json


def identity_for(files):
    body = {'format': 'dmz-build-identity', 'version': 1,
            'sourceFiles': {}, 'schemaHash': 'synthetic-schema',
            'git': {'revision': None, 'dirty': 'unknown'},
            'outputFiles': {name.removeprefix('dist/'): hashlib.sha256(data).hexdigest()
                            for name, data in files.items() if name.startswith('dist/')}}
    body['buildId'] = hashlib.sha256(json.dumps(body, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    return body


def manifest_for(files):
    identity = identity_for(files)
    files['dist/assets/build-identity.json'] = json.dumps(identity).encode()
    return {'format': 'dmz-production-manifest', 'version': 2,
            'files': {name: {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)} for name, data in files.items()},
            'archiveMembers': sorted([*files, 'PRODUCTION-MANIFEST.json']),
            'manifestSelfDigestExcluded': 'Self digest explicitly excluded',
            'identity': {'buildId': identity['buildId'], 'schemaHash': identity['schemaHash']}}
