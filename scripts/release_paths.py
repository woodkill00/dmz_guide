"""Exact author-only output boundaries shared by packaging and tests."""

AUTHOR_ONLY_PATHS = frozenset({
    "assets/src/client/page-editor.mjs",
    "assets/src/client/page-editor-media.mjs",
    "assets/src/client/page-editor-experience.mjs",
    "assets/src/domain/editor-experience.mjs",
    "scripts/page-editor-tools.mjs",
    "assets/src/domain/page-editor-utils.mjs",
    "assets/src/ui/page-editor-page.mjs",
    "assets/src/ui/page-editor.css",
    "scripts/page-editor-store.mjs",
    "scripts/page-editor-preview.mjs",
    'assets/src/client/studio.mjs',
    'assets/src/content/studio-recovery.mjs',
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
