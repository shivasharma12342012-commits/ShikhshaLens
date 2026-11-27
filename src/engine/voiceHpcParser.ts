import {
  type CompetencyLevel,
  type ParakhDomain,
  type ParentLanguage,
  type StudentRecord,
  type VoiceObservation,
} from '../data/schoolData';

export const SAMPLE_VOICE_TRANSCRIPTS = [
  {
    label: 'Hinglish — Lab leadership & math watch',
    language: 'Hinglish',
    text: 'Aaj science lab mein Ananya ne group ko achhe se guide kiya aur clean diagram banaya, par Aarav aur Sneha fractions aur minus signs mein abhi bhi confuse ho rahe hain.',
  },
  {
    label: 'Hindi — Class participation & teamwork',
    language: 'Hindi',
    text: 'Priya ne aaj board par linear equation step by step samjhaya. Rohan thoda chup tha par jab Marathi mein pucha toh sahi jawab diya.',
  },
  {
    label: 'English (IN) — Psychomotor & debate note',
    language: 'English (IN)',
    text: 'Zoya led the civics debate with strong empathy and Karthik built a neat working electric circuit model during craft period.',
  },
];

const SOCIO_KEYWORDS = [
  'lead',
  'group',
  'team',
  'help',
  'empathy',
  'quiet',
  'chup',
  'shy',
  'debate',
  'guide',
  'friend',
  'peer',
  'participat',
  'confidence',
];

const PSYCHOMOTOR_KEYWORDS = [
  'diagram',
  'draw',
  'lab',
  'model',
  'craft',
  'sport',
  'football',
  'neat',
  'art',
  'music',
  'circuit',
  'experiment',
  'handwriting',
];

const ADVANCED_KEYWORDS = [
  'lead',
  'clearly',
  'achhe se',
  'excellent',
  'clean',
  'strong',
  'neatly',
  'built',
  'samjhaya',
  'guide',
  'best',
];

const BEGINNER_KEYWORDS = [
  'confuse',
  'struggl',
  'quiet',
  'chup',
  'help needed',
  'weak',
  'mistake',
  'hesitat',
  'missed',
  'stuck',
];

/**
 * Parses a natural Hindi / Hinglish / English teacher voice note into structured
 * NEP 2020 PARAKH Holistic Progress Card observations mapped to each mentioned student.
 */
