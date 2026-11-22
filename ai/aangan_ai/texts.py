"""Localized strings: plain, kind words for elders. Keys: en, hi, mr, ta, bn."""

from __future__ import annotations

import re
from typing import Literal

Lang = Literal["en", "hi", "mr", "ta", "bn"]
LANGS: tuple[Lang, ...] = ("en", "hi", "mr", "ta", "bn")

LANG_NAMES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi (Devanagari script)",
    "mr": "Marathi (Devanagari script)",
    "ta": "Tamil (Tamil script)",
    "bn": "Bengali (Bengali script)",
}

# ---- shield -------------------------------------------------------------------

TITLES: dict[str, dict[str, str]] = {
    "safe": {
        "en": "Looks safe",
        "hi": "यह सुरक्षित लगता है",
        "mr": "हा संदेश सुरक्षित वाटतो",
        "ta": "பாதுகாப்பாகத் தெரிகிறது",
        "bn": "নিরাপদ মনে হচ্ছে",
    },
    "caution": {
        "en": "Be careful",
        "hi": "सावधान रहें",
        "mr": "सावध राहा",
        "ta": "கவனமாக இருங்கள்",
        "bn": "সাবধান থাকুন",
    },
    "danger": {
        "en": "This may be a scam",
        "hi": "यह धोखा हो सकता है",
        "mr": "ही फसवणूक असू शकते",
        "ta": "இது மோசடியாக இருக்கலாம்",
        "bn": "এটা প্রতারণা হতে পারে",
    },
}

_ASK = {
    "en": "Ask your family.",
    "hi": "परिवार से पूछें।",
    "mr": "कुटुंबाला विचारा.",
    "ta": "குடும்பத்திடம் கேளுங்கள்.",
    "bn": "পরিবারকে জিজ্ঞেস করুন।",
}
_NO_MONEY = {
    "en": "Do not send money.",
    "hi": "पैसे न भेजें।",
    "mr": "पैसे पाठवू नका.",
    "ta": "பணம் அனுப்ப வேண்டாம்.",
    "bn": "টাকা পাঠাবেন না।",
}
_NO_LINK = {
    "en": "Do not open the link.",
    "hi": "लिंक न खोलें।",
    "mr": "लिंक उघडू नका.",
    "ta": "இணைப்பைத் திறக்க வேண்டாம்.",
    "bn": "লিংক খুলবেন না।",
}

