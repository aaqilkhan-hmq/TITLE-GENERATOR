"""Item specifics -> listing title + item specifics + price.  Pure Python, no AI.

Input is the 'Field: Value' block your team already writes (eBay item specifics),
optionally with a draft 'Title:' line:

    Title: Sabatier Knife Block Set 2M927 White Handles Kitchen
    Brand: Sabatier
    Type: Knife Block Set
    Handle Color: White
    ...

Rules (all plain code):
  * Every field has a role: CORE (always in the title), EXTRA (in the title if it fits,
    in priority order), or SPECIFICS (never in the title - goes to item specifics).
  * Brand, product line, model / style / set number, type, size are never dropped.
  * Words in the draft title that no field explains (model numbers, team / sponsor /
    character names like 'Bud King Of Beers') are kept - they are usually what buyers search.
  * Repeated words are removed ('White' + 'White Handles' -> 'White Handles').
  * Titles are capped at 80 characters by dropping the lowest-priority extras first.
  * Price comes from sold items that share the brand and item type; other comps
    (e.g. jackets when pricing a shirt) are filtered out.
"""
import re

def _numpy():
    import numpy as np
    return np

MAX_LEN = 80

# field name (normalised) -> (role, slot, priority)  lower priority number = kept first
FIELDS = {
    "brand": ("core", "brand", 0),
    "product line": ("core", "line", 0),
    "model": ("core", "model", 0), "mpn": ("core", "model", 0), "model number": ("core", "model", 0),
    "style code": ("core", "model", 0), "set number": ("core", "model", 0), "lego set number": ("core", "model", 0),
    "character": ("core", "subject", 0), "team": ("core", "subject", 0), "player": ("core", "subject", 0),
    "franchise": ("core", "subject", 0), "artist": ("core", "subject", 0), "author": ("core", "subject", 0),
    "type": ("core", "type", 0), "item type": ("core", "type", 0), "product type": ("core", "type", 0),
    "style": ("extra", "detail", 3),
    "size": ("core", "size", 0), "size (men's)": ("core", "size", 0), "size (women's)": ("core", "size", 0),
    "us shoe size": ("core", "size", 0), "waist size": ("core", "size", 0), "size type": ("specifics", None, 9),
    "department": ("core", "gender", 0),
    "color": ("extra", "color", 1), "main color": ("extra", "color", 1),
    "handle color": ("extra", "detail", 2),
    "material": ("extra", "material", 2), "outer shell material": ("extra", "material", 2),
    "blade material": ("extra", "material", 2), "upper material": ("extra", "material", 3),
    "block material": ("extra", "detail", 4),
    "sleeve length": ("extra", "detail", 3),
    "closure": ("extra", "detail", 3), "neckline": ("extra", "detail", 3), "fit": ("extra", "detail", 4),
    "rise": ("extra", "detail", 4), "inseam": ("specifics", None, 9),
    "leg style": ("extra", "detail", 1), "wash": ("extra", "detail", 2), "silhouette": ("extra", "detail", 2),
    "heel height": ("extra", "detail", 4), "toe shape": ("extra", "detail", 5), "shaft height": ("extra", "detail", 4),
    "back pocket style": ("specifics", None, 9), "fabric wash": ("extra", "detail", 2),
    "theme": ("extra", "detail", 2), "vintage": ("extra", "vintage", 1),
    "pattern": ("extra", "detail", 5), "accents": ("extra", "detail", 6), "features": ("specifics", None, 9),
    "condition": ("special", "condition", 0),
}
# fields that never belong in a title
SPECIFICS_ONLY = {"country/region of manufacture", "country of manufacture", "blade finish", "handle finish",
                  "handle material", "graphic print", "set includes", "knife type", "care instructions",
                  "fabric type", "lining material", "occasion", "season", "number of pieces", "features",
                  "department"}  # department handled as gender, then listed in specifics too