export function parseVoiceObservationToHpc(
  transcript: string,
  language: string,
  students: StudentRecord[],
): VoiceObservation[] {
  const cleaned = transcript.trim();
  if (!cleaned) return [];

  // Split by sentence/contrast boundaries (preserve "X aur Y ..." paired student subjects in the same clause)
  const clauses = cleaned
    .split(/(?:,|;|\.|(?:\bpar\b|\bbut\b|\blekin\b))/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const results: VoiceObservation[] = [];
  const matchedStudentIds = new Set<string>();

  for (const student of students) {
    const firstName = student.name.split(' ')[0].toLowerCase();
    const relevantClauses = clauses.filter((c) => c.toLowerCase().includes(firstName));
    if (relevantClauses.length === 0) continue;

    matchedStudentIds.add(student.id);
    const contextText = relevantClauses.join(' — ');
    const lower = contextText.toLowerCase();

    let domain: ParakhDomain = 'Cognitive';
    if (PSYCHOMOTOR_KEYWORDS.some((k) => lower.includes(k))) {
      domain = 'Psychomotor';
    } else if (SOCIO_KEYWORDS.some((k) => lower.includes(k))) {
      domain = 'Socio-Emotional';
    }

    let level: CompetencyLevel = 'Proficient';
    let isFlag = false;
    if (BEGINNER_KEYWORDS.some((k) => lower.includes(k))) {
      level = 'Beginner';
      isFlag = true;
    } else if (ADVANCED_KEYWORDS.some((k) => lower.includes(k))) {
      level = 'Advanced';
    }

    const summary =
      level === 'Beginner'
        ? `Watch item logged (${domain}): needs guided classroom support based on "${contextText}".`
        : level === 'Advanced'
          ? `Strong competency evidenced (${domain}): "${contextText}".`
          : `Steady progress observed (${domain}): "${contextText}".`;

    results.push({
      id: `obs-${Date.now()}-${student.id}`,
      studentId: student.id,
      timestamp: 'Just now',
      language,
      rawTranscript: cleaned,
      domain,
      level,
      summary,
      isFlag,
    });
  }

  // If no student name was explicitly spoken, assign to the first student as a general note
  if (results.length === 0 && students.length > 0) {
    const lower = cleaned.toLowerCase();
    const domain: ParakhDomain = PSYCHOMOTOR_KEYWORDS.some((k) => lower.includes(k))
      ? 'Psychomotor'
      : SOCIO_KEYWORDS.some((k) => lower.includes(k))
        ? 'Socio-Emotional'
        : 'Cognitive';
    const isFlag = BEGINNER_KEYWORDS.some((k) => lower.includes(k));
    const level: CompetencyLevel = isFlag
      ? 'Beginner'
      : ADVANCED_KEYWORDS.some((k) => lower.includes(k))
        ? 'Advanced'
        : 'Proficient';

    results.push({
      id: `obs-${Date.now()}-general`,
      studentId: students[0].id,
      timestamp: 'Just now',
      language,
      rawTranscript: cleaned,
      domain,
      level,
      summary: `Logged for ${students[0].name} (${domain}): ${cleaned}`,
      isFlag,
    });
  }

  return results;
}

export interface ParentVoiceMessage {
  language: ParentLanguage;
  speechLangCode: string;
  greeting: string;
  script: string;
  homeActivity: string;
  durationSec: number;
}

/**
 * Generates a warm, non-jargon, 45-second vernacular audio update script
 * designed specifically for Indian parents (including first-generation families).
 */
export function buildVernacularParentMessage(
  student: StudentRecord,
  language: ParentLanguage,
): ParentVoiceMessage {
  const firstName = student.name.split(' ')[0];
  const parentFirst = student.parentName.split(' ')[0];

  switch (language) {
    case 'Hindi':
      return {
        language,
        speechLangCode: 'hi-IN',
        greeting: `नमस्ते ${parentFirst} जी`,
        script: `नमस्ते ${parentFirst} जी। विद्या भारती स्कूल से ${firstName} का साप्ताहिक अपडेट है। ${firstName} ने इस हफ्ते कक्षा में बहुत अच्छा प्रयास किया — खासकर ${student.hpcStrength}। गणित में बस एक छोटा सा अभ्यास चाहिए: ${student.hpcFocusArea}। आज रात केवल 10 मिनट ${firstName} से तीन आसान सवाल पूछ लीजिए और शाबाशी दीजिए। आप यहीं वॉइस नोट भेजकर अपनी राय जोड़ सकते हैं।`,
        homeActivity: `आज रात 10 मिनट: ${firstName} से पूछें — "3x - 12 = 15 में -12 दूसरी तरफ जाकर +12 क्यों बनता है?"`,
        durationSec: 42,
      };
    case 'Hinglish':
      return {
        language,
        speechLangCode: 'en-IN',
        greeting: `Namaste ${parentFirst} ji`,
        script: `Namaste ${parentFirst} ji. Vidya Bharati School se ${firstName} ka weekly update hai. Is hafte ${firstName} ka strong point raha: ${student.hpcStrength}. Bas ek chhota focus area hai: ${student.hpcFocusArea}. Aaj raat sirf 10 minute ${firstName} se 3 simple steps bolkar suniye. Aap isi link par 20 second ka voice reply bhej kar report card mein apna feedback add kar sakte hain.`,
        homeActivity: `Tonight's 10-min check: Ask ${firstName} to explain why 1/2 + 1/3 is 5/6 and not 2/5 using folded paper.`,
        durationSec: 40,
      };
    case 'Marathi':
      return {
        language,
        speechLangCode: 'mr-IN',
        greeting: `नमस्कार ${parentFirst} जी`,
        script: `नमस्कार ${parentFirst} जी. विद्या भारती शाळेतून ${firstName} चा साप्ताहिक अहवाल आहे. या आठवड्यात ${firstName} ने छान प्रगती केली आहे — ${student.hpcStrength}. गणितात फक्त एका गोष्टीचा सराव हवा आहे: ${student.hpcFocusArea}. आज संध्याकाळी फक्त १० मिनिटे त्याच्याकडून तीन सोपी उदाहरणे सोडवून घ्या.`,
        homeActivity: `आज संध्याकाळी १० मिनिटे: ${firstName} ला कागदाचे तुकडे करून 1/2 + 1/3 समजावून सांगायला सांगा.`,
        durationSec: 44,
      };
    case 'Tamil':
      return {
        language,
        speechLangCode: 'ta-IN',
        greeting: `வணக்கம் ${parentFirst} அவர்களே`,
        script: `வணக்கம் ${parentFirst} அவர்களே. வித்யா பாரதி பள்ளியிலிருந்து ${firstName} பற்றிய வாராந்திர தகவல். இந்த வாரம் ${firstName} நன்றாக செயல்பட்டார். கணிதத்தில் சிறிய பயிற்சி மட்டும் தேவை: ${student.hpcFocusArea}. இன்று இரவு 10 நிமிடம் மூன்று எளிய கணக்குகளை கேட்டு ஊக்குவியுங்கள்.`,
        homeActivity: `இன்று இரவு 10 நிமிடம்: ${firstName}-யிடம் 3 எளிய பின்னக் கணக்குகளை விளக்கச் சொல்லுங்கள்.`,
        durationSec: 43,
      };
    case 'Telugu':
      return {
        language,
        speechLangCode: 'te-IN',
        greeting: `నమస్కారం ${parentFirst} గారు`,
        script: `నమస్కారం ${parentFirst} గారు. విద్యా భారతి పాఠశాల నుండి ${firstName} వారపు నివేదిక. ఈ వారం ${firstName} తరగతిలో చక్కగా పాల్గొన్నారు. గణితంలో చిన్న సాధన అవసరం: ${student.hpcFocusArea}. ఈ రాత్రి 10 నిమిషాలు మూడు సులభమైన లెక్కలు అడిగి ప్రోత్సహించండి.`,
        homeActivity: `ఈ రాత్రి 10 నిమిషాలు: ${firstName} తో 3 చిన్న గణిత దశలను చదివించండి.`,
        durationSec: 41,
      };
    case 'Bengali':
      return {
        language,
        speechLangCode: 'bn-IN',
        greeting: `নমস্কার ${parentFirst} বাবু`,
        script: `নমস্কার ${parentFirst} বাবু। বিদ্যা ভারতী স্কুল থেকে ${firstName}-এর সাপ্তাহিক আপডেট। এই সপ্তাহে ${firstName} খুব ভালো চেষ্টা করেছে। অঙ্কে শুধু একটি ছোট বিষয়ে অনুশীলন দরকার: ${student.hpcFocusArea}। আজ রাতে মাত্র ১০ মিনিট তিনটি সহজ অঙ্ক জিজ্ঞাসা করুন।`,
        homeActivity: `আজ রাতে ১০ মিনিট: ${firstName}-কে ৩টি সহজ সমীকরণের ধাপ মুখে বলতে বলুন।`,
        durationSec: 42,
      };
    default:
      return {
        language: 'English',
        speechLangCode: 'en-IN',
        greeting: `Hello ${parentFirst}`,
        script: `Hello ${parentFirst}. Here is ${firstName}'s weekly learning note from Vidya Bharati Public School. This week ${firstName} shone in: ${student.hpcStrength}. One small focus area for next week is ${student.hpcFocusArea}. Spending 10 minutes tonight asking ${firstName} to walk through 3 short practice steps will make a big difference.`,
        homeActivity: `Tonight's 10-min habit: Ask ${firstName} to teach you one equation step aloud and verify the answer together.`,
        durationSec: 38,
      };
  }
}

export function speakVernacularText(
  text: string,
  langCode: string,
  onEnd?: () => void,
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  utterance.rate = 0.94;

  const voices = window.speechSynthesis.getVoices();
  const exactVoice =
    voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(langCode.split('-')[0].toLowerCase())) ||
    voices.find((v) => v.lang.toLowerCase() === 'en-in');
  if (exactVoice) utterance.voice = exactVoice;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