ADVICE: dict[str, dict[str, list[str]]] = {
    "digital_arrest": {
        "en": ["Police never arrest anyone on a video call.", "Do not send money. Hang up.", _ASK["en"]],
        "hi": ["पुलिस कभी वीडियो कॉल पर गिरफ़्तार नहीं करती।", "पैसे न भेजें, फ़ोन काट दें।", _ASK["hi"]],
        "mr": ["पोलीस कधीही व्हिडिओ कॉलवर अटक करत नाहीत.", "पैसे पाठवू नका, फोन ठेवून द्या.", _ASK["mr"]],
        "ta": ["காவல்துறை வீடியோ அழைப்பில் கைது செய்யாது.", "பணம் அனுப்ப வேண்டாம். அழைப்பைத் துண்டியுங்கள்.", _ASK["ta"]],
        "bn": ["পুলিশ কখনও ভিডিও কলে গ্রেফতার করে না।", "টাকা পাঠাবেন না, ফোন কেটে দিন।", _ASK["bn"]],
    },
    "kyc_bank": {
        "en": ["Banks never ask for KYC by message.", _NO_LINK["en"], "Visit your bank or ask your family."],
        "hi": ["बैंक कभी मैसेज पर KYC नहीं माँगता।", _NO_LINK["hi"], "बैंक जाकर पूछें या परिवार से पूछें।"],
        "mr": ["बँक कधीही मेसेजवर KYC मागत नाही.", _NO_LINK["mr"], "बँकेत जाऊन किंवा कुटुंबाला विचारा."],
        "ta": ["வங்கி மெசேஜில் KYC கேட்காது.", _NO_LINK["ta"], "வங்கியிடம் அல்லது குடும்பத்திடம் கேளுங்கள்."],
        "bn": ["ব্যাংক কখনও মেসেজে KYC চায় না।", _NO_LINK["bn"], "ব্যাংকে বা পরিবারকে জিজ্ঞেস করুন।"],
    },
    "otp": {
        "en": ["Never tell anyone your OTP, PIN or CVV.", "Banks and family never ask for it.", _ASK["en"]],
        "hi": ["OTP, PIN या CVV किसी को न बताएं।", "बैंक और परिवार कभी यह नहीं माँगते।", _ASK["hi"]],
        "mr": ["OTP, PIN किंवा CVV कोणालाही सांगू नका.", "बँक आणि कुटुंब हे कधीही मागत नाहीत.", _ASK["mr"]],
        "ta": ["OTP, PIN, CVV யாரிடமும் சொல்ல வேண்டாம்.", "வங்கியும் குடும்பமும் இதைக் கேட்காது.", _ASK["ta"]],
        "bn": ["OTP, PIN বা CVV কাউকে বলবেন না।", "ব্যাংক বা পরিবার কখনও এটা চায় না।", _ASK["bn"]],
    },
    "lottery_prize": {
        "en": ["A real prize never asks you to pay first.", _NO_MONEY["en"], _ASK["en"]],
        "hi": ["असली इनाम के लिए पैसे नहीं देने पड़ते।", _NO_MONEY["hi"], _ASK["hi"]],
        "mr": ["खऱ्या बक्षिसासाठी पैसे भरावे लागत नाहीत.", _NO_MONEY["mr"], _ASK["mr"]],
        "ta": ["உண்மையான பரிசுக்கு பணம் கட்ட வேண்டியதில்லை.", _NO_MONEY["ta"], _ASK["ta"]],
        "bn": ["আসল পুরস্কারের জন্য টাকা দিতে হয় না।", _NO_MONEY["bn"], _ASK["bn"]],
    },
    "family_emergency": {
        "en": ["First call them on their old number.", "Do not send money yet.", _ASK["en"]],
        "hi": ["पहले उनके पुराने नंबर पर फ़ोन करें।", "अभी पैसे न भेजें।", _ASK["hi"]],
        "mr": ["आधी त्यांच्या जुन्या नंबरवर फोन करा.", "आत्ता पैसे पाठवू नका.", _ASK["mr"]],
        "ta": ["முதலில் அவர்களின் பழைய எண்ணுக்கு அழையுங்கள்.", "இப்போது பணம் அனுப்ப வேண்டாம்.", _ASK["ta"]],
        "bn": ["আগে তাদের পুরনো নম্বরে ফোন করুন।", "এখনই টাকা পাঠাবেন না।", _ASK["bn"]],
    },
    "investment": {
        "en": ["No one can promise to double your money.", "Do not invest or send money.", _ASK["en"]],
        "hi": ["कोई भी पैसे दोगुने करने का वादा नहीं कर सकता।", "पैसे न लगाएं, न भेजें।", _ASK["hi"]],
        "mr": ["कोणीही पैसे दुप्पट करण्याचे वचन देऊ शकत नाही.", "पैसे गुंतवू नका, पाठवू नका.", _ASK["mr"]],
        "ta": ["பணத்தை இரட்டிப்பாக்குவதாக யாரும் உறுதி தர முடியாது.", _NO_MONEY["ta"], _ASK["ta"]],
        "bn": ["কেউ টাকা দ্বিগুণ করার কথা দিতে পারে না।", "টাকা লাগাবেন না, পাঠাবেন না।", _ASK["bn"]],
    },
    "job": {
        "en": ["A real job never asks you to pay.", "Do not send money or do 'tasks'.", _ASK["en"]],
        "hi": ["असली नौकरी में पैसे नहीं माँगे जाते।", "पैसे न भेजें, कोई 'टास्क' न करें।", _ASK["hi"]],
        "mr": ["खरी नोकरी कधीही पैसे मागत नाही.", "पैसे पाठवू नका, कोणताही 'टास्क' करू नका.", _ASK["mr"]],
        "ta": ["உண்மையான வேலைக்கு பணம் கேட்க மாட்டார்கள்.", _NO_MONEY["ta"], _ASK["ta"]],
        "bn": ["আসল চাকরিতে টাকা চাওয়া হয় না।", _NO_MONEY["bn"], _ASK["bn"]],
    },
    "parcel_customs": {
        "en": ["Courier companies do not ask for money by message.", "Do not pay or open links.", _ASK["en"]],
        "hi": ["कूरियर कंपनी मैसेज पर पैसे नहीं माँगती।", "पैसे न दें, लिंक न खोलें।", _ASK["hi"]],
        "mr": ["कुरियर कंपनी मेसेजवर पैसे मागत नाही.", "पैसे भरू नका, लिंक उघडू नका.", _ASK["mr"]],
        "ta": ["கூரியர் நிறுவனம் மெசேஜில் பணம் கேட்காது.", "பணம் கட்ட வேண்டாம், இணைப்பைத் திறக்க வேண்டாம்.", _ASK["ta"]],
        "bn": ["কুরিয়ার কোম্পানি মেসেজে টাকা চায় না।", "টাকা দেবেন না, লিংক খুলবেন না।", _ASK["bn"]],
    },
    "utility_bill": {
        "en": ["The electricity office does not send such messages.", "Do not call the number in the message.", _ASK["en"]],
        "hi": ["बिजली विभाग ऐसे मैसेज नहीं भेजता।", "मैसेज में दिए नंबर पर फ़ोन न करें।", _ASK["hi"]],
        "mr": ["वीज मंडळ असे मेसेज पाठवत नाही.", "मेसेजमधील नंबरवर फोन करू नका.", _ASK["mr"]],
        "ta": ["மின்சார வாரியம் இப்படி மெசேஜ் அனுப்பாது.", "மெசேஜில் உள்ள எண்ணுக்கு அழைக்க வேண்டாம்.", _ASK["ta"]],
        "bn": ["বিদ্যুৎ অফিস এমন মেসেজ পাঠায় না।", "মেসেজের নম্বরে ফোন করবেন না।", _ASK["bn"]],
    },
    "link_phishing": {
        "en": ["Do not open the link or install any app.", "Never let anyone control your phone.", _ASK["en"]],
        "hi": ["लिंक न खोलें, कोई ऐप न डालें।", "किसी को अपना फ़ोन चलाने न दें।", _ASK["hi"]],
        "mr": ["लिंक उघडू नका, कोणतेही ॲप टाकू नका.", "कोणालाही तुमचा फोन चालवू देऊ नका.", _ASK["mr"]],
        "ta": ["இணைப்பைத் திறக்க வேண்டாம், ஆப் போட வேண்டாம்.", "உங்கள் போனை யாரும் இயக்க விடாதீர்கள்.", _ASK["ta"]],
        "bn": ["লিংক খুলবেন না, কোনো অ্যাপ নামাবেন না।", "কাউকে আপনার ফোন চালাতে দেবেন না।", _ASK["bn"]],
    },
    "payment_request": {
        "en": ["To receive money, you never need your PIN.", _NO_MONEY["en"], "Ask your family first."],
        "hi": ["पैसे पाने के लिए कभी PIN नहीं डालना पड़ता।", _NO_MONEY["hi"], "पहले परिवार से पूछें।"],
        "mr": ["पैसे मिळवण्यासाठी कधीही PIN टाकावा लागत नाही.", _NO_MONEY["mr"], "आधी कुटुंबाला विचारा."],
        "ta": ["பணம் பெற PIN போட வேண்டியதில்லை.", _NO_MONEY["ta"], "முதலில் குடும்பத்திடம் கேளுங்கள்."],
        "bn": ["টাকা পেতে কখনও PIN দিতে হয় না।", _NO_MONEY["bn"], "আগে পরিবারকে জিজ্ঞেস করুন।"],
    },
    # Caution without a clear category (only urgency / secrecy / amounts matched).
    "general": {
        "en": ["Do not rush.", "Ask your family before you act."],
        "hi": ["जल्दबाज़ी न करें।", "कुछ भी करने से पहले परिवार से पूछें।"],
        "mr": ["घाई करू नका.", "काहीही करण्याआधी कुटुंबाला विचारा."],
        "ta": ["அவசரப்பட வேண்டாம்.", "எதுவும் செய்யும் முன் குடும்பத்திடம் கேளுங்கள்."],
        "bn": ["তাড়াহুড়ো করবেন না।", "কিছু করার আগে পরিবারকে জিজ্ঞেস করুন।"],
    },
}