GENERIC_VALUES = {"solid", "assorted", "n/a", "na", "none", "unbranded", "does not apply", "-", "yes", "no",
                  "kitchen", "home", "unisex adult"}
GENDER = {"men": "Mens", "mens": "Mens", "men's": "Mens", "women": "Womens", "womens": "Womens",
          "women's": "Womens", "boys": "Boys", "girls": "Girls", "unisex": "Unisex", "kids": "Kids",
          "baby": "Baby", "unisex adults": "Unisex", "unisex adult": None}
STOP = {"the", "and", "of", "with", "in", "for", "a", "w", "w/"}

# order of slots in the title: apparel vs everything else
APPAREL_ORDER = ["vintage", "brand", "gender", "color", "line", "subject", "model", "material", "detail", "type", "size", "cond"]
GENERAL_ORDER = ["vintage", "brand", "line", "model", "subject", "type", "material", "detail", "color", "gender", "size", "cond"]
APPAREL_HINT = re.compile(r"shirt|tee|top|blouse|dress|skirt|pants|jeans|shorts|jacket|coat|hoodie|sweater|"
                          r"sweatshirt|jersey|polo|vest|cardigan|shoes|sneakers|boots|sandals|heels|bra|"
                          r"leggings|suit|blazer|hat|cap|swim|bag|purse|tote|wallet|handbag|backpack|clutch|satchel|crossbody|hobo", re.I)
TYPE_GENERIC = {"set", "lot", "kit", "pack", "bundle", "piece", "pieces", "pc", "and", "with", "of"}


def _words(s):
    return re.findall(r"[a-z0-9]+", re.sub(r"'s\b|’s\b", "", s.lower()))


def _tc(v):
    """Title-case a value but keep codes and existing capitals (2M927, NASCAR, iPhone)."""
    out = []
    for w in v.split():
        if any(c.isdigit() for c in w) or (w.isupper() and len(w) > 1) or (w[:1].islower() and any(c.isupper() for c in w[1:])):
            out.append(w)
        elif w.lower() in STOP and out:
            out.append(w.lower() if w.lower() != "w/" else "W/")
        else:
            out.append(w[:1].upper() + w[1:].lower() if w.islower() or w.isupper() else w)
    return " ".join(out)


def parse(text):
    """'Field: Value' lines -> (draft_title, [(field, value), ...])."""
    title, fields = "", []
    for line in text.splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        k, v = k.strip().lower(), v.strip()
        if not v:
            continue
        if k == "title":
            title = v
        else:
            fields.append((k, v))
    return title, fields


