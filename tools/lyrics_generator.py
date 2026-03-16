#!/usr/bin/env python3
"""
Simple, offline song lyric generator.

Goals:
- No external dependencies (standard library only).
- Reproducible output with --seed.
- Basic verse/chorus/bridge structure and optional end-rhyme patterns.

This does not try to imitate any specific artist; it uses generic templates and word banks.
"""

from __future__ import annotations

import argparse
import json
import random
import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence


DEFAULT_STRUCTURE = "V C V C B C"


RHYME_FAMILIES: List[List[str]] = [
    ["night", "light", "bright", "fight", "right"],
    ["fire", "desire", "higher", "wire"],
    ["day", "way", "stay", "play", "say"],
    ["time", "rhyme", "climb", "prime"],
    ["heart", "start", "apart"],
    ["down", "town", "crown", "sound"],
    ["rain", "pain", "again", "train"],
    ["gold", "hold", "told", "cold"],
    ["sea", "free", "me", "see"],
]


WORD_BANKS: Dict[str, Dict[str, Sequence[str]]] = {
    "neutral": {
        "nouns": [
            "street",
            "sky",
            "echo",
            "river",
            "mirror",
            "shadow",
            "heartbeat",
            "horizon",
            "signal",
            "storm",
            "silence",
            "neon",
        ],
        "verbs": [
            "chase",
            "hold",
            "break",
            "build",
            "breathe",
            "run",
            "rise",
            "fall",
            "drift",
            "ignite",
            "remember",
            "forgive",
        ],
        "adjectives": [
            "restless",
            "quiet",
            "wild",
            "tender",
            "heavy",
            "open",
            "brave",
            "faded",
            "golden",
            "electric",
        ],
        "adverbs": ["slow", "fast", "soft", "loud", "still", "again"],
    },
    "happy": {
        "nouns": ["sunrise", "laughter", "summer", "spark", "dancefloor", "confetti"],
        "verbs": ["shine", "laugh", "dance", "glow", "lift", "sing"],
        "adjectives": ["bright", "easy", "sweet", "carefree", "warm"],
        "adverbs": ["together", "forever", "anyway"],
    },
    "sad": {
        "nouns": ["goodbye", "distance", "letter", "winter", "tear", "memory"],
        "verbs": ["miss", "ache", "fade", "hide", "wait", "lose"],
        "adjectives": ["broken", "empty", "cold", "late", "lonely"],
        "adverbs": ["quietly", "barely", "slowly"],
    },
    "hype": {
        "nouns": ["crowd", "baseline", "city", "spotlight", "engine", "anthem"],
        "verbs": ["move", "push", "win", "flip", "charge", "roar"],
        "adjectives": ["loud", "bold", "unstoppable", "fresh", "steady"],
        "adverbs": ["right-now", "all-in", "full-speed"],
    },
}


GENRE_FLAVOR: Dict[str, Dict[str, Sequence[str]]] = {
    "pop": {
        "images": ["radio", "neon", "midnight", "rooftop", "city lights"],
        "phrases": ["on repeat", "no regrets", "hands up"],
    },
    "hiphop": {
        "images": ["concrete", "corner store", "late train", "headphones"],
        "phrases": ["no cap", "all grind", "stay ready"],
    },
    "rock": {
        "images": ["amplifier", "backstage", "thunder", "black leather"],
        "phrases": ["turn it up", "break the silence", "feel the noise"],
    },
    "country": {
        "images": ["dirt road", "front porch", "tailgate", "dusty boots"],
        "phrases": ["small town", "old truck", "back home"],
    },
    "afrobeats": {
        "images": ["dancehall", "sunset", "palm trees", "open air"],
        "phrases": ["we go dey", "no wahala", "good vibes"],
    },
}


TEMPLATES: Sequence[str] = (
    "I {verb} through the {adj} {noun} till the {rhyme}",
    "We {verb} in {image}, chasing {theme} in the {rhyme}",
    "Your {noun} got me feeling {adj}, like {theme} in the {rhyme}",
    "{phrase}, I {verb} {adv}, and I know it's {rhyme}",
    "If {theme} is a door, then I'm finding the {rhyme}",
    "No map for this {noun}, but we make it to {rhyme}",
)


