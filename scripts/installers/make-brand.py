#!/usr/bin/env python3
"""
VanillaAgent Brand Asset Generator
==================================

Renders every raster asset the native installers need, from the canonical
VanillaAgent design tokens (see `brand/theme.json`):

  * App icons      -> PNG set, Windows .ico, macOS .icns
  * Wordmarks      -> horizontal lock-up PNGs (transparent + on-dark)
  * macOS .pkg     -> installer background (1227x600) + themed RTF documents
  * Windows NSIS   -> MUI header (150x57) + welcome/finish panel (164x314) BMPs
  * Web            -> social card (1200x630) + favicon

Everything is drawn with the real brand typefaces (Plus Jakarta Sans /
JetBrains Mono) so the installers look like the Web GUI dashboard.

Usage:
    python3 scripts/installers/make-brand.py [--version 0.2.1] [--out build/brand]
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import struct
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─────────────────────────────────────────────────────────────────────────────
# Design tokens (mirrors brand/theme.json and src/gui/html.ts)
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parents[2]
FONT_DIR = REPO_ROOT / "brand" / "fonts"

BRAND_50 = (240, 253, 250)
BRAND_400 = (45, 212, 191)
BRAND_500 = (20, 184, 166)
BRAND_600 = (13, 148, 136)
BRAND_900 = (19, 78, 74)
DARK_800 = (24, 27, 32)
DARK_850 = (18, 20, 24)
DARK_900 = (12, 13, 16)
DARK_950 = (6, 7, 8)
SLATE_200 = (226, 232, 240)
SLATE_300 = (203, 213, 225)
SLATE_400 = (148, 163, 184)
SLATE_500 = (100, 116, 139)
WHITE = (255, 255, 255)

SANS_BOLD = str(FONT_DIR / "plus-jakarta-sans-latin-700-normal.woff")
SANS_BLACK = str(FONT_DIR / "plus-jakarta-sans-latin-800-normal.woff")
SANS_REGULAR = str(FONT_DIR / "plus-jakarta-sans-latin-400-normal.woff")
MONO_REGULAR = str(FONT_DIR / "jetbrains-mono-latin-400-normal.woff")
MONO_BOLD = str(FONT_DIR / "jetbrains-mono-latin-700-normal.woff")

TAGLINE = "Sovereign Autonomous AI Agent Runtime & Swarm Engine"
REPO_URL = "github.com/ronavkarumsi04/VanillaAgent"


# ─────────────────────────────────────────────────────────────────────────────
# Drawing primitives
# ─────────────────────────────────────────────────────────────────────────────


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def squircle_mask(size: int, ratio: float = 0.235, ss: int = 4) -> Image.Image:
    """Anti-aliased rounded-square (squircle) mask."""
    s = size * ss
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, s - 1, s - 1], radius=int(s * ratio), fill=255
    )
    return mask.resize((size, size), Image.LANCZOS)


def linear_gradient(
    size: tuple[int, int], top_left: tuple[int, int, int], bottom_right: tuple[int, int, int]
) -> Image.Image:
    """Fast, smooth diagonal gradient (rendered small, upscaled with Lanczos)."""
    w, h = size
    small = Image.new("RGB", (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126.0
            px[x, y] = (
                int(top_left[0] + (bottom_right[0] - top_left[0]) * t),
                int(top_left[1] + (bottom_right[1] - top_left[1]) * t),
                int(top_left[2] + (bottom_right[2] - top_left[2]) * t),
            )
    return small.resize((max(w, 1), max(h, 1)), Image.LANCZOS)


def radial_glow(
    size: tuple[int, int],
    center: tuple[float, float],
    radius: float,
    color: tuple[int, int, int],
    peak: float = 0.55,
) -> Image.Image:
    """Soft radial glow on transparent background."""
    w, h = size
    ss = max(1, min(4, int(1024 / max(w, h)) or 1))
    sw, sh = max(64, w // ss), max(64, h // ss)
    glow = Image.new("L", (sw, sh), 0)
    d = ImageDraw.Draw(glow)
    cx, cy = center[0] / ss, center[1] / ss
    r = radius / ss
    steps = 48
    for i in range(steps, 0, -1):
        frac = i / steps
        rr = r * frac
        alpha = int(255 * peak * (1 - frac) ** 2.2)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=alpha)
    glow = glow.resize((w, h), Image.LANCZOS)
    layer = Image.new("RGBA", (w, h), color + (0,))
    layer.putalpha(glow)
    return layer


def grid_lines(
    size: tuple[int, int], step: int = 42, color: tuple[int, int, int] = WHITE, alpha: int = 8
) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for x in range(step, size[0], step):
        d.line([(x, 0), (x, size[1])], fill=color + (alpha,), width=1)
    for y in range(step, size[1], step):
        d.line([(0, y), (size[0], y)], fill=color + (alpha,), width=1)
    return layer


def text(
    canvas: Image.Image,
    xy: tuple[int, int],
    value: str,
    font_path: str,
    size: int,
    color: tuple[int, int, int],
    anchor: str = "la",
    alpha: int = 255,
    tracking: float = 0.0,
) -> None:
    """Draw text; supports manual letter tracking and RGBA alpha."""
    f = font(font_path, size)
    if alpha < 255 or len(color) == 3 and alpha < 255:
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).text(
            xy, value, font=f, fill=color + (alpha,), anchor=anchor
        )
        canvas.alpha_composite(layer)
        return
    if tracking:
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        x, y = xy
        total = sum(f.getlength(ch) + tracking for ch in value) - tracking
        if anchor[0] == "m":
            x -= total / 2
        elif anchor[0] == "r":
            x -= total
        for ch in value:
            d.text((x, y), ch, font=f, fill=color + (255,), anchor="ls" if anchor[-1] == "s" else "la")
            x += f.getlength(ch) + tracking
        canvas.alpha_composite(layer)
        return
    ImageDraw.Draw(canvas).text(xy, value, font=f, fill=color + (255,), anchor=anchor)


def text_width(value: str, font_path: str, size: int) -> float:
    return font(font_path, size).getlength(value)


# ─────────────────────────────────────────────────────────────────────────────
# Logo mark
# ─────────────────────────────────────────────────────────────────────────────


def draw_logo_mark(size: int = 1024) -> Image.Image:
    """The VanillaAgent tile: teal gradient squircle with a dark 'V' glyph."""
    ss = 3 if size <= 128 else 2  # supersample for crisp edges
    s = size * ss
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    # Gradient body (brand-600 -> brand-400), matching the GUI's `from-brand-600 to-brand-400`
    body = linear_gradient((s, s), BRAND_600, BRAND_400).convert("RGBA")
    mask = squircle_mask(s, ratio=0.235, ss=2)
    img.paste(body, (0, 0), mask)

    # Glossy top highlight
    gloss = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.rounded_rectangle(
        [int(s * 0.03), int(s * 0.015), int(s * 0.97), int(s * 0.52)],
        radius=int(s * 0.22),
        fill=(255, 255, 255, 26),
    )
    gloss = gloss.filter(ImageFilter.GaussianBlur(s * 0.03))
    img.alpha_composite(gloss)

    # Inner hairline so the tile reads on light backgrounds too
    edge = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle(
        [int(s * 0.008), int(s * 0.008), s - int(s * 0.008), s - int(s * 0.008)],
        radius=int(s * 0.23),
        outline=(255, 255, 255, 44),
        width=max(1, int(s * 0.006)),
    )
    img.alpha_composite(edge)

    # 'V' glyph in dark-950
    v_font = font(SANS_BLACK, int(s * 0.60))
    glyph = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(glyph).text(
        (s * 0.5, s * 0.545), "V", font=v_font, fill=DARK_950 + (255,), anchor="mm"
    )
    img.alpha_composite(glyph)

    return img.resize((size, size), Image.LANCZOS)


def draw_lockup(
    width: int = 900,
    mark_ratio: float = 0.17,
    title_size: float | None = None,
    eyebrow: str | None = "SOVEREIGN NODE",
    title_color: tuple[int, int, int] = WHITE,
    eyebrow_color: tuple[int, int, int] = BRAND_400,
) -> Image.Image:
    """Horizontal lock-up: logo tile + VanillaAgent wordmark (+ mono eyebrow)."""
    height = int(width * mark_ratio)
    mark = int(height * 0.92)
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    logo = draw_logo_mark(512).resize((mark, mark), Image.LANCZOS)
    canvas.alpha_composite(logo, (0, (height - mark) // 2))

    tsize = title_size or int(height * 0.48)
    x = int(mark + height * 0.22)
    text(canvas, (x, height * 0.5), "VanillaAgent", SANS_BLACK, tsize, title_color, anchor="lm")
    if eyebrow:
        tw = text_width("VanillaAgent", SANS_BLACK, tsize)
        text(
            canvas,
            (x + tw + height * 0.16, height * 0.54),
            eyebrow,
            MONO_BOLD,
            int(height * 0.19),
            eyebrow_color,
            anchor="lm",
            tracking=int(height * 0.012),
        )
    return canvas


# ─────────────────────────────────────────────────────────────────────────────
# Icon containers (.ico / .icns)
# ─────────────────────────────────────────────────────────────────────────────


def write_ico(base: Image.Image, path: Path, sizes=(16, 24, 32, 48, 64, 128, 256)) -> None:
    imgs = [base.resize((s, s), Image.LANCZOS) for s in sizes]
    imgs[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=imgs[1:],
    )


ICNS_TYPES = {
    1024: b"ic10",
    512: b"ic09",
    256: b"ic08",
    128: b"ic07",
    64: b"ic12",
    32: b"ic11",
}


def write_icns(base: Image.Image, path: Path) -> None:
    import io

    entries = b""
    for size, kind in sorted(ICNS_TYPES.items(), reverse=True):
        buf = io.BytesIO()
        base.resize((size, size), Image.LANCZOS).save(buf, format="PNG", optimize=True)
        png = buf.getvalue()
        entries += kind + struct.pack(">I", len(png) + 8) + png
    payload = b"icns" + struct.pack(">I", len(entries) + 8) + entries
    path.write_bytes(payload)


# ─────────────────────────────────────────────────────────────────────────────
# macOS installer assets
# ─────────────────────────────────────────────────────────────────────────────


def draw_pkg_background(version: str, size=(1227, 600)) -> Image.Image:
    """Background for the macOS Installer distribution package.

    macOS crops the TOP of an oversized bottom-left aligned background, so every
    piece of branding lives in the lower half of the canvas.
    """
    w, h = size
    canvas = Image.new("RGBA", size, DARK_950 + (255,))

    # Teal glow, top-right, so the (visible) bottom stays clean
    canvas.alpha_composite(radial_glow(size, (w * 0.72, h * 0.02), w * 0.62, BRAND_500, peak=0.30))
    canvas.alpha_composite(radial_glow(size, (w * 0.10, h * 0.66), w * 0.36, BRAND_900, peak=0.34))
    canvas.alpha_composite(grid_lines(size, step=41, alpha=6))

    # Bottom hairline band (glassmorphism hint)
    band = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(band).rectangle([0, h - 96, w, h - 95], fill=(255, 255, 255, 14))
    canvas.alpha_composite(band)

    # Lock-up, bottom-left
    lock = draw_lockup(width=int(w * 0.62), mark_ratio=0.115, eyebrow=f"SOVEREIGN NODE V{version}")
    canvas.alpha_composite(lock, (56, h - 132 - lock.height))

    # Right-hand meta strip
    text(
        canvas,
        (w - 56, h - 96),
        "SOVEREIGN  ·  MULTI-PROVIDER  ·  SELF-IMPROVING",
        MONO_BOLD,
        17,
        SLATE_500,
        anchor="rs",
        tracking=3,
    )
    text(canvas, (w - 56, h - 66), REPO_URL, MONO_REGULAR, 15, SLATE_500, anchor="rs")
    return canvas.convert("RGB")


# ─────────────────────────────────────────────────────────────────────────────
# Windows (NSIS) assets
# ─────────────────────────────────────────────────────────────────────────────


def draw_nsis_header(size=(150, 57)) -> Image.Image:
    """MUI header bitmap, top-right of every interior installer page."""
    ss = 4
    w, h = size
    canvas = Image.new("RGBA", (w * ss, h * ss), DARK_900 + (255,))
    canvas.alpha_composite(
        radial_glow((w * ss, h * ss), (w * ss * 0.86, 0), w * ss * 0.72, BRAND_500, peak=0.34)
    )
    canvas.alpha_composite(grid_lines((w * ss, h * ss), step=11 * ss // 2, alpha=5))

    mark = int(h * ss * 0.58)
    logo = draw_logo_mark(512).resize((mark, mark), Image.LANCZOS)
    canvas.alpha_composite(logo, (int(11 * ss), (h * ss - mark) // 2))
    text(
        canvas,
        (int(11 * ss) + mark + int(8 * ss), int(h * ss * 0.40)),
        "VanillaAgent",
        SANS_BLACK,
        int(15 * ss),
        WHITE,
        anchor="lm",
    )
    text(
        canvas,
        (int(11 * ss) + mark + int(8 * ss), int(h * ss * 0.70)),
        "SOVEREIGN NODE",
        MONO_BOLD,
        int(7.4 * ss),
        BRAND_400,
        anchor="lm",
        tracking=int(0.9 * ss),
    )
    ImageDraw.Draw(canvas).line(
        [(0, h * ss - 2), (w * ss, h * ss - 2)], fill=BRAND_500 + (210,), width=2
    )
    return canvas.resize(size, Image.LANCZOS).convert("RGB")


def draw_nsis_welcome(size=(164, 314)) -> Image.Image:
    """MUI welcome/finish side panel."""
    ss = 4
    w, h = size
    canvas = Image.new("RGBA", (w * ss, h * ss), DARK_950 + (255,))
    canvas.alpha_composite(
        linear_gradient((w * ss, h * ss), (13, 74, 71), DARK_950).convert("RGBA")
    )
    canvas.alpha_composite(
        radial_glow((w * ss, h * ss), (w * ss * 0.5, h * ss * 0.13), w * ss * 0.95, BRAND_400, peak=0.42)
    )
    canvas.alpha_composite(grid_lines((w * ss, h * ss), step=13 * ss, alpha=6))

    mark = int(w * ss * 0.46)
    logo = draw_logo_mark(512).resize((mark, mark), Image.LANCZOS)
    canvas.alpha_composite(logo, ((w * ss - mark) // 2, int(h * ss * 0.085)))

    text(
        canvas,
        (w * ss // 2, int(h * ss * 0.365)),
        "Vanilla",
        SANS_BLACK,
        int(24 * ss),
        WHITE,
        anchor="ma",
    )
    text(
        canvas,
        (w * ss // 2, int(h * ss * 0.435)),
        "Agent",
        SANS_BLACK,
        int(24 * ss),
        BRAND_400,
        anchor="ma",
    )
    ImageDraw.Draw(canvas).line(
        [
            (int(w * ss * 0.28), int(h * ss * 0.50)),
            (int(w * ss * 0.72), int(h * ss * 0.50)),
        ],
        fill=(255, 255, 255, 40),
        width=max(1, ss),
    )
    text(
        canvas,
        (w * ss // 2, int(h * ss * 0.545)),
        "SOVEREIGN",
        MONO_BOLD,
        int(8.6 * ss),
        SLATE_300,
        anchor="ma",
        tracking=int(1.3 * ss),
    )
    text(
        canvas,
        (w * ss // 2, int(h * ss * 0.585)),
        "AI RUNTIME",
        MONO_BOLD,
        int(8.6 * ss),
        SLATE_300,
        anchor="ma",
        tracking=int(1.3 * ss),
    )
    text(
        canvas,
        (w * ss // 2, int(h * ss * 0.935)),
        "WALLET · SWARM · MEMORY",
        MONO_REGULAR,
        int(7 * ss),
        BRAND_400,
        anchor="ma",
        tracking=int(0.6 * ss),
        alpha=200,
    )
    return canvas.resize(size, Image.LANCZOS).convert("RGB")


def draw_nsis_logo(size: int = 48) -> Image.Image:
    """Logo tile on the installer page background (BMP has no alpha channel)."""
    canvas = Image.new("RGBA", (size, size), DARK_900 + (255,))
    canvas.alpha_composite(draw_logo_mark(1024).resize((size, size), Image.LANCZOS), (0, 0))
    return canvas.convert("RGB")


def draw_nsis_wordmark(width: int = 560, height: int = 64) -> Image.Image:
    """Horizontal lock-up on the installer page background."""
    canvas = Image.new("RGBA", (width, height), DARK_900 + (255,))
    lock = draw_lockup(width=int(width * 0.92), mark_ratio=0.62, eyebrow=None)
    canvas.alpha_composite(lock, (0, (height - lock.height) // 2))
    return canvas.convert("RGB")


# ─────────────────────────────────────────────────────────────────────────────
# Web assets
# ─────────────────────────────────────────────────────────────────────────────


def draw_social_card(version: str, size=(1200, 630)) -> Image.Image:
    w, h = size
    canvas = Image.new("RGBA", size, DARK_950 + (255,))
    canvas.alpha_composite(radial_glow(size, (w * 0.78, h * 0.12), w * 0.55, BRAND_500, peak=0.34))
    canvas.alpha_composite(radial_glow(size, (w * 0.06, h * 0.92), w * 0.42, BRAND_900, peak=0.4))
    canvas.alpha_composite(grid_lines(size, step=48, alpha=7))

    lock = draw_lockup(width=760, mark_ratio=0.135, eyebrow=f"V{version}")
    canvas.alpha_composite(lock, (72, 96))

    text(canvas, (72, 300), "Sovereign, multi-provider,", SANS_BOLD, 46, SLATE_200, anchor="la")
    text(canvas, (72, 356), "self-improving AI runtime.", SANS_BOLD, 46, BRAND_400, anchor="la")
    text(canvas, (72, 452), TAGLINE, MONO_REGULAR, 20, SLATE_400, anchor="la")

    chips = ["macOS", "Windows", "Linux", "Docker"]
    x = 72
    for chip in chips:
        cw = int(text_width(chip, MONO_BOLD, 19) + 44)
        pill = Image.new("RGBA", size, (0, 0, 0, 0))
        ImageDraw.Draw(pill).rounded_rectangle(
            [x, 508, x + cw, 552], radius=22, fill=(255, 255, 255, 12), outline=(45, 212, 191, 90), width=1
        )
        canvas.alpha_composite(pill)
        text(canvas, (x + cw / 2, 530), chip, MONO_BOLD, 19, BRAND_400, anchor="mm")
        x += cw + 14
    return canvas.convert("RGB")


# ─────────────────────────────────────────────────────────────────────────────
# RTF documents for the macOS Installer
# ─────────────────────────────────────────────────────────────────────────────

RTF_HEAD = (
    r"{\rtf1\ansi\ansicpg1252\cocoartf2761"
    "\n"
    r"{\fonttbl\f0\fnil\fcharset0 PlusJakartaSans-Regular;\f1\fnil\fcharset0 PlusJakartaSans-Bold;"
    "\n"
    r"\f2\fmodern\fcharset0 JetBrainsMono-Regular;\f3\fmodern\fcharset0 JetBrainsMono-Bold;}"
    "\n"
    r"{\colortbl;\red255\green255\blue255;\red45\green212\blue191;\red148\green163\blue184;"
    r"\red226\green232\blue240;\red20\green184\blue166;\red255\green113\blue133;}"
    "\n"
    r"\margl1440\margr1440\vieww9000\viewh8400\viewkind0"
    "\n"
    r"\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0"
    "\n"
)


def rtf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def rtf_doc(blocks: list[tuple[str, str]], version: str) -> bytes:
    """blocks: list of (kind, text); kind in {eyebrow,h1,h2,body,mono,bullet,spacer}"""
    out = [RTF_HEAD]
    for kind, value in blocks:
        value = value.replace("{{VERSION}}", version)
        if kind == "spacer":
            out.append(r"\pard\pardirnatural\partightenfactor0" + "\n" + r"\fs20 \~" + "\n")
            continue
        if kind == "eyebrow":
            out.append(
                r"\pard\pardirnatural\partightenfactor0"
                + "\n"
                + r"\f3\b\fs22\cf2 "
                + "".join(f"{rtf_escape(c)}\\~" for c in value.upper())
                + r"\cf0\b0\f0\fs24 "
                + "\n"
            )
        elif kind == "h1":
            out.append(
                r"\pard\pardirnatural\partightenfactor0" + "\n" + r"\f1\b\fs44\cf1 "
                + rtf_escape(value)
                + r"\cf0\b0\f0\fs24 " + "\n"
            )
        elif kind == "h2":
            out.append(
                r"\pard\pardirnatural\partightenfactor0" + "\n" + r"\f1\b\fs30\cf4 "
                + rtf_escape(value)
                + r"\cf0\b0\f0\fs24 " + "\n"
            )
        elif kind == "body":
            out.append(
                r"\pard\pardirnatural\partightenfactor0" + "\n" + r"\f0\fs24\cf3 "
                + rtf_escape(value)
                + r"\cf0\fs24 " + "\n"
            )
        elif kind == "bullet":
            out.append(
                r"\pard\tx220\pardirnatural\partightenfactor0" + "\n" + r"\ls1\ilvl0"
                r"\f2\fs22\cf5 \'b7\cf0\tx220\tab "
                r"\f0\fs24\cf3 " + rtf_escape(value) + r"\cf0\fs24 " + "\n"
            )
        elif kind == "mono":
            out.append(
                r"\pard\pardirnatural\partightenfactor0" + "\n" + r"\f2\fs22\cf2 "
                + rtf_escape(value)
                + r"\cf0\f0\fs24 " + "\n"
            )
    out.append("}")
    return "\n".join(out).encode("utf-8")


def build_rtfs(version: str, out: Path) -> None:
    welcome = rtf_doc(
        [
            ("eyebrow", "Sovereign Node {{VERSION}}"),
            ("h1", "Welcome to VanillaAgent"),
            (
                "body",
                "This installer places the VanillaAgent runtime in /Applications and adds the "
                "vanilla and vanilla-gui commands to /usr/local/bin.",
            ),
            ("spacer", ""),
            ("h2", "What gets installed"),
            ("bullet", "The sovereign agent runtime and Web GUI control panel"),
            ("bullet", "Mission control, swarm orchestration and 5-tier cognitive memory"),
            ("bullet", "The creator CLI: vanilla-cli status, doctor, logs, memory"),
            ("bullet", "A sovereign EVM / Solana wallet generated on first launch"),
            ("spacer", ""),
            (
                "body",
                "Node.js 20 or newer is required. If it is missing, the installer finishes and the "
                "launcher tells you how to install it.",
            ),
            ("spacer", ""),
            ("mono", "VanillaAgent is MIT licensed. No telemetry. No vendor lock-in."),
        ],
        version,
    )
    (out / "welcome.rtf").write_bytes(welcome)

    readme = rtf_doc(
        [
            ("eyebrow", "Before You Install"),
            ("h1", "Two things to know"),
            ("spacer", ""),
            ("h2", "1. An AI brain (optional)"),
            (
                "body",
                "Run completely offline and free with Ollama, or set an API key for OpenAI, "
                "Anthropic Claude, Google Gemini, xAI Grok or DeepSeek.",
            ),
            ("mono", "export ANTHROPIC_API_KEY=\"sk-ant-...\""),
            ("spacer", ""),
            ("h2", "2. Disk space"),
            (
                "body",
                "The runtime itself is about 12 MB. Runtime dependencies are fetched on first "
                "launch (roughly 180 MB) and live inside the install folder.",
            ),
        ],
        version,
    )
    (out / "readme.rtf").write_bytes(readme)

    conclusion = rtf_doc(
        [
            ("eyebrow", "Install Complete"),
            ("h1", "Your agent is sovereign."),
            ("spacer", ""),
            (
                "body",
                "Open VanillaAgent from your Applications folder, or run vanilla-gui from the "
                "terminal. The dashboard is served at http://localhost:3000.",
            ),
            ("spacer", ""),
            ("h2", "Next steps"),
            ("bullet", "Launch VanillaAgent and complete the first-run setup wizard"),
            ("bullet", "Point it at Ollama for a free local brain, or paste a cloud API key"),
            ("bullet", "Watch the heartbeat and treasury from the Cockpit tab"),
            ("spacer", ""),
            ("mono", "vanilla --help      # every runtime command"),
            ("mono", "vanilla-cli doctor  # environment diagnostics"),
        ],
        version,
    )
    (out / "conclusion.rtf").write_bytes(conclusion)

    lic = (REPO_ROOT / "LICENSE").read_text(encoding="utf-8")
    license_rtf = rtf_doc(
        [("eyebrow", "MIT License"), ("h1", "VanillaAgent License"), ("spacer", "")]
        + [("mono", line) for line in lic.splitlines()[:120]],
        version,
    )
    (out / "license.rtf").write_bytes(license_rtf)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", default="0.2.1")
    parser.add_argument("--out", default=str(REPO_ROOT / "build" / "brand"))
    args = parser.parse_args()

    out = Path(args.out).resolve()
    if out.exists():
        shutil.rmtree(out)
    (out / "icons").mkdir(parents=True, exist_ok=True)

    print("  ▸ rendering logo marks")
    base = draw_logo_mark(1024)
    for size in (16, 32, 48, 64, 128, 256, 512, 1024):
        base.resize((size, size), Image.LANCZOS).save(out / "icons" / f"appicon-{size}.png")

    write_ico(base, out / "vanillaagent.ico")
    write_icns(base, out / "vanillaagent.icns")
    base.save(out / "logo-1024.png")
    draw_logo_mark(512).save(out / "logo-512.png")

    print("  ▸ rendering wordmarks")
    draw_lockup(width=1100, mark_ratio=0.155, eyebrow="SOVEREIGN NODE").save(out / "wordmark.png")
    draw_lockup(width=1100, mark_ratio=0.155, eyebrow=None, title_color=WHITE).save(
        out / "wordmark-simple.png"
    )

    print("  ▸ rendering macOS installer assets")
    draw_pkg_background(args.version).save(out / "pkg-background.png")
    build_rtfs(args.version, out)

    print("  ▸ rendering Windows installer assets")
    draw_nsis_header().save(out / "nsis-header.bmp", format="BMP")
    draw_nsis_welcome().save(out / "nsis-welcome.bmp", format="BMP")
    draw_nsis_welcome().save(out / "nsis-uninstall-welcome.bmp", format="BMP")
    draw_nsis_logo().save(out / "nsis-logo.bmp", format="BMP")
    draw_nsis_wordmark().save(out / "nsis-wordmark.bmp", format="BMP")
    shutil.copyfile(out / "vanillaagent.ico", out / "nsis-installer.ico")
    shutil.copyfile(out / "vanillaagent.ico", out / "nsis-uninstaller.ico")

    print("  ▸ rendering web assets")
    draw_social_card(args.version).save(out / "social-card.png")
    shutil.copyfile(out / "vanillaagent.ico", out / "favicon.ico")

    manifest = {
        "brand": "VanillaAgent",
        "version": args.version,
        "generated": sorted(p.name for p in out.iterdir()),
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"  ✓ brand assets -> {out.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