# Short reason per matched rule group (shown as "signals").
SIGNALS: dict[str, dict[str, str]] = {
    "digital_arrest": {
        "en": "Uses the name of police or CBI to scare you",
        "hi": "पुलिस या CBI के नाम से डरा रहा है",
        "mr": "पोलीस किंवा CBI च्या नावाने घाबरवत आहे",
        "ta": "காவல்துறை பெயரில் பயமுறுத்துகிறது",
        "bn": "পুলিশ বা CBI-এর নামে ভয় দেখাচ্ছে",
    },
    "kyc_bank": {
        "en": "Threatens to block your bank account",
        "hi": "बैंक खाता बंद करने की धमकी",
        "mr": "बँक खाते बंद करण्याची धमकी",
        "ta": "வங்கிக் கணக்கை முடக்குவதாக மிரட்டுகிறது",
        "bn": "ব্যাংক অ্যাকাউন্ট বন্ধের হুমকি",
    },
    "otp": {
        "en": "Asks for a secret code (OTP or PIN)",
        "hi": "गुप्त कोड (OTP या PIN) माँग रहा है",
        "mr": "गुप्त कोड (OTP किंवा PIN) मागत आहे",
        "ta": "ரகசிய எண் (OTP அல்லது PIN) கேட்கிறது",
        "bn": "গোপন কোড (OTP বা PIN) চাইছে",
    },
    "lottery_prize": {
        "en": "Promises a prize or lottery",
        "hi": "इनाम या लॉटरी का लालच",
        "mr": "बक्षीस किंवा लॉटरीचे आमिष",
        "ta": "பரிசு அல்லது லாட்டரி ஆசை காட்டுகிறது",
        "bn": "পুরস্কার বা লটারির লোভ",
    },
    "family_emergency": {
        "en": "A new number, or a relative in trouble",
        "hi": "नया नंबर या परिवार पर मुसीबत की बात",
        "mr": "नवीन नंबर किंवा नातेवाईक संकटात असल्याची गोष्ट",
        "ta": "புதிய எண் அல்லது உறவினருக்கு ஆபத்து என்கிறது",
        "bn": "নতুন নম্বর বা আত্মীয়ের বিপদের কথা",
    },
    "investment": {
        "en": "Promises easy profit",
        "hi": "आसान मुनाफ़े का वादा",
        "mr": "सोप्या नफ्याचे वचन",
        "ta": "எளிதான லாபம் என்கிறது",
        "bn": "সহজ লাভের প্রতিশ্রুতি",
    },
    "job": {
        "en": "Offers easy money from home",
        "hi": "घर बैठे कमाई का लालच",
        "mr": "घरबसल्या कमाईचे आमिष",
        "ta": "வீட்டிலிருந்தே எளிதான சம்பாத்தியம் என்கிறது",
        "bn": "ঘরে বসে আয়ের লোভ",
    },
    "parcel_customs": {
        "en": "Says a parcel is held",
        "hi": "पार्सल रुकने की बात",
        "mr": "पार्सल अडकल्याची गोष्ट",
        "ta": "பார்சல் நிறுத்தப்பட்டதாகச் சொல்கிறது",
        "bn": "পার্সেল আটকে আছে বলছে",
    },
    "utility_bill": {
        "en": "Threatens to cut your electricity",
        "hi": "बिजली काटने की धमकी",
        "mr": "वीज कापण्याची धमकी",
        "ta": "மின்சாரத்தைத் துண்டிப்பதாக மிரட்டுகிறது",
        "bn": "বিদ্যুৎ কেটে দেওয়ার হুমকি",
    },
    "link_phishing": {
        "en": "Has a link, or asks you to install an app",
        "hi": "लिंक है या ऐप डालने को कहता है",
        "mr": "लिंक आहे किंवा ॲप टाकायला सांगतो",
        "ta": "இணைப்பு உள்ளது அல்லது ஆப் போடச் சொல்கிறது",
        "bn": "লিংক আছে বা অ্যাপ নামাতে বলছে",
    },
    "payment_request": {
        "en": "Asks you to pay or send money",
        "hi": "पैसे भेजने को कहता है",
        "mr": "पैसे पाठवायला सांगतो",
        "ta": "பணம் அனுப்பச் சொல்கிறது",
        "bn": "টাকা পাঠাতে বলছে",
    },
    "urgency": {
        "en": "Rushes you to act now",
        "hi": "जल्दी करने का दबाव",
        "mr": "घाई करण्याचा दबाव",
        "ta": "உடனே செய்யச் சொல்லி அவசரப்படுத்துகிறது",
        "bn": "তাড়াহুড়ো করতে বলছে",
    },
    "secrecy": {
        "en": "Tells you to keep it secret",
        "hi": "किसी को न बताने को कहता है",
        "mr": "कोणालाही न सांगायला सांगतो",
        "ta": "யாரிடமும் சொல்ல வேண்டாம் என்கிறது",
        "bn": "কাউকে না বলতে বলছে",
    },
    "money_amount": {
        "en": "Mentions a sum of money",
        "hi": "पैसों की रकम लिखी है",
        "mr": "पैशांची रक्कम लिहिली आहे",
        "ta": "பணத் தொகையைக் குறிப்பிடுகிறது",
        "bn": "টাকার অঙ্ক লেখা আছে",
    },
}

