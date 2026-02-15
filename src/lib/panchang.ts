import { festivals } from "./festivals";
import { Ritual, rituals } from "./rituals";

export type Panchang = {
    date: string;
    tithi: { en: string, hi: string, te?: string };
    nakshatra: { en: string, hi: string, te?: string };
    yoga: { en: string, hi: string, te?: string };
    karana: { en: string, hi: string, te?: string };
    paksha: { en: string, hi: string }; // Shukla Paksha or Krishna Paksha
    var: { en: string, hi: string }; // Day of week
    rahukalam: string;
    yamaGandam: string;
    gulikaKalam: string;
    sunrise: string;
    sunset: string;
    moonrise: string;
    moonset: string;
    festivals: { id: string, name: string }[];
    auspiciousActivities: string[];
    wellnessTips: string[];
    relatedRituals: string[]; // slugs
    zodiacInsights: { [key: string]: string };
    // Muhurat timings
    brahmaMuhurta: string;
    abhijitMuhurta: string;
    amritKalam: string;
    // Current time info
    currentTithi?: string;
    currentNakshatra?: string;
    nextMuhurat?: { name: string; time: string; timeRemaining: string };
};

// Realistic astronomical calculations based on location
const calculateSunriseSunset = (date: Date, latitude: number = 28.6139, longitude: number = 77.2090): { sunrise: string, sunset: string } => {
    // Delhi coordinates as default (can be made dynamic)
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    // Solar declination
    const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
    
    // Hour angle
    const latRad = latitude * Math.PI / 180;
    const declRad = declination * Math.PI / 180;
    const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declRad));
    
    // Sunrise/Sunset in hours
    const sunriseHour = 12 - (hourAngle * 12 / Math.PI);
    const sunsetHour = 12 + (hourAngle * 12 / Math.PI);
    
    // Adjust for timezone (IST is UTC+5:30)
    const sunriseIST = sunriseHour + 5.5;
    const sunsetIST = sunsetHour + 5.5;
    
    const formatTime = (hour: number): string => {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
    };
    
    return {
        sunrise: formatTime(sunriseIST),
        sunset: formatTime(sunsetIST),
    };
};

// Calculate Rahu Kalam based on weekday
const calculateRahuKalam = (date: Date): string => {
    const dayOfWeek = date.getDay();
    const rahuKalamTimes: { [key: number]: string } = {
        0: '04:30 AM - 06:00 AM', // Sunday
        1: '07:30 AM - 09:00 AM', // Monday
        2: '03:00 PM - 04:30 PM', // Tuesday
        3: '12:00 PM - 01:30 PM', // Wednesday
        4: '01:30 PM - 03:00 PM', // Thursday
        5: '10:30 AM - 12:00 PM', // Friday
        6: '09:00 AM - 10:30 AM', // Saturday
    };
    return rahuKalamTimes[dayOfWeek] || '07:30 AM - 09:00 AM';
};

// Calculate Yama Gandam based on weekday
const calculateYamaGandam = (date: Date): string => {
    const dayOfWeek = date.getDay();
    const yamaGandamTimes: { [key: number]: string } = {
        0: '12:00 PM - 01:30 PM', // Sunday
        1: '10:30 AM - 12:00 PM', // Monday
        2: '09:00 AM - 10:30 AM', // Tuesday
        3: '07:30 AM - 09:00 AM', // Wednesday
        4: '06:00 AM - 07:30 AM', // Thursday
        5: '03:00 PM - 04:30 PM', // Friday
        6: '01:30 PM - 03:00 PM', // Saturday
    };
    return yamaGandamTimes[dayOfWeek] || '03:00 PM - 04:30 PM';
};

// Calculate Gulika Kalam based on weekday
const calculateGulikaKalam = (date: Date): string => {
    const dayOfWeek = date.getDay();
    const gulikaKalamTimes: { [key: number]: string } = {
        0: '03:00 PM - 04:30 PM', // Sunday
        1: '01:30 PM - 03:00 PM', // Monday
        2: '12:00 PM - 01:30 PM', // Tuesday
        3: '10:30 AM - 12:00 PM', // Wednesday
        4: '09:00 AM - 10:30 AM', // Thursday
        5: '07:30 AM - 09:00 AM', // Friday
        6: '06:00 AM - 07:30 AM', // Saturday
    };
    return gulikaKalamTimes[dayOfWeek] || '06:00 AM - 07:30 AM';
};

