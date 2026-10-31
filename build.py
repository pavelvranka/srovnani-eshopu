#!/usr/bin/env python3
"""Build: ze zdrojů v src/ a wordpress-plugin/ sestaví výstupy do dist/.

  dist/srovnani-platforem.html                     samostatná HTML stránka (vše inline)
  dist/srovnani-platforem/                          rozbalený WordPress plugin
  dist/srovnani-platforem-<verze>.zip               plugin k nahrání do WordPressu

Použití:  python3 build.py
Požadavky: jen Python 3.8+ (žádné další balíčky).
"""
import datetime
import pathlib
import shutil
import zipfile

# ---------------------------------------------------------------------------
# Jediné místo pro verzi a datum ověření cen. Build je dosadí všude, kde je
# v souborech zástupný text {{VERSION}}, {{UPDATED}} nebo {{UPDATED_CZ}}.
# ---------------------------------------------------------------------------
VERSION = "1.3.3"
UPDATED = "2026-10-31"          # ISO datum posledního ověření cen

PLUGIN_SLUG = "srovnani-platforem"

# Manifest pluginu: (zdroj v repozitáři, cesta uvnitř pluginu).
# Do ZIPu se dostane jen to, co je tady uvedené, plus GENERATED níže.
PLUGIN_FILES = [
    ("wordpress-plugin/srovnani-platforem.php", "srovnani-platforem.php"),
    ("wordpress-plugin/readme.txt",             "readme.txt"),
    ("src/kalkulacka.js",                       "assets/kalkulacka.js"),
    ("src/kalkulacka.css",                      "assets/kalkulacka.css"),
    ("src/content.html",                        "templates/content.html"),
]

# Soubory, které build vytvoří přímo v pluginu (ochrana proti výpisu adresářů
# a přímému přístupu k šabloně).
SILENCE = "<?php\n// Silence is golden.\n"
GENERATED = {
    "index.php": SILENCE,
    "assets/index.php": SILENCE,
    "templates/index.php": SILENCE,
    "templates/.htaccess": "Require all denied\n",
}

# Soubory, ve kterých se nahrazují zástupné texty.
TEXT_SUFFIXES = {".php", ".txt", ".js", ".css", ".html"}

# ---------------------------------------------------------------------------
ROOT = pathlib.Path(__file__).resolve().parent
DIST = ROOT / "dist"


def fill(text: str) -> str:
    d = datetime.date.fromisoformat(UPDATED)
    return (text.replace("{{VERSION}}", VERSION)
                .replace("{{UPDATED}}", UPDATED)
                .replace("{{UPDATED_CZ}}", f"{d.day}. {d.month}. {d.year}"))


def read(rel: str) -> str:
    return fill((ROOT / rel).read_text(encoding="utf-8"))


def check_no_placeholders(name: str, text: str) -> None:
    for token in ("{{VERSION}}", "{{UPDATED}}", "{{UPDATED_CZ}}"):
        if token in text:
            raise SystemExit(f"Chyba: v {name} zůstal zástupný text {token}")


def build_page() -> pathlib.Path:
    js, css = read("src/kalkulacka.js"), read("src/kalkulacka.css")
    # Obsah se vkládá do <script>/<style>, nesmí je předčasně ukončit.
    if "</script" in js.lower() or "</style" in css.lower():
        raise SystemExit("Chyba: JS/CSS obsahuje uzavírací značku </script> nebo </style>")
    html = (read("src/page.html")
            .replace("{{CSS}}", css)
            .replace("{{CONTENT}}", read("src/content.html"))
            .replace("{{JS}}", js))
    check_no_placeholders("srovnani-platforem.html", html)
    out = DIST / "srovnani-platforem.html"
    out.write_text(html, encoding="utf-8")
    return out


def build_plugin() -> pathlib.Path:
    stage = DIST / PLUGIN_SLUG
    if stage.exists():
        shutil.rmtree(stage)

    files = {}
    for src, dst in PLUGIN_FILES:
        path = ROOT / src
        if not path.is_file():
            raise SystemExit(f"Chyba: chybí soubor z manifestu: {src}")
        files[dst] = read(src) if path.suffix in TEXT_SUFFIXES else path.read_bytes()
    files.update(GENERATED)

    for dst, data in files.items():
        if isinstance(data, str):
            check_no_placeholders(dst, data)
        target = stage / dst
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(data, str):
            target.write_text(data, encoding="utf-8")
        else:
            target.write_bytes(data)

    zip_path = DIST / f"{PLUGIN_SLUG}-{VERSION}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(stage.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(DIST))   # v ZIPu je složka srovnani-platforem/
    return zip_path


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    page = build_page()
    plugin_zip = build_plugin()
    print(f"Build {VERSION} (ceny k {UPDATED}):")
    print(f"  {page.relative_to(ROOT)}")
    print(f"  {plugin_zip.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