# Fixed explanation used by the mock provider.
MOCK_EXPLANATION: dict[str, str] = {
    "en": "This message looks like a common trick to get your money.",
    "hi": "यह संदेश पैसे ठगने की एक आम चाल जैसा लगता है।",
    "mr": "हा संदेश पैसे लुबाडण्याच्या नेहमीच्या युक्तीसारखा वाटतो.",
    "ta": "இது பணம் பறிக்கும் வழக்கமான தந்திரம் போல் தெரிகிறது.",
    "bn": "এই বার্তাটি টাকা হাতানোর একটা চেনা কৌশলের মতো লাগছে।",
}


def title(level: str, lang: str) -> str:
    return TITLES[level][lang]


def advice(category: str | None, lang: str) -> list[str]:
    return list(ADVICE.get(category or "general", ADVICE["general"])[lang][:3])


def signals(groups: list[str], lang: str, limit: int = 4) -> list[str]:
    return [SIGNALS[g][lang] for g in groups if g in SIGNALS][:limit]


# ---- summary ------------------------------------------------------------------


def _count_line(n: int, names: str, lang: str) -> str:
    if lang == "en":
        return f"{n} new message{'s' if n != 1 else ''} from {names}."
    if lang == "hi":
        return f"{n} {'नया संदेश' if n == 1 else 'नए संदेश'}: {names} से।"
    if lang == "mr":
        return f"{n} नवीन संदेश: {names} यांच्याकडून."
    if lang == "ta":
        return f"{names} இடமிருந்து {n} புதிய {'செய்தி' if n == 1 else 'செய்திகள்'}."
    return f"{n}টি নতুন বার্তা: {names} থেকে।"


