import type { ReaderLang } from '../../api';

// Words for the shield and AI helpers, in the reader's language. English is
// always shown beside them in smaller type, so a helper can read along.
const S = {
  askFamily: { en: 'Ask my family', hi: 'परिवार से पूछें', mr: 'कुटुंबाला विचारा', ta: 'குடும்பத்திடம் கேளுங்கள்', bn: 'পরিবারকে জিজ্ঞেস করুন' },
  isThisSafe: { en: 'Is this safe?', hi: 'क्या यह सुरक्षित है?', mr: 'हे सुरक्षित आहे का?', ta: 'இது பாதுகாப்பானதா?', bn: 'এটা কি নিরাপদ?' },
  checkHint: {
    en: 'Paste or type a message you got on SMS, WhatsApp or a phone call.',
    hi: 'SMS, WhatsApp या फ़ोन पर आया संदेश यहाँ लिखें या चिपकाएँ।',
    mr: 'SMS, WhatsApp किंवा फोनवर आलेला संदेश इथे लिहा किंवा पेस्ट करा.',
    ta: 'SMS, WhatsApp-ல் வந்த செய்தியை இங்கே எழுதுங்கள்.',
    bn: 'SMS বা WhatsApp-এ আসা বার্তাটি এখানে লিখুন।',
  },
  check: { en: 'Check it', hi: 'जाँचें', mr: 'तपासा', ta: 'சரிபார்', bn: 'যাচাই করুন' },
  checking: { en: 'Checking…', hi: 'जाँच हो रही है…', mr: 'तपासत आहे…', ta: 'சரிபார்க்கிறது…', bn: 'যাচাই হচ্ছে…' },
  whoToAsk: { en: 'Who should check it?', hi: 'किससे पूछें?', mr: 'कोणाला विचारायचे?', ta: 'யாரிடம் கேட்பது?', bn: 'কাকে জিজ্ঞেস করবেন?' },
  sendTo: { en: 'Send to {name}', hi: '{name} को भेजें', mr: '{name} यांना पाठवा', ta: '{name}-க்கு அனுப்பு', bn: '{name}-কে পাঠান' },
  sent: {
    en: '{name} has been told. Talk to them before you reply or pay anything.',
    hi: '{name} को बता दिया गया है। जवाब देने या पैसे भेजने से पहले उनसे बात करें।',
    mr: '{name} यांना कळवले आहे. उत्तर देण्यापूर्वी किंवा पैसे पाठवण्यापूर्वी त्यांच्याशी बोला.',
    ta: '{name}-க்கு தெரிவிக்கப்பட்டது. பதில் சொல்லும் முன் அவரிடம் பேசுங்கள்.',
    bn: '{name}-কে জানানো হয়েছে। উত্তর দেওয়ার আগে তাঁর সঙ্গে কথা বলুন।',
  },
  sending: { en: 'Sending…', hi: 'भेज रहे हैं…', mr: 'पाठवत आहे…', ta: 'அனுப்புகிறது…', bn: 'পাঠানো হচ্ছে…' },
  whatDidIMiss: { en: 'What did I miss?', hi: 'क्या छूट गया?', mr: 'काय राहिलं?', ta: 'என்ன தவறவிட்டேன்?', bn: 'কী মিস করলাম?' },
  newMessages: { en: '{n} new messages', hi: '{n} नए संदेश', mr: '{n} नवीन संदेश', ta: '{n} புதிய செய்திகள்', bn: '{n}টি নতুন বার্তা' },
  recentMessages: {
    en: 'A short summary of the recent messages',
    hi: 'हाल के संदेशों का छोटा सार',
    mr: 'अलीकडच्या संदेशांचा छोटा सारांश',
    ta: 'சமீபத்திய செய்திகளின் சுருக்கம்',
    bn: 'সাম্প্রতিক বার্তার ছোট সারাংশ',
  },
  summarising: { en: 'Reading the new messages…', hi: 'नए संदेश पढ़ रहे हैं…', mr: 'नवीन संदेश वाचत आहे…', ta: 'புதிய செய்திகளைப் படிக்கிறது…', bn: 'নতুন বার্তা পড়া হচ্ছে…' },
  listen: { en: 'Listen', hi: 'सुनें', mr: 'ऐका', ta: 'கேள்', bn: 'শুনুন' },
  stop: { en: 'Stop', hi: 'रोकें', mr: 'थांबा', ta: 'நிறுத்து', bn: 'থামুন' },
  quickReplies: { en: 'Quick replies', hi: 'जल्दी जवाब', mr: 'झटपट उत्तर', ta: 'விரைவு பதில்', bn: 'দ্রুত উত্তর' },
  close: { en: 'Close', hi: 'बंद करें', mr: 'बंद करा', ta: 'மூடு', bn: 'বন্ধ করুন' },
  resting: {
    en: 'The check is resting right now. If a message asks for money, an OTP or secrecy, ask your family first.',
    hi: 'जाँच अभी उपलब्ध नहीं है। अगर कोई पैसे, OTP या राज़ रखने को कहे, तो पहले परिवार से पूछें।',
    mr: 'तपासणी आत्ता उपलब्ध नाही. कोणी पैसे, OTP किंवा गुपित ठेवायला सांगितले तर आधी कुटुंबाला विचारा.',
    ta: 'பணம் அல்லது OTP கேட்டால், முதலில் குடும்பத்திடம் கேளுங்கள்.',
    bn: 'কেউ টাকা বা OTP চাইলে আগে পরিবারকে জিজ্ঞেস করুন।',
  },
  nothingNew: { en: 'Nothing new since you last looked.', hi: 'पिछली बार के बाद कुछ नया नहीं है।', mr: 'मागच्या वेळेनंतर काही नवीन नाही.', ta: 'புதிதாக எதுவும் இல்லை.', bn: 'নতুন কিছু নেই।' },
} satisfies Record<string, Record<ReaderLang, string>>;

export type ShieldString = keyof typeof S;

export function t(lang: ReaderLang, key: ShieldString, vars: Record<string, string> = {}): string {
  let out: string = S[key][lang] ?? S[key].en;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
  return out;
}

/** English under the native words, unless the reader already reads English. */
export function en(lang: ReaderLang, key: ShieldString, vars: Record<string, string> = {}): string | null {
  return lang === 'en' ? null : t('en', key, vars);
}