class ListingBuilder:
    def __init__(self, engine):
        self.eng = engine

    def build(self, text, channel=None, with_price=True):
        draft, fields = parse(text)
        parts, specifics = [], []          # parts: dict(text, slot, prio, field)
        is_apparel = False
        for k, v in fields:
            role, slot, prio = FIELDS.get(k, (None, None, 9))
            if k == "department":
                g = GENDER.get(v.lower())
                if g:
                    parts.append(dict(text=g, slot="gender", prio=0, field=k))
                specifics.append((k, v))
                continue
            if k == "condition":
                vl = v.lower()
                tag = ("NWT" if "new with tags" in vl else "New in Box" if "new in box" in vl or "new with box" in vl
                       else "NWOT" if "without tags" in vl else "For Parts" if "parts" in vl else "")
                if tag:
                    parts.append(dict(text=tag, slot="cond", prio=0, field=k))
                specifics.append((k, v))
                continue
            if k == "vintage":
                if v.lower() == "yes":
                    parts.append(dict(text="Vintage", slot="vintage", prio=1, field=k))
                specifics.append((k, v))
                continue
            if k in SPECIFICS_ONLY or role in (None, "specifics") or v.lower() in GENERIC_VALUES:
                specifics.append((k, v))
                continue
            if "%" in v:                                   # fibre blends: keep the main fibre only
                specifics.append((k, v))
                main = re.findall(r"\d+%\s*([A-Za-z]+)", v)
                if not main:
                    continue
                v = main[0]
                prio = max(prio, 4)
            val = _tc(v)
            if k == "handle color":
                val = f"{val} Handles"
            elif k == "block material":
                val = f"{val} Block"
            elif k in ("wash", "fabric wash") and "wash" not in v.lower():
                val = f"{val} Wash"
            elif k == "theme" and slot == "detail":
                val = val
            if slot == "size":
                val = "Size " + re.sub(r"^(size|sz)\s*", "", val, flags=re.I)
            if slot == "type" and APPAREL_HINT.search(v):
                is_apparel = True
            if slot == "size" and k != "size":
                is_apparel = True
            parts.append(dict(text=val, slot=slot, prio=prio if role == "extra" else 0, field=k))
            if role == "extra" and "%" not in fields[[f for f, _ in fields].index(k)][1]:
                specifics.append((k, v))

        # words in the draft title that no field explains -> keep (model numbers, names, sponsors)
        covered = set()
        for p in parts:
            covered |= set(_words(p["text"]))
        for k, v in fields:
            if k in ("department",):
                covered |= set(_words(v))
            if k == "product line" or k == "type":
                covered |= set(_words(v))
        covered |= {"handle", "handles", "size", "sz", "mens", "womens", "men", "women"}
        def owner(word):                          # which field part explains this draft word
            for p in parts:
                if word in _words(p["text"]):
                    return p
            return None
        runs, cur, anchor, last = [], [], None, None
        for w in draft.split():
            wk = _words(w)
            explained = bool(wk) and all(x in covered for x in wk)
            if explained:
                if cur:
                    runs.append((cur, anchor)); cur = []
                last = owner(wk[0]) or last
                continue
            if not cur:
                anchor = last
            cur.append(w)
        if cur:
            runs.append((cur, anchor))
        spec_vals = {x for k, v in fields for x in _words(v)}
        for words, anchor in runs:
            while words and words[-1].lower() in STOP:      # no dangling 'with'/'of'
                words = words[:-1]
            while words and words[0].lower() in STOP:
                words = words[1:]
            if not words:
                continue
            run = " ".join(words)
            ws = _words(run)
            if all(x in spec_vals for x in ws) and not any(any(c.isdigit() for c in x) for x in ws):
                continue                                     # e.g. 'Kitchen' (a value we kept out on purpose)
            is_code = bool(re.fullmatch(r"(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9-]{4,}", run))
            if not is_code:
                run = re.sub(r"(?<![\w#])(\d{1,2})(?![\w.])", r"#\1", run)
            slot = "model" if is_code else (anchor["slot"] if anchor and anchor["slot"] not in ("size", "cond") else "subject")
            parts.append(dict(text=_tc(run), slot=slot, prio=0, field="draft title"))

        is_apparel = is_apparel or any(p["slot"] == "gender" for p in parts)
        title, used, kept = self._assemble(parts, is_apparel)
        res = {"title": title, "length": len(title), "apparel": is_apparel,
               "item_specifics": [f"{_tc(k)}: {v}" for k, v in specifics],
               "dropped_for_length": [p["text"] for p in kept if p not in used]}
        if with_price:
            res.update(self.price(parts, channel))
            if not any(p["slot"] == "gender" for p in parts) and res.get("comps"):
                g = [w for c in res["comps"] for w in ("Mens", "Womens") if re.search(rf"\b{w}\b", c["title"], re.I)]
                if g:
                    top = max(set(g), key=g.count)
                    if g.count(top) >= 0.8 * len(res["comps"]):
                        res["hints"] = [f"No Department given; {g.count(top)} of {len(res['comps'])} comps are {top}. "
                                        f"Add 'Department: {top[:-1]}' if correct."]
        return res

    def _assemble(self, parts, is_apparel):
        order = APPAREL_ORDER if is_apparel else GENERAL_ORDER
        # remove parts whose words are all contained in another part (White vs White Handles)
        keep = []
        for p in parts:
            pw = set(_words(p["text"]))
            dup = any(q is not p and pw <= set(_words(q["text"])) and (len(set(_words(q["text"]))) > len(pw) or parts.index(q) < parts.index(p))
                      for q in parts)
            if not dup:
                keep.append(p)
        core = [p for p in keep if p["prio"] == 0]
        extras = sorted([p for p in keep if p["prio"] > 0], key=lambda p: p["prio"])
        used = list(core)

        def render(ps):
            ps = sorted(ps, key=lambda p: (order.index(p["slot"]) if p["slot"] in order else 6, parts.index(p)))
            return " ".join(p["text"] for p in ps)

        for e in extras:
            if len(render(used + [e])) <= MAX_LEN:
                used.append(e)
        title = render(used)
        if len(title) > MAX_LEN:                      # core alone too long: trim subject words last-resort
            title = title[:MAX_LEN].rsplit(" ", 1)[0]
        return title, used, keep

    # ---- price from comps that share brand + item type --------------------------
    def price(self, parts, channel=None):
        get = lambda s: " ".join(p["text"] for p in parts if p["slot"] == s)
        brand, ptype = get("brand"), get("type")
        query = " ".join(x for x in [brand, get("line"), get("subject"), get("model"), get("gender"), ptype] if x)
        r = self.eng.price(query, k=60, margin=1.0, channel=channel)
        comps = r.get("comps", [])
        type_words = [w for w in _words(ptype) if w not in TYPE_GENERIC]
        type_re = re.compile(r"\b(" + "|".join(re.escape(w) + "e?s?" for w in type_words) + r")\b", re.I) if type_words else None
        brand_words = _words(brand)

        def has_type(t):
            return bool(type_re.search(t)) if type_re else True

        def has_brand(t):
            return all(w in _words(t) for w in brand_words) if brand_words else True

        codes = [w for p in parts if p["slot"] == "model" for w in _words(p["text"]) if any(ch.isdigit() for ch in w)]
        exact = [c for c in comps if codes and any(cd in _words(c["title"]) for cd in codes)]
        if len(exact) >= 3:
            exact = exact[:20]
            p = _numpy().array([c["price"] for c in exact])
            p25, med, p75 = _numpy().percentile(p, [25, 50, 75])
            return {"price": round(float(med), 2), "range": [round(float(p25), 2), round(float(p75), 2)],
                    "confidence": "high" if len(exact) >= 5 else "medium",
                    "basis": f"{len(exact)} sold items with the same model / set number", "query": query,
                    "n_comps": len(exact), "comps": exact[:10]}
        both = [c for c in comps if has_type(c["title"]) and has_brand(c["title"])]
        typed = [c for c in comps if has_type(c["title"])]
        if len(both) >= 5:
            use, basis = both, f"{min(len(both), 20)} closest sold items with the same brand and item type"
        elif len(typed) >= 5:
            use, basis = typed, f"only {len(both)} same-brand matches; using {len(typed)} items of the same type"
        else:
            use, basis = comps[:15], "few matching items; using closest titles (check comps)"
        use = use[:20]
        if not use:
            return {"price": None, "confidence": "none", "basis": "no comps", "comps": []}
        p = _numpy().array([c["price"] for c in use])
        p25, med, p75 = _numpy().percentile(p, [25, 50, 75])
        conf = ("high" if len(both) >= 8 and p75 / max(p25, .01) <= 2.5 else
                "medium" if len(both) >= 5 else "low")
        return {"price": round(float(med), 2), "range": [round(float(p25), 2), round(float(p75), 2)],
                "confidence": conf, "basis": basis, "query": query, "n_comps": len(use), "comps": use[:10]}