def count_line(n: int, senders: list[str], lang: str) -> str:
    shown = senders[:4]
    names = ", ".join(shown)
    if len(senders) > 4:
        names += f" +{len(senders) - 4}"
    return _count_line(n, names, lang)


LAST_LINE: dict[str, str] = {
    "en": '{name} wrote last: "{text}"',
    "hi": '{name} का आख़िरी संदेश: "{text}"',
    "mr": '{name} यांचा शेवटचा संदेश: "{text}"',
    "ta": '{name} கடைசியாக எழுதியது: "{text}"',
    "bn": '{name}-এর শেষ বার্তা: "{text}"',
}

PER_SENDER: dict[str, str] = {
    "en": "{name} sent {n} message{s}.",
    "hi": "{name} ने {n} संदेश भेजे।",
    "mr": "{name} यांनी {n} संदेश पाठवले.",
    "ta": "{name} {n} செய்தி அனுப்பினார்.",
    "bn": "{name} {n}টি বার্তা পাঠিয়েছেন।",
}


def greeting(reader: str | None, lang: str) -> str:
    word = {"en": "Hello", "hi": "नमस्ते", "mr": "नमस्कार", "ta": "வணக்கம்", "bn": "নমস্কার"}[lang]
    end = {"en": ".", "hi": "।", "mr": ".", "ta": ".", "bn": "।"}[lang]
    return f"{word} {reader}{end}" if reader else f"{word}{end}"