// Calculate moon phase to determine Paksha
const calculatePaksha = (date: Date): { en: string, hi: string } => {
    // Approximate calculation: New moon is around day 0-1 of lunar month
    // This is a simplified calculation
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Simplified: if day is 1-15, it's Shukla Paksha (waxing), else Krishna Paksha (waning)
    // This should be based on actual lunar calendar, but for now using date
    const lunarDay = ((day - 1) % 30) + 1;
    const isShukla = lunarDay <= 15;
    
    return {
        en: isShukla ? 'Shukla Paksha' : 'Krishna Paksha',
        hi: isShukla ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष',
    };
};

// Get day name in Hindi
const getVar = (date: Date): { en: string, hi: string } => {
    const days = [
        { en: 'Sunday', hi: 'रविवार' },
        { en: 'Monday', hi: 'सोमवार' },
        { en: 'Tuesday', hi: 'मंगलवार' },
        { en: 'Wednesday', hi: 'बुधवार' },
        { en: 'Thursday', hi: 'गुरुवार' },
        { en: 'Friday', hi: 'शुक्रवार' },
        { en: 'Saturday', hi: 'शनिवार' },
    ];
    return days[date.getDay()];
};

// More realistic panchang data generation
export const getPanchangForDate = (date: Date, latitude: number = 28.6139, longitude: number = 77.2090): Panchang => {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);

    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    
    // More realistic tithi calculation based on lunar cycle
    const lunarCycle = 29.53; // Average lunar month length
    const daysSinceNewMoon = (dayOfYear % Math.round(lunarCycle));
    const tithiIndex = Math.floor((daysSinceNewMoon / lunarCycle) * 30) % 30;
    
    const tithis = [
        { en: "Pratipada", hi: "प्रतिपदा" }, { en: "Dwitiya", hi: "द्वितीया" },
        { en: "Tritiya", hi: "त्रितीया" }, { en: "Chaturthi", hi: "चतुर्थी" },
        { en: "Panchami", hi: "पंचमी" }, { en: "Shashthi", hi: "षष्ठी" },
        { en: "Saptami", hi: "सप्तमी" }, { en: "Ashtami", hi: "अष्टमी" },
        { en: "Navami", hi: "नवमी" }, { en: "Dashami", hi: "दशमी" },
        { en: "Ekadashi", hi: "एकादशी" }, { en: "Dwadashi", hi: "द्वादशी" },
        { en: "Trayodashi", hi: "त्रयोदशी" }, { en: "Chaturdashi", hi: "चतुर्दशी" },
        { en: "Purnima", hi: "पूर्णिमा" }, { en: "Amavasya", hi: "अमावस्या" },
    ];
    
    const nakshatras = [
        { en: "Ashwini", hi: "अश्विनी" }, { en: "Bharani", hi: "भरणी" },
        { en: "Krittika", hi: "कृत्तिका" }, { en: "Rohini", hi: "रोहिणी" },
        { en: "Mrigashirsha", hi: "मृगशीर्ष" }, { en: "Ardra", hi: "आर्द्रा" },
        { en: "Punarvasu", hi: "पुनर्वसु" }, { en: "Pushya", hi: "पुष्य" },
        { en: "Ashlesha", hi: "अश्लेषा" }, { en: "Magha", hi: "मघा" },
        { en: "Purva Phalguni", hi: "पूर्व फाल्गुनी" }, { en: "Uttara Phalguni", hi: "उत्तर फाल्गुनी" },
        { en: "Hasta", hi: "हस्त" }, { en: "Chitra", hi: "चित्रा" },
        { en: "Swati", hi: "स्वाति" }, { en: "Vishakha", hi: "विशाखा" },
        { en: "Anuradha", hi: "अनुराधा" }, { en: "Jyeshtha", hi: "ज्येष्ठा" },
        { en: "Mula", hi: "मूल" }, { en: "Purva Ashadha", hi: "पूर्व आषाढ़" },
        { en: "Uttara Ashadha", hi: "उत्तर आषाढ़" }, { en: "Shravana", hi: "श्रवण" },
        { en: "Dhanishta", hi: "धनिष्ठा" }, { en: "Shatabhisha", hi: "शतभिषा" },
        { en: "Purva Bhadrapada", hi: "पूर्व भाद्रपद" }, { en: "Uttara Bhadrapada", hi: "उत्तर भाद्रपद" },
        { en: "Revati", hi: "रेवती" },
    ];
    
    const yogas = [
        { en: "Vishkambha", hi: "विष्कंभ" }, { en: "Priti", hi: "प्रीति" },
        { en: "Ayushman", hi: "आयुष्मान" }, { en: "Saubhagya", hi: "सौभाग्य" },
        { en: "Shobhana", hi: "शोभन" }, { en: "Atiganda", hi: "अतिगंड" },
        { en: "Sukarman", hi: "सुकर्म" }, { en: "Dhriti", hi: "धृति" },
        { en: "Shula", hi: "शूल" }, { en: "Ganda", hi: "गंड" },
        { en: "Vriddhi", hi: "वृद्धि" }, { en: "Dhruva", hi: "ध्रुव" },
        { en: "Vyaghata", hi: "व्याघात" }, { en: "Harshana", hi: "हर्षण" },
        { en: "Vajra", hi: "वज्र" }, { en: "Siddhi", hi: "सिद्धि" },
        { en: "Vyatipata", hi: "व्यतिपात" }, { en: "Variyana", hi: "वरीयान" },
        { en: "Parigha", hi: "परिघ" }, { en: "Shiva", hi: "शिव" },
        { en: "Siddha", hi: "सिद्ध" }, { en: "Sadhya", hi: "साध्य" },
        { en: "Shubha", hi: "शुभ" }, { en: "Shukla", hi: "शुक्ल" },
        { en: "Brahma", hi: "ब्रह्म" }, { en: "Indra", hi: "इंद्र" },
        { en: "Vaidhriti", hi: "वैधृति" },
    ];
    
    const karanas = [
        { en: "Bava", hi: "बव" }, { en: "Balava", hi: "बालव" },
        { en: "Kaulava", hi: "कौलव" }, { en: "Taitila", hi: "तैतिल" },
        { en: "Gara", hi: "गर" }, { en: "Vanija", hi: "वणिज" },
        { en: "Visti", hi: "विष्टि" }, { en: "Shakuni", hi: "शकुनि" },
        { en: "Chatushpada", hi: "चतुष्पद" }, { en: "Naga", hi: "नाग" },
        { en: "Kimstughna", hi: "किंस्तुघ्न" },
    ];
    
    const { sunrise, sunset } = calculateSunriseSunset(today, latitude, longitude);
    
    // Calculate moonrise/moonset (simplified)
    const moonriseHour = (parseInt(sunrise.split(':')[0].replace(/AM|PM/, '')) + 12) % 24;
    const moonrise = moonriseHour > 12 
        ? `${moonriseHour - 12}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} PM`
        : `${moonriseHour}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} AM`;
    
    const moonset = `${(moonriseHour + 14) % 24}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} ${(moonriseHour + 14) % 24 >= 12 ? 'PM' : 'AM'}`;
    
    // Calculate Brahma Muhurta (1.5 hours before sunrise)
    const sunriseHour = parseInt(sunrise.split(':')[0].replace(/AM|PM/, ''));
    const sunriseMin = parseInt(sunrise.split(':')[1].split(' ')[0]);
    const isSunrisePM = sunrise.includes('PM');
    const sunriseHour24 = isSunrisePM ? sunriseHour + 12 : (sunriseHour === 12 ? 0 : sunriseHour);
    
    const brahmaStart = new Date(today);
    brahmaStart.setHours(sunriseHour24 - 1, sunriseMin - 30, 0, 0);
    const brahmaEnd = new Date(today);
    brahmaEnd.setHours(sunriseHour24 - 1, sunriseMin, 0, 0);
    
    const formatMuhurat = (start: Date, end: Date): string => {
        const format = (d: Date) => {
            const h = d.getHours();
            const m = d.getMinutes();
            const period = h >= 12 ? 'PM' : 'AM';
            const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
        };
        return `${format(start)} - ${format(end)}`;
    };
    
    // Abhijit Muhurta (11:40 AM - 12:20 PM)
    const abhijitStart = new Date(today);
    abhijitStart.setHours(11, 40, 0, 0);
    const abhijitEnd = new Date(today);
    abhijitEnd.setHours(12, 20, 0, 0);
    
    // Amrit Kalam (variable based on sunrise)
    const amritStart = new Date(today);
    amritStart.setHours(sunriseHour24 + 5, sunriseMin, 0, 0);
    const amritEnd = new Date(today);
    amritEnd.setHours(sunriseHour24 + 6, sunriseMin, 0, 0);
    
    // Find festivals for the selected date
    const todaysFestivals = festivals
        .filter(f => {
            if (!f.date) return false;
            const festivalDate = new Date(f.date);
            return festivalDate.getUTCDate() === today.getUTCDate() &&
                   festivalDate.getUTCMonth() === today.getUTCMonth() &&
                   festivalDate.getUTCFullYear() === today.getUTCFullYear();
        })
        .map(f => ({ id: f.slug, name: f.name?.en || f.name || 'Festival' }));

    // Find related rituals
    const relatedRitualSlugs = rituals
        .filter(r => r.keywords?.some(k => k === "daily") || r.keywords?.some(k => k === "panchang"))
        .map(r => r.slug);

    const paksha = calculatePaksha(today);
    const varName = getVar(today);
    
    return {
        date: today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        tithi: tithis[tithiIndex % tithis.length],
        nakshatra: nakshatras[dayOfYear % nakshatras.length],
        yoga: yogas[dayOfYear % yogas.length],
        karana: karanas[tithiIndex % karanas.length],
        paksha,
        var: varName,
        rahukalam: calculateRahuKalam(today),
        yamaGandam: calculateYamaGandam(today),
        gulikaKalam: calculateGulikaKalam(today),
        sunrise,
        sunset,
        moonrise,
        moonset,
        festivals: todaysFestivals.length > 0 ? todaysFestivals : [],
        auspiciousActivities: [
            "Starting new projects during Abhijit Muhurta",
            "Spiritual practices during Brahma Muhurta",
            "Meditation and prayer",
            "Performing charitable acts",
            "Learning new skills"
        ],
        wellnessTips: [
            "Meditate during Brahma Muhurta (around 4 AM) for enhanced clarity and spiritual growth.",
            "Drink warm water with lemon in the morning to aid digestion.",
            "Practice yoga or light exercise during sunrise hours.",
            "Maintain a positive mindset throughout the day.",
            "Avoid important decisions during Rahu Kalam and Yama Gandam."
        ],
        relatedRituals: relatedRitualSlugs,
        brahmaMuhurta: formatMuhurat(brahmaStart, brahmaEnd),
        abhijitMuhurta: formatMuhurat(abhijitStart, abhijitEnd),
        amritKalam: formatMuhurat(amritStart, amritEnd),
        zodiacInsights: {
            aries: "A good day for leadership tasks. Channel your energy wisely and take initiative.",
            taurus: "Focus on financial planning and grounding exercises. Stability is key today.",
            gemini: "Communication is key today. Express your thoughts clearly and connect with others.",
            cancer: "A day for home and family. Nurture your connections and create a peaceful environment.",
            leo: "Creative projects are favored. Let your inner light shine and share your talents.",
            virgo: "Pay attention to details and organize your tasks. Efficiency will serve you well.",
            libra: "Focus on balance and harmony in relationships. Seek compromise and understanding.",
            scorpio: "A transformative day. Embrace change and inner reflection for personal growth.",
            sagittarius: "A day for learning and exploring new philosophies. Expand your horizons.",
            capricorn: "Career matters are in focus. Discipline and hard work will pay off.",
            aquarius: "Community and social connections are highlighted. Collaborate with others.",
            pisces: "A day for spiritual practices and trusting your intuition. Follow your inner guidance."
        }
    };
};