CHORUS_HOOKS: Sequence[str] = (
    "{title} in the {rhyme}",
    "{title}, don't let go of the {rhyme}",
    "{title}, we glow in the {rhyme}",
    "{title}, we go all the way to {rhyme}",
)


def _normalize_word(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", s).strip()
    return re.sub(r"\s+", " ", s)


def _title_case(s: str) -> str:
    s = _normalize_word(s)
    return s.title() if s else "Untitled"


def _pick(rng: random.Random, options: Sequence[str], fallback: str) -> str:
    return rng.choice(options) if options else fallback


def _parse_structure(structure: str) -> List[str]:
    """
    Accepts formats like:
      - "V C V C B C"
      - "VCVCBC"
      - "verse chorus verse chorus bridge chorus"
    Returns a list of section codes: V, C, B, O.
    """
    raw = structure.strip()
    if not raw:
        return ["V", "C", "V", "C", "B", "C"]

    lowered = raw.lower()
    lowered = (
        lowered.replace("verse", "v")
        .replace("chorus", "c")
        .replace("bridge", "b")
        .replace("outro", "o")
    )
    tokens = re.split(r"\s+", lowered)
    if len(tokens) == 1 and re.fullmatch(r"[vcbo]+", tokens[0] or ""):
        chars = list(tokens[0])
        return [c.upper() for c in chars]

    cleaned: List[str] = []
    for tok in tokens:
        tok = tok.strip()
        if not tok:
            continue
        if tok in {"v", "c", "b", "o"}:
            cleaned.append(tok.upper())
    return cleaned or ["V", "C", "V", "C", "B", "C"]


@dataclass(frozen=True)
class SongSpec:
    title: str
    theme: str
    mood: str
    genre: str
    structure: List[str]
    rhyme: str
    seed: int | None


def _merge_banks(base: Dict[str, Sequence[str]], extra: Dict[str, Sequence[str]]) -> Dict[str, List[str]]:
    merged: Dict[str, List[str]] = {}
    for key in {"nouns", "verbs", "adjectives", "adverbs"}:
        merged[key] = list(base.get(key, ())) + list(extra.get(key, ()))
    return merged


def _select_word_banks(mood: str) -> Dict[str, List[str]]:
    base = WORD_BANKS["neutral"]
    extra = WORD_BANKS.get(mood, {})
    return _merge_banks(base, extra)


def _select_genre(genre: str) -> Dict[str, Sequence[str]]:
    return GENRE_FLAVOR.get(genre, GENRE_FLAVOR["pop"])


def _rhyme_words_for_scheme(rng: random.Random, scheme: str, lines: int) -> List[str]:
    if scheme == "none":
        return [""] * lines

    # Pick two rhyme families so ABAB doesn't feel too repetitive.
    fam_a = rng.choice(RHYME_FAMILIES)
    fam_b = rng.choice([f for f in RHYME_FAMILIES if f is not fam_a] or RHYME_FAMILIES)

    def pick_from(fam: Sequence[str]) -> str:
        return rng.choice(fam)

    if scheme == "AABB":
        half = lines // 2
        out = [pick_from(fam_a) for _ in range(half)] + [pick_from(fam_b) for _ in range(lines - half)]
        return out
    if scheme == "ABAB":
        out: List[str] = []
        for i in range(lines):
            out.append(pick_from(fam_a if i % 2 == 0 else fam_b))
        return out
    if scheme == "AAAA":
        return [pick_from(fam_a) for _ in range(lines)]
    return [""] * lines


def _make_line(
    rng: random.Random,
    *,
    template: str,
    banks: Dict[str, Sequence[str]],
    genre_flavor: Dict[str, Sequence[str]],
    theme: str,
    title: str,
    rhyme: str,
) -> str:
    verb = _pick(rng, banks.get("verbs", ()), "move")
    noun = _pick(rng, banks.get("nouns", ()), "sound")
    adj = _pick(rng, banks.get("adjectives", ()), "bright")
    adv = _pick(rng, banks.get("adverbs", ()), "again")
    image = _pick(rng, list(genre_flavor.get("images", ())), "the dark")
    phrase = _pick(rng, list(genre_flavor.get("phrases", ())), "right here")

    # Keep theme short-ish in-line; prefer the last 1-3 words if it's a long phrase.
    theme_clean = _normalize_word(theme)
    theme_words = theme_clean.split()
    theme_inline = " ".join(theme_words[-3:]) if theme_words else "this"

    title_clean = _title_case(title)
    rhyme_word = rhyme or _pick(rng, rng.choice(RHYME_FAMILIES), "night")

    line = template.format(
        verb=verb,
        noun=noun,
        adj=adj,
        adv=adv,
        image=image,
        phrase=phrase,
        theme=theme_inline,
        title=title_clean,
        rhyme=rhyme_word,
    )
    # Light cleanup: avoid double spaces and keep punctuation consistent.
    line = re.sub(r"\s+", " ", line).strip()
    return line


def _generate_section(
    rng: random.Random,
    *,
    section_code: str,
    index: int,
    spec: SongSpec,
    banks: Dict[str, Sequence[str]],
    genre_flavor: Dict[str, Sequence[str]],
    lines: int,
) -> List[str]:
    if section_code == "C":
        heading = "[Chorus]"
        hook_rhyme = rng.choice(rng.choice(RHYME_FAMILIES))
        hook = _make_line(
            rng,
            template=_pick(rng, CHORUS_HOOKS, "{title} in the {rhyme}"),
            banks=banks,
            genre_flavor=genre_flavor,
            theme=spec.theme,
            title=spec.title,
            rhyme=hook_rhyme,
        )
        rhyme_words = _rhyme_words_for_scheme(rng, spec.rhyme, max(lines - 2, 0))
        body = [
            _make_line(
                rng,
                template=_pick(rng, TEMPLATES, "I {verb} till the {rhyme}"),
                banks=banks,
                genre_flavor=genre_flavor,
                theme=spec.theme,
                title=spec.title,
                rhyme=rhyme_words[i] if i < len(rhyme_words) else "",
            )
            for i in range(max(lines - 2, 0))
        ]
        return [heading, hook, *body, hook]

    if section_code == "B":
        heading = "[Bridge]"
        # Bridges often drop rhyme and get more reflective.
        rhyme_words = _rhyme_words_for_scheme(rng, "none", lines)
        templates = [
            "Hold still, let the {noun} talk",
            "I was {adj}, now I'm {adj2}",
            "If it breaks, we'll {verb} it back",
            "One more breath, one more {noun}",
        ]
        out = [heading]
        for i in range(lines):
            template = _pick(rng, templates, "Hold still")
            line = _make_line(
                rng,
                template=template.replace("{adj2}", _pick(rng, banks.get("adjectives", ()), "brave")),
                banks=banks,
                genre_flavor=genre_flavor,
                theme=spec.theme,
                title=spec.title,
                rhyme=rhyme_words[i],
            )
            out.append(line)
        return out

    if section_code == "O":
        heading = "[Outro]"
        rhyme_words = _rhyme_words_for_scheme(rng, spec.rhyme if spec.rhyme != "ABAB" else "AABB", lines)
        out = [heading]
        for i in range(lines):
            line = _make_line(
                rng,
                template="Say it once more: {title} in the {rhyme}",
                banks=banks,
                genre_flavor=genre_flavor,
                theme=spec.theme,
                title=spec.title,
                rhyme=rhyme_words[i] if i < len(rhyme_words) else "",
            )
            out.append(line)
        return out

    # Default: Verse
    heading = f"[Verse {index}]"
    rhyme_words = _rhyme_words_for_scheme(rng, spec.rhyme, lines)
    out = [heading]
    for i in range(lines):
        out.append(
            _make_line(
                rng,
                template=_pick(rng, TEMPLATES, "I {verb} till the {rhyme}"),
                banks=banks,
                genre_flavor=genre_flavor,
                theme=spec.theme,
                title=spec.title,
                rhyme=rhyme_words[i] if i < len(rhyme_words) else "",
            )
        )
    return out


def generate_lyrics(
    *,
    title: str | None,
    theme: str,
    mood: str,
    genre: str,
    structure: str,
    seed: int | None,
    rhyme: str,
    verse_lines: int,
    chorus_lines: int,
    bridge_lines: int,
    outro_lines: int,
) -> Dict[str, object]:
    rng = random.Random(seed)

    theme_clean = _normalize_word(theme) or "dreams"
    mood_key = mood.strip().lower() or "neutral"
    genre_key = genre.strip().lower().replace("-", "").replace("_", "") or "pop"
    title_final = _title_case(title or f"{theme_clean} {mood_key}")

    spec = SongSpec(
        title=title_final,
        theme=theme_clean,
        mood=mood_key,
        genre=genre_key,
        structure=_parse_structure(structure),
        rhyme=rhyme,
        seed=seed,
    )

    banks = _select_word_banks(spec.mood)
    genre_flavor = _select_genre(spec.genre)

    lyrics_lines: List[str] = [spec.title, ""]
    verse_index = 1
    for code in spec.structure:
        if code == "V":
            lyrics_lines.extend(
                _generate_section(
                    rng,
                    section_code="V",
                    index=verse_index,
                    spec=spec,
                    banks=banks,
                    genre_flavor=genre_flavor,
                    lines=verse_lines,
                )
            )
            verse_index += 1
        elif code == "C":
            lyrics_lines.extend(
                _generate_section(
                    rng,
                    section_code="C",
                    index=0,
                    spec=spec,
                    banks=banks,
                    genre_flavor=genre_flavor,
                    lines=chorus_lines,
                )
            )
        elif code == "B":
            lyrics_lines.extend(
                _generate_section(
                    rng,
                    section_code="B",
                    index=0,
                    spec=spec,
                    banks=banks,
                    genre_flavor=genre_flavor,
                    lines=bridge_lines,
                )
            )
        elif code == "O":
            lyrics_lines.extend(
                _generate_section(
                    rng,
                    section_code="O",
                    index=0,
                    spec=spec,
                    banks=banks,
                    genre_flavor=genre_flavor,
                    lines=outro_lines,
                )
            )
        lyrics_lines.append("")

    # Trim trailing blank lines.
    while lyrics_lines and lyrics_lines[-1] == "":
        lyrics_lines.pop()

    return {
        "title": spec.title,
        "theme": spec.theme,
        "mood": spec.mood,
        "genre": spec.genre,
        "structure": spec.structure,
        "rhyme": spec.rhyme,
        "seed": spec.seed,
        "lyrics": "\n".join(lyrics_lines),
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate simple song lyrics (offline).")
    parser.add_argument("--theme", default="dreams", help="What the song is about.")
    parser.add_argument("--mood", default="neutral", help="neutral|happy|sad|hype (or any string).")
    parser.add_argument("--genre", default="pop", help="pop|hiphop|rock|country|afrobeats (or any string).")
    parser.add_argument("--title", default=None, help="Optional title. If omitted, a title is generated.")
    parser.add_argument("--structure", default=DEFAULT_STRUCTURE, help=f'Section order, e.g. "{DEFAULT_STRUCTURE}"')
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducible output.")
    parser.add_argument("--rhyme", default="ABAB", choices=["none", "AAAA", "AABB", "ABAB"], help="End-rhyme scheme.")
    parser.add_argument("--verse-lines", type=int, default=8)
    parser.add_argument("--chorus-lines", type=int, default=6)
    parser.add_argument("--bridge-lines", type=int, default=4)
    parser.add_argument("--outro-lines", type=int, default=4)
    parser.add_argument("--format", default="text", choices=["text", "json"], help="Output format.")
    parser.add_argument("--out", default=None, help="Write output to a file instead of stdout.")
    args = parser.parse_args(argv)

    result = generate_lyrics(
        title=args.title,
        theme=args.theme,
        mood=args.mood,
        genre=args.genre,
        structure=args.structure,
        seed=args.seed,
        rhyme=args.rhyme,
        verse_lines=args.verse_lines,
        chorus_lines=args.chorus_lines,
        bridge_lines=args.bridge_lines,
        outro_lines=args.outro_lines,
    )

    if args.format == "json":
        payload = json.dumps(result, indent=2, ensure_ascii=True) + "\n"
    else:
        payload = str(result["lyrics"]).rstrip() + "\n"

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(payload)
    else:
        print(payload, end="")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
