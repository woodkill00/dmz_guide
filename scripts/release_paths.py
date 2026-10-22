"""Exact author-only output boundaries shared by packaging and tests."""

AUTHOR_ONLY_PATHS = frozenset({
    'assets/src/client/studio.mjs',
    'assets/src/content/studio-recovery.mjs',
    'assets/src/client/raster-editor.mjs',
    'assets/src/client/studio-media.mjs',
    'assets/src/ui/studio-page.mjs',
    'assets/src/ui/studio.css',
    'scripts/author.mjs',
    'scripts/author-store.mjs',
    'scripts/author-preview.mjs',
})


def is_author_only(relative):
    """Do not reject harmless game titles containing 'author' or 'studio'."""
    normalized = relative.replace('\\', '/')
    return normalized in AUTHOR_ONLY_PATHS or normalized == '.author-state' or normalized.startswith('.author-state/')