// Get current time-based panchang info
export const getCurrentPanchangInfo = (panchang: Panchang, currentTime: Date = new Date()): { currentTithi?: string, currentNakshatra?: string, nextMuhurat?: { name: string; time: string; timeRemaining: string } } => {
    const now = currentTime;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    // Parse sunrise time
    const parseTime = (timeStr: string): Date => {
        const [time, period] = timeStr.split(' ');
        const [hour, min] = time.split(':').map(Number);
        const date = new Date(today);
        const hour24 = period === 'PM' && hour !== 12 ? hour + 12 : (period === 'AM' && hour === 12 ? 0 : hour);
        date.setHours(hour24, min, 0, 0);
        return date;
    };
    
    const sunrise = parseTime(panchang.sunrise);
    const sunset = parseTime(panchang.sunset);
    
    // Check if current time is during day
    const isDay = now >= sunrise && now <= sunset;
    
    // Find next muhurat
    const muhurats = [
        { name: 'Brahma Muhurta', time: panchang.brahmaMuhurta.split(' - ')[0] },
        { name: 'Sunrise', time: panchang.sunrise },
        { name: 'Abhijit Muhurta', time: panchang.abhijitMuhurta.split(' - ')[0] },
        { name: 'Amrit Kalam', time: panchang.amritKalam.split(' - ')[0] },
        { name: 'Sunset', time: panchang.sunset },
    ];
    
    let nextMuhurat: { name: string; time: string; timeRemaining: string } | undefined;
    
    for (const muhurat of muhurats) {
        const muhuratTime = parseTime(muhurat.time);
        if (muhuratTime > now) {
            const diff = muhuratTime.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            nextMuhurat = {
                name: muhurat.name,
                time: muhurat.time,
                timeRemaining: `${hours}h ${minutes}m`,
            };
            break;
        }
    }
    
    return {
        currentTithi: panchang.tithi.en,
        currentNakshatra: panchang.nakshatra.en,
        nextMuhurat,
    };
};

// Deprecated, use getPanchangForDate instead
export const getTodaysPanchang = (): Panchang => {
   return getPanchangForDate(new Date());
};
