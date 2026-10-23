# Colorguard toss counting — research notes

Researched 2026-10-23 to decide how Guardrr should model toss calls, following
Niv's feedback that "toss counts can be on any count ideally."

## What the sources say

### Two naming systems

1. **By rotations** — single, double, triple, quad (and "fives", "sixes") are
   the number of full rotations the equipment makes in the air. This is the
   usual rifle/sabre vocabulary, and flag singles/doubles are named the same
   way. ([Color Guard Glossary][glossary])
2. **By counts** — a "3-count toss", "3ct aerial", "5 count" names how many
   counts the toss takes from release to catch. Cal Poly's audition sheet says
   "a Single Toss is a 3 count toss"; Marshalltown's flag basics teach a
   "3ct Aerial". ([Cal Poly][calpoly], [Marshalltown][bobcat])

Rotations and counts are related but not the same thing: the count length of
a single depends on height and tempo. Guardrr's calls are **count-based**
("catch on 5"), which is what a metronome can actually cue.

### Release

- The release lands on **count 1**, with the push/prep on the "and" of 8 of a
  "5, 6, 7, 8" countdown. ([Spintronix][spintronix])
- Marshalltown writes the release as "8+1": the motion starts on the "and" of
  8 and the flag leaves the hand on 1. ([Marshalltown][bobcat])
- The DrillMaster's colorguard rifle exercise counts the release as "and one".
  ([The DrillMaster][drillmaster])

### Catch

- An N-count toss is **caught on count N** after a release on 1: the 3ct
  aerial is released on 1, held on 2, caught on 3. ([Marshalltown][bobcat])
- Catches can land on **"and" counts**. The DrillMaster's rifle exercises catch
  a single on 2, a double on "2 and", a triple on 3 and a quad on "3 and"
  (beginners may let a quad drift to 4). ([The DrillMaster][drillmaster])
- Higher tosses need more counts; the right hand's height at release decides
  the height. Basics are taught "count by count" and then sped up.
  ([The Instrumentalist][instrumentalist])

### Prep

- Typical countdown: "5, 6, 7, 8" with the prep on 8 (singles can skip it);
  doubles and up add a boost/"hit" before the release.
  ([Spintronix][spintronix], [The DrillMaster][drillmaster])

## Decisions for Guardrr

1. **Release stays on count 1 of the phrase.** All sources agree.
2. **A call of N means "catch on count N" of the same phrase.** Matches the
   count-naming system and the premise.
3. **Calls may be on any count the phrase allows**, not just 1–7: the engine
   accepts any call whose catch lands within the phrase (up to count 16 in a
   16-count phrase, 32 in a 32). The default range stays 1–7 because that's
   what typical flag/rifle tosses take, but the user can widen it.
4. **"And" calls are supported** (optional, off by default): a call of 2.5 is
   spoken "two and" and caught on the "and" after 2 — the catch timing the
   DrillMaster uses for doubles and quads.
5. **A "1" call is a pop toss caught on the "and" of 1.** Released and caught
   on the same count is physically impossible, and a pop toss (a quick, low
   toss) is the only toss short enough. So "1" and "1 and" catch at the same
   moment; "1" is kept as the name because that's how it's called.
6. Rotation names (single/double/…) are **not** modelled: how many counts a
   double takes depends on the performer and the tempo. A future preset could
   map them to count calls.

## Sources

- [The DrillMaster — Drillers: Adopt the Colorguard Rifle Toss][drillmaster]
- [Marshalltown Bobcat Color Guard — Flag tosses][bobcat]
- [Spintronix — How to toss a rifle][spintronix]
- [Cal Poly Mustang Band — Colorguard audition instructions][calpoly]
- [Color Guard Gifts — Color Guard Glossary][glossary]
- [The Instrumentalist — flag basics article][instrumentalist]

[drillmaster]: https://thedrillmaster.org/2012/07/05/drillers-adopt-the-colorguard-rifle-toss/
[bobcat]: https://bobcatcolorguard.yolasite.com/flag-tosses.php
[spintronix]: https://www.spintronixguard.org/post/how-to-toss-a-rifle-how-to-color-guard
[calpoly]: https://mband.calpoly.edu/auditions/colorguard.html
[glossary]: https://www.colorguardgifts.com/blogs/news/color-guard-glossary
[instrumentalist]: https://theinstrumentalist.com/?p=2593
