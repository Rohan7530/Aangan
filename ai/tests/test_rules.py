import re

import pytest

from aangan_ai.rules import CATEGORIES, analyze

# (category, sample). Every category has English and Hindi/Hinglish (some Marathi).
SCAMS = [
    ("digital_arrest", "This is CBI officer Sharma. Your Aadhaar is linked to money laundering. Stay on video call, do not tell your family, and transfer ₹2,00,000 for verification."),
    ("digital_arrest", "मैं सीबीआई से बोल रहा हूँ, आपके नाम पर गिरफ़्तारी वारंट है। वीडियो कॉल पर रहें और किसी को मत बताना।"),
    ("digital_arrest", "Main Mumbai police se bol raha hoon, aapke naam pe arrest warrant hai, kisi ko mat batana"),
    ("kyc_bank", "URGENT: Your SBI KYC expires today. Update now or your account will be blocked."),
    ("kyc_bank", "aapka khata band ho jayega, KYC update karein"),
    ("kyc_bank", "आपका बैंक खाता बंद हो जाएगा, तुरंत केवाईसी अपडेट करें"),
    ("kyc_bank", "तुमचे बँक खाते बंद होईल, लगेच KYC करा"),
    ("otp", "Please share the OTP you received just now."),
    ("otp", "Aapke phone pe jo OTP aaya hai woh bata do"),
    ("otp", "आपके फ़ोन पर आया ओटीपी बता दो"),
    ("lottery_prize", "Congratulations! You have won ₹25,00,000 in the KBC lucky draw. Pay ₹4,999 processing fee to claim your prize."),
    ("lottery_prize", "आपने लॉटरी जीती है! इनाम पाने के लिए प्रोसेसिंग फीस भेजें।"),
    ("lottery_prize", "Badhai ho! Aapki KBC lottery lagi hai, 25 lakh ka inaam"),
    ("family_emergency", "Dadi it's me Kabir, I lost my phone, this is my new number. I had an accident, please send ₹15,000 urgently on GPay. Don't tell papa."),
    ("family_emergency", "Nani mera phone kho gaya, ye naya number hai. Hospital mein hoon, abhi paise bhejo"),
    ("family_emergency", "दादी, यह मेरा नया नंबर है। एक्सीडेंट हो गया है, तुरंत पैसे भेजो।"),
    ("investment", "Double your money in 30 days! Guaranteed returns with crypto trading."),
    ("investment", "सिर्फ़ 10 दिन में पैसे डबल, गारंटी के साथ मुनाफ़ा!"),
    ("investment", "Bitcoin mein invest karo, paisa double guaranteed returns"),
    ("job", "Work from home job! Earn ₹5000 per day by doing simple tasks on Telegram."),
    ("job", "Ghar baithe kamao! Roz 3000 rupaye, part-time job"),
    ("job", "घर बैठे रोज़ ₹3000 कमाएं, पार्ट टाइम काम।"),
    ("parcel_customs", "Your FedEx parcel is held at customs with illegal items. Pay customs duty of Rs 12,000 now."),
    ("parcel_customs", "आपका पार्सल कस्टम में रोका गया है, कस्टम ड्यूटी ₹5000 तुरंत भरें।"),
    ("utility_bill", "Dear consumer your electricity power will be disconnected tonight at 9.30pm because your previous month bill was not update. Please immediately contact our electricity officer 9876543210"),
    ("utility_bill", "प्रिय उपभोक्ता, आपका बिजली कनेक्शन आज रात 9:30 बजे काट दिया जाएगा। तुरंत इस नंबर पर कॉल करें"),
    ("utility_bill", "Aapka bijli connection aaj raat kat jayega, turant call karein"),
    ("link_phishing", "Install AnyDesk so I can help you, or download this app bit.ly/x1.apk"),
    ("link_phishing", "इस लिंक पर क्लिक करें और AnyDesk डाउनलोड करें"),
    ("link_phishing", "Is link pe click karo: bit.ly/abc123"),
    ("payment_request", "Please approve the UPI collect request to receive ₹2000 refund."),
    ("payment_request", "Paise bhejo abhi, pay now ₹5000 aur Google Play gift card bhi"),
    ("payment_request", "पैसे भेजो, ₹10,000 की ज़रूरत है, ये गिफ्ट कार्ड भी चाहिए gift card"),
]

FAMILY = [
    "Dadi, I will pick you up at 12:30 for lunch.",
    "kal subah 9 baje aa jana, doctor ke paas chalna hai",
    "मैं कल सुबह तैयार रहूँगी।",
    "Happy birthday Papa! 🎂",
    "Did you take your BP medicine?",
    "Send me the photo of the wedding",
    "I paid the electricity bill online today",
    "Let's do a video call tonight",
    "I sent you ₹2000 on GPay for medicines",
    "Mama is in hospital, please pray for her",
    "Rohan got first prize in the drawing competition!",
    "fir milte hain kal",
    "आज रात खाना साथ खाएंगे",
    "उद्या सकाळी ९ वाजता डॉक्टरकडे जायचं आहे",
    "I am working from home today",
]


@pytest.mark.parametrize("category,text", SCAMS)
def test_scam_samples_are_flagged(category, text):
    a = analyze(text)
    assert a.score >= 25, (a.score, [h.id for h in a.hits])
    assert a.category == category, (a.category, [h.id for h in a.hits])


DEVANAGARI = re.compile(r"[ऀ-ॿ]")
HINGLISH = re.compile(r"(aap|aapka|aapki|hai|karo|bhejo|mein|kamao|pe|ka|ye|mera|ho)", re.IGNORECASE)


def test_every_category_has_english_and_hindi_samples():
    for cat in CATEGORIES:
        samples = [t for c, t in SCAMS if c == cat]
        english = [t for t in samples if not DEVANAGARI.search(t) and not HINGLISH.search(t)]
        hindi = [t for t in samples if DEVANAGARI.search(t) or HINGLISH.search(t)]
        assert english and hindi, cat


@pytest.mark.parametrize("text", FAMILY)
def test_family_messages_are_safe(text):
    a = analyze(text)
    assert a.score < 25, (a.score, [h.id for h in a.hits])


def test_score_is_clamped():
    text = SCAMS[0][1] + " share the OTP, KYC expires today, account will be blocked, bit.ly/x.apk AnyDesk"
    assert analyze(text).score == 100


def test_strong_samples_reach_danger_range():
    for text in (SCAMS[0][1], SCAMS[13][1]):
        assert analyze(text).score >= 80
