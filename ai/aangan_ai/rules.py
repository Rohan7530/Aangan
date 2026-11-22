"""Scam rule layer: weighted regex rules, no network.

Covers English, Hindi (Devanagari), Hinglish (Hindi in Latin letters) and
Marathi. Each rule belongs to a category, or is a cross-cutting booster
(urgency, secrecy, money amount) that only raises the score.

Score = clamp(sum of weights of matching rules, 0, 100). Each rule counts once.
Category = the specific category with the highest summed weight; the generic
ones (link_phishing, payment_request) win only when nothing specific matched.
A category matched only by SUPPORTING rules counts as generic.

Note: Python's \\b does not work inside Devanagari words (vowel signs are not
"word" characters), so Devanagari patterns are plain substrings.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

CATEGORIES = (
    "digital_arrest",
    "kyc_bank",
    "otp",
    "lottery_prize",
    "family_emergency",
    "investment",
    "job",
    "parcel_customs",
    "utility_bill",
    "link_phishing",
    "payment_request",
)
GENERIC = {"link_phishing", "payment_request"}
# Rules too weak to name a category on their own (they still add to the score).
SUPPORTING = {"urgent_money", "video_call"}
BOOSTERS = ("urgency", "secrecy", "money_amount")

# Up to N words in between: "share the 6 digit OTP".
_GAP = r"\W+(?:\w+\W+){0,%d}"


@dataclass(frozen=True)
class Rule:
    id: str
    group: str  # a category or a booster name
    weight: int
    pattern: re.Pattern[str]


@dataclass(frozen=True)
class Hit:
    id: str
    group: str
    weight: int
    match: str


@dataclass(frozen=True)
class Analysis:
    score: int
    category: str | None
    hits: tuple[Hit, ...]

    @property
    def groups(self) -> list[str]:
        """Matched groups, strongest first, without duplicates."""
        totals: dict[str, int] = {}
        for h in self.hits:
            totals[h.group] = totals.get(h.group, 0) + h.weight
        return sorted(totals, key=lambda g: -totals[g])


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    return s.replace("’", "'").replace("‘", "'").replace("​", "")


def _r(id: str, group: str, weight: int, *patterns: str) -> Rule:
    # NFC also splits precomposed nukta letters (फ़ -> फ + ़), so "फ़?" in a
    # pattern means "with or without the nukta".
    source = "|".join(_norm(p) for p in patterns)
    return Rule(id, group, weight, re.compile(source, re.IGNORECASE))


RULES: tuple[Rule, ...] = (
    # ---- digital arrest ----------------------------------------------------
    _r("digital_arrest_words", "digital_arrest", 50, r"digital(ly)? arrest", r"डिजिटल अरेस्ट", r"डिजिटल अटक"),
    _r(
        "authority",
        "digital_arrest",
        20,
        r"\b(cbi|police|customs officer|enforcement directorate|ed officer|narcotics|ncb|cyber ?cell|cyber crime|crime branch|rbi officer|trai|income tax officer|mumbai police|delhi police)\b",
        r"पुलिस",
        r"पोलीस",
        r"सीबीआई",
        r"साइबर (सेल|क्राइम)",
        r"नारकोटिक्स",
        r"\b(pulis|polis)\b",
    ),
    _r(
        "arrest",
        "digital_arrest",
        30,
        r"\barrest(ed)?\b",
        r"\b(arrest )?warrant\b",
        r"money laundering",
        r"legal action",
        r"\bjail\b",
        r"court (case|order|notice|hearing|summons?)",
        r"\bfir (registered|darj|filed|lodged|against)\b",  # bare "fir" is Hinglish "phir"
        r"giraft?aa?r",
        r"गिरफ़?्तार",
        r"वारंट",
        r"हवालात",
        r"मनी लॉन्ड्रिंग",
        r"अटक (करू|होईल|केली|होणार|करण्यात)",
        r"अटकेची",
        r"कोर्ट (केस|नोटीस|का नोटिस)",
    ),
    _r("video_call", "digital_arrest", 5, r"video ?call", r"वीडियो कॉल", r"व्हिडिओ कॉल", r"व्हिडीओ कॉल"),
    # ---- KYC / bank -------------------------------------------------------
    _r("kyc", "kyc_bank", 30, r"\bkyc\b", r"\be-?kyc\b", r"केवाईसी", r"केवायसी"),
    _r(
        "account_blocked",
        "kyc_bank",
        30,
        r"(account|a/c|card)( will be| is| has been| shall be)? (blocked|suspended|frozen|closed|deactivated|locked)",
        r"(account|khata|khaata)\W+(\w+\W+){0,3}(band|block) (ho|kar)",
        r"(खाता|खाते|अकाउंट|अकाऊंट)\W+(\S+\W+){0,3}(बंद|ब्लॉक|सस्पेंड|फ्रीज)",
    ),
    _r(
        "pan_aadhaar",
        "kyc_bank",
        25,
        r"\b(pan|aadhaa?r)( card)?( is| not)? (link|updat|verif)\w*",
        r"(link|update|verify) (your )?(pan|aadhaa?r)\b",
        r"(पैन|आधार)(\s*कार्ड)?\W+(\S+\W+){0,3}(लिंक|अपडेट|वेरिफ़?|व्हेरिफ़?)",
    ),
    _r("expires_today", "kyc_bank", 15, r"expir(es|ing|ed) today", r"आज (समाप्त|एक्सपायर)"),
    # ---- OTP / PIN --------------------------------------------------------
    _r(
        "secret_code",
        "otp",
        25,
        r"\b(otp|cvv|upi pin|atm pin|m-?pin|one[- ]time password)\b",
        r"ओटीपी",
        r"ओ\.टी\.पी",
    ),
    _r(
        "share_code",
        "otp",
        20,
        r"\b(share|send|tell|give|forward|read out|bata\w*|bhej\w*|de ?do)" + (_GAP % 4) + r"(otp|pin|cvv|code)\b",
        r"\b(otp|pin|cvv|code)" + (_GAP % 3) + r"(share|send|tell|bata\w*|bhej\w*|de ?do|batana)\b",
        r"(ओटीपी|पिन|कोड|OTP|PIN|CVV)\W+(\S+\W+){0,3}(बताएं|बताएँ|बताओ|बता दो|बता दें|भेजो|भेजें|भेज दो|शेयर|सांगा|पाठवा)",
    ),
    # ---- lottery / prize --------------------------------------------------
    _r(
        "lottery",
        "lottery_prize",
        30,
        r"lottery",
        r"lucky ?draw",
        r"\bkbc\b",
        r"kaun banega crorepati",
        r"jackpot",
        r"lucky winner",
        r"you('ve| have)? won",
        r"लॉटरी",
        r"लकी ड्रॉ",
        r"केबीसी",
        r"कौन बनेगा करोड़?पति",
        r"आपने\W+(\S+\W+){0,4}जीत",
        r"(lottery|inaam|inam) (lagi|laga|jeeta|jita)",
    ),
    _r(
        "prize",
        "lottery_prize",
        15,
        r"\bprize\b",
        r"cash ?back",
        r"free gift",
        r"gift (voucher|hamper)",
        r"claim (your|it|now)",
        r"\binaa?m\b",
        r"इनाम",
        r"ईनाम",
        r"बक्षीस",
        r"बक्षिस",
    ),
    # ---- family emergency -------------------------------------------------
    _r(
        "new_number",
        "family_emergency",
        20,
        r"new number",
        r"changed my number",
        r"\b(naya|nava) (number|no\.?)\b",
        r"नया नंबर",
        r"नए नंबर",
        r"नवीन नंबर",
        r"नवा नंबर",
    ),
    _r(
        "trouble",
        "family_emergency",
        15,
        r"\baccident\b",
        r"in (the )?hospital",
        r"hospital (me|mein|main|madhe)\b",
        r"in (big )?trouble",
        r"police station",
        r"lost my phone",
        r"phone (kho|kharab|toot|chori)",
        r"एक्सीडेंट",
        r"ऐक्सिडेंट",
        r"दुर्घटना",
        r"अपघात",
        r"अस्पताल",
        r"हॉस्पिटल",
        r"मुसीबत",
        r"फ़?ोन (खो|ख़?राब|टूट|चोरी)",
    ),
    _r(
        "urgent_money",
        "family_emergency",
        20,
        r"\b(urgent(ly)?|immediately|turant|jaldi|abhi)" + (_GAP % 4) + r"(money|paise|paisa|rupees|₹|rs\b)",
        r"\b(money|paise|paisa)" + (_GAP % 4) + r"(urgent(ly)?|immediately|turant|jaldi)\b",
        r"(तुरंत|जल्दी|अभी)\W+(\S+\W+){0,4}(पैसे|रुपये|रुपए|₹)",
        r"(पैसे|रुपये|रुपए)\W+(\S+\W+){0,4}(तुरंत|जल्दी)",
        r"पैशांची गरज",
        r"पैसों की (सख़?्त )?ज़?रूरत",
    ),
    # ---- investment -------------------------------------------------------
    _r(
        "double_money",
        "investment",
        35,
        r"double (your )?(money|amount|investment)",
        r"(money|paise|paisa|amount) (double|doguna)",
        r"guarantee(d)? (returns?|profit|income)",
        r"\d+ ?% (returns?|profit|monthly|daily|weekly)",
        r"(daily|weekly|monthly) (returns?|profit) of",
        r"risk[- ]free (returns?|profit|investment)",
        r"पैसे? (डबल|दोगुन)",
        r"दोगुना",
        r"दुप्पट",
        r"गारंटी\S*\W+(\S+\W+){0,2}(रिटर्न|मुनाफ़?ा|लाभ|नफा)",
    ),
    _r(
        "invest_words",
        "investment",
        20,
        r"\b(crypto|bitcoin|forex|usdt)\b",
        r"stock tips?",
        r"share market tips?",
        r"trading (group|tips|app|platform)",
        r"invest now",
        r"क्रिप्टो",
        r"बिटकॉइन",
        r"शेयर (मार्केट )?टिप्स",
        r"निवेश करें",
    ),
    # ---- job --------------------------------------------------------------
    _r(
        "easy_earning",
        "job",
        35,
        r"earn\W+(\w+\W+){0,2}?(₹|rs\.?|inr)?\s?\d[\d,]*k?\s*(per |a |every |/)?\s*(day|daily|hour|task|week)",
        r"(like|rate|review) (youtube |google )?(videos?|hotels?|products?) (and|to) earn",
        r"(simple|easy|online) tasks?\b",
        r"task[- ]based",
        r"telegram (task|job|group)",
        r"ghar baithe (kamao|kamaye|kamaiye|paise|earn)",
        r"घर बैठे\W+(\S+\W+){0,3}(कमा|पैसे|कमाई)",
        r"घरबसल्या\W+(\S+\W+){0,3}(कमवा|कमाई|पैसे)",
        r"रोज़?\W+(₹|\d)\S*\W+(\S+\W+){0,2}कमा",
    ),
    _r(
        "job_offer",
        "job",
        25,
        r"work from home (job|opportunity|offer)",
        r"part[- ]time (job|work|income)",
        r"online job",
        r"selected for (a |the )?(part[- ]time |online |home )?(job|work)",
        r"data entry (job|work)",
        r"earn (money )?from home",
        r"पार्ट ?टाइम",
        r"वर्क फ्रॉम होम",
    ),
    # ---- parcel / customs -------------------------------------------------
    _r(
        "parcel_held",
        "parcel_customs",
        30,
        r"\b(parcel|package|courier|shipment|consignment)" + (_GAP % 5) + r"(held|seized|stuck|detained|on hold|illegal|drugs|returned)\b",
        r"customs (duty|clearance|fee|charges?)",
        r"(पार्सल|कूरियर|कुरियर)\W+(\S+\W+){0,5}(रोका|ज़?ब्त|फँसा|फंसा|अटका|अडकले|ड्रग्स)",
        r"कस्टम (ड्यूटी|शुल्क|चार्ज)",
        r"parcel (ruka|atka|pakda)",
    ),
    _r(
        "courier",
        "parcel_customs",
        15,
        r"\b(fedex|dhl|blue ?dart|india post|courier)\b",
        r"पार्सल",
        r"कूरियर",
        r"कुरियर",
    ),
    # ---- utility bill -----------------------------------------------------
    _r(
        "power_cut",
        "utility_bill",
        20,
        r"\b(electricity|power|light|bijli|bijlee)\b" + (_GAP % 6) + r"(cut|disconnect\w*|kat|kaat|band)\b",
        r"(बिजली|वीज|लाइट)\W+(\S+\W+){0,6}(कट|काट|बंद|खंडित)",
    ),
    _r(
        "disconnect_tonight",
        "utility_bill",
        25,
        r"\b(connection|connexion)" + (_GAP % 4) + r"(cut|disconnect\w*|kat|kaat)",
        r"disconnect\w* (tonight|today)",
        r"(tonight|aaj raat)" + (_GAP % 6) + r"(cut|disconnect\w*|kat|kaat)",
        r"electricity officer",
        r"(previous|last) month('s)? bill (is |was )?not (updated?|paid)",
        r"कनेक्शन\W+(\S+\W+){0,4}(कट|काट|खंडित)",
        r"आज रात\S*\W+(\S+\W+){0,6}(कट|काट|बंद)",
        r"बिल अपडेट नहीं",
    ),
    # ---- links / remote apps ----------------------------------------------
    _r(
        "short_link",
        "link_phishing",
        25,
        r"\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|rb\.gy|is\.gd|shorturl\.at|tiny\.cc|ow\.ly|t\.ly)/",
    ),
    _r("apk", "link_phishing", 35, r"\.apk\b", r"\bapk (file|download|install)", r"एपीके"),
    _r(
        "remote_app",
        "link_phishing",
        35,
        r"any ?desk",
        r"team ?viewer",
        r"quick ?support",
        r"rust ?desk",
        r"airdroid",
        r"screen ?shar(e|ing) (app|karo|kare)",
        r"एनीडेस्क",
    ),
    _r(
        "click_link",
        "link_phishing",
        20,
        r"click (on )?(this|the|below|given)? ?(link|url)",
        r"click here",
        r"tap (on )?(the|this) link",
        r"link (par|pe|pr) click",
        r"लिंक (पर|पे) क्लिक",
        r"लिंक (खोलें|खोलो|ओपन)",
        r"लिंकवर क्लिक",
    ),
    _r(
        "lookalike",
        "link_phishing",
        25,
        r"\b(sbi|hdfc|icici|axis|kotak|paytm|aadhaa?r|uidai|irctc|epfo|npci|bses|msedcl|mahadiscom)[a-z0-9]*-[a-z0-9-]+\.[a-z]{2,}",
    ),
    _r("any_link", "link_phishing", 10, r"https?://", r"\bwww\."),
    # ---- payment request --------------------------------------------------
    _r(
        "upi_collect",
        "payment_request",
        35,
        r"collect request",
        r"upi (request|collect)",
        r"approve (the |this )?(payment|request)",
        r"enter (your )?(upi )?pin to (receive|get)",
        r"scan (this|the) qr (code )?to (receive|get)",
        r"पैसे (पाने|लेने) के लिए\W+(\S+\W+){0,4}(पिन|स्कैन)",
        r"request (accept|approve) (kar|karo|kare)",
    ),
    _r(
        "send_money",
        "payment_request",
        20,
        r"send (me )?(the )?(money|amount|payment)",
        r"send (₹|rs\.?|inr)\s?\d",
        r"transfer (the )?(money|amount|funds|₹|rs)",
        r"pay now",
        r"make (the )?payment",
        r"(paise|paisa|rupaye) (bhejo|bhej do|bhejiye|transfer)",
        r"पैसे (भेजो|भेज दो|भेजें|भेजिए|ट्रांसफर)",
        r"पैसे पाठवा",
        r"\b(gpay|google pay|phonepe|paytm) (kar|karo|kardo)\b",
    ),
    _r(
        "fee",
        "payment_request",
        25,
        r"(processing|registration|clearance|release|verification|security|delivery) (fee|charges?|deposit)",
        r"(प्रोसेसिंग|रजिस्ट्रेशन) (फ़?ीस|शुल्क)",
        r"शुल्क जमा",
    ),
    _r(
        "gift_card",
        "payment_request",
        20,
        r"gift ?cards?",
        r"google play (card|code|recharge)",
        r"(amazon|itunes|steam) (card|voucher|code)",
    ),
    # ---- boosters -----------------------------------------------------------
    _r(
        "urgency",
        "urgency",
        15,
        r"\b(urgent|urgently|immediately|asap|right now|act now|today only|last (chance|warning))\b",
        r"within \d+ (hours?|hrs?|minutes?|mins?)",
        r"\b(turant|fauran|abhi|jaldi karo)\b",
        r"तुरंत",
        r"फ़?ौरन",
        r"अभी",
        r"लगेच",
        r"ताबडतोब",
    ),
    _r(
        "secrecy",
        "secrecy",
        20,
        r"(do not|don't|dont|never) (tell|inform|share (this|it) with)",
        r"keep (this|it) (a )?secret",
        r"stay on (the )?(video )?call",
        r"(do not|don't|dont) (disconnect|cut|end) (the )?call",
        r"confidential",
        r"kisi ko (bhi )?(mat|na|nahi) bata",
        r"किसी को (भी )?(मत|न|नहीं) बता",
        r"किसी को कुछ (मत|न) बता",
        r"(कोणालाही|कुणालाही|कोणाला|कुणाला) (काही )?सांगू नका",
        r"घरच्यांना सांगू नका",
    ),
    _r(
        "money_amount",
        "money_amount",
        15,
        r"₹\s?\d",
        r"\b(rs|inr)\.?\s?\d",
        r"\d[\d,.]*\s?(lakh|lac|crore|हज़?ार|लाख|करोड़?)",
        r"\b(lakh|crore)\b",
        r"लाख",
        r"करोड़?",
        r"रुपये",
        r"रुपए",
    ),
)


def analyze(text: str) -> Analysis:
    t = _norm(text)
    hits: list[Hit] = []
    for rule in RULES:
        m = rule.pattern.search(t)
        if m:
            hits.append(Hit(rule.id, rule.group, rule.weight, m.group(0)))
    score = max(0, min(100, sum(h.weight for h in hits)))

    totals: dict[str, int] = {}
    for h in hits:
        if h.group in CATEGORIES:
            totals[h.group] = totals.get(h.group, 0) + h.weight
    named = {h.group for h in hits if h.id not in SUPPORTING}
    specific = {c: w for c, w in totals.items() if c not in GENERIC and c in named}
    pool = specific or totals
    category = None
    if pool:
        # Highest weight wins; ties go to the earlier category in CATEGORIES.
        category = max(pool, key=lambda c: (pool[c], -CATEGORIES.index(c)))
    return Analysis(score=score, category=category, hits=tuple(hits))