# ---- replies ------------------------------------------------------------------

FALLBACK_REPLIES: dict[str, list[str]] = {
    "en": ["👍 Okay", "Thank you! 🙏", "Please call me 📞"],
    "hi": ["👍 ठीक है", "धन्यवाद 🙏", "मुझे फ़ोन करो 📞"],
    "mr": ["👍 ठीक आहे", "धन्यवाद 🙏", "मला फोन कर 📞"],
    "ta": ["👍 சரி", "நன்றி 🙏", "எனக்கு போன் பண்ணு 📞"],
    "bn": ["👍 ঠিক আছে", "ধন্যবাদ 🙏", "আমাকে ফোন করো 📞"],
}

SAFE_REPLIES: dict[str, list[str]] = {
    "en": ["Who is this?", "I will ask my family", "📞 Call me"],
    "hi": ["आप कौन हैं?", "पहले परिवार से पूछना है", "📞 मुझे फ़ोन करो"],
    "mr": ["तुम्ही कोण?", "आधी कुटुंबाला विचारायचं आहे", "📞 मला फोन करा"],
    "ta": ["நீங்கள் யார்?", "குடும்பத்திடம் கேட்கிறேன்", "📞 என்னை அழையுங்கள்"],
    "bn": ["আপনি কে?", "আগে পরিবারকে জিজ্ঞেস করব", "📞 আমাকে ফোন করুন"],
}


# ---- script check for LLM output ----------------------------------------------

_SCRIPT = {
    "en": re.compile(r"[A-Za-z]"),
    "hi": re.compile(r"[ऀ-ॿ]"),
    "mr": re.compile(r"[ऀ-ॿ]"),
    "ta": re.compile(r"[஀-௿]"),
    "bn": re.compile(r"[ঀ-৿]"),
}
_INDIC = re.compile(r"[ऀ-෿]")
_LATIN = re.compile(r"[A-Za-z]")


def in_lang_script(text: str, lang: str) -> bool:
    """True when the text is mostly in the reader's script. Names or words like
    "OTP" in Latin letters are fine, as long as the target script dominates."""
    target = len(_SCRIPT[lang].findall(text))
    other = len(_INDIC.findall(text)) if lang == "en" else len(_LATIN.findall(text))
    if lang != "en":
        other += len(_INDIC.findall(text)) - target  # a different Indic script
    if target == 0 and other == 0:
        return True  # digits / emoji only
    return target >= other
