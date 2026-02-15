

export type Ritual = {
    id: string;
    slug: string;
    name: { [key: string]: string };
    deity: { [key: string]: string };
    description: { [key: string]: string };
    procedure: { en: { title: string; steps: string[] }[], hi: [], te: [] };
    itemsRequired: { 
        en: { name: string; productId: string; }[], 
        hi: { name: string; productId: string; }[], 
        te: { name: string; productId: string; }[] 
    };
    auspiciousTime: { 
        en: {
            timing: string;
            tithi?: string;
            notes: string;
        };
        hi: {},
        te: {},
    };
    recommendedPlaylist: {
        id: string;
        title: string;
        tracks: { title: string; artist: string }[];
    };
    image: { url: string; hint: string };
    significance: { [key: string]: string };
    benefits: { [key: string]: string[] };
    variations: { [key: string]: string[] };
    commonMistakes: { [key: string]: string[] };
    reflections: { [key: string]: string[] };
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    keywords: string[];
    popularity: number;
};

export const rituals: Ritual[] = [
    {
        id: "1",
        slug: "daily-surya-puja",
        name: {
            en: "Daily Surya Puja (Sun Worship)",
            hi: "दैनिक सूर्य पूजा",
            te: "రోజువారీ సూర్య పూజ",
        },
        deity: {
            en: "Surya (The Sun God)",
            hi: "सूर्य (सूर्य देव)",
            te: "సూర్యుడు (సూర్య దేవుడు)",
        },
        description: {
            en: "A simple daily ritual to honor the Sun God, Surya, for health, vitality, and success. Best performed at sunrise.",
            hi: "स्वास्थ्य, जीवन शक्ति और सफलता के लिए सूर्य देव, सूर्य का सम्मान करने के लिए एक सरल दैनिक अनुष्ठान। सूर्योदय के समय सर्वश्रेष्ठ प्रदर्शन किया जाता है।",
            te: "ఆరోగ్యం, జీవశక్తి మరియు విజయం కోసం సూర్య భగవానుడైన సూర్యుడిని గౌరవించడానికి ఒక సాధారణ రోజువారీ ఆచారం. సూర్యోదయం సమయంలో చేయడం ఉత్తమం.",
        },
        procedure: {
            en: [
                {
                    title: "Preparation (Shuddhi)",
                    steps: [
                        "Wake up before sunrise and take a bath to purify the body.",
                        "Clean the space where you will perform the offering. Ensure it's tidy and peaceful.",
                        "Wear clean, fresh clothes (preferably red, orange, or white).",
                    ]
                },
                {
                    title: "The Offering (Arghya)",
                    steps: [
                        "Take a copper vessel (lota) and fill it with clean water.",
                        "If available, add red sandalwood paste, a red flower (like hibiscus), and a few rice grains to the water.",
                        "Face the rising sun. Hold the copper vessel with both hands at chest level.",
                        "Slowly pour the water in a steady stream, looking at the sun through the stream of water.",
                        "While offering the water, chant the Surya mantra: 'Om Suryaya Namah' 11 times.",
                    ]
                },
                {
                    title: "Conclusion (Pranam)",
                    steps: [
                         "After the offering is complete, touch the remaining water on the ground to your forehead.",
                         "Perform Pranam (bow down) to the Sun God and pray for well-being, health, and success.",
                    ]
                }
            ],
            hi: [], te: []
        },
        itemsRequired: {
           en: [
               { name: "Copper Water Bottle", productId: "prod_7" },
               { name: "Sandalwood Incense Sticks", productId: "prod_2" }
            ],
           hi: [], te: []
        },
        auspiciousTime: {
            en: {
                timing: "Within one hour of sunrise.",
                notes: "This ritual is performed daily and does not require a specific Tithi, but is most effective during the sun's waxing phase (Shukla Paksha)."
            },
            hi: {}, te: {},
        },
        recommendedPlaylist: {
            id: "pl-surya-1",
            title: "Surya Morning Mantras",
            tracks: [
                { title: "Surya Ashtakam", artist: "Traditional" },
                { title: "Aditya Hrudayam", artist: "Traditional" },
                { title: "Om Suryaya Namah (108 times)", artist: "Chant Central" }
            ]
        },
        image: { url: "https://picsum.photos/seed/suryapuja/600/400", hint: "sun worship sunrise" },
        significance: {
            en: "Honoring the sun, the source of all life and energy on Earth. It is believed to instill discipline, boost confidence, and improve health.",
            hi: "पृथ्वी पर सभी जीवन और ऊर्जा के स्रोत सूर्य का सम्मान करना। यह अनुशासन पैदा करने, आत्मविश्वास बढ़ाने और स्वास्थ्य में सुधार करने वाला माना जाता है।",
            te: "భూమిపై ఉన్న అన్ని జీవ మరియు శక్తికి మూలమైన సూర్యుడిని గౌరవించడం. ఇది క్రమశిక్షణను నింపుతుందని, ఆత్మవిశ్వాసాన్ని పెంచుతుందని మరియు ఆరోగ్యాన్ని మెరుగుపరుస్తుందని నమ్ముతారు.",
        },
        benefits: {
            en: ["Improves mental clarity and focus", "Boosts vitality and energy levels", "Strengthens bones and improves eyesight"],
            hi: [], te: []
        },
        variations: {
            en: ["Some traditions recommend adding a pinch of turmeric to the water.", "Can be performed from a clean balcony or window if direct ground access is not possible."],
            hi: [], te: []
        },
        commonMistakes: {
            en: ["Offering water after the sun has risen high in the sky.", "Pouring the water too quickly.", "Letting the offered water touch your feet."],
            hi: [], te: []
        },
        reflections: {
            en: ["How did this ritual make you feel?", "Did you feel a connection with the morning sun's energy?", "What is one thing you are grateful for today?"],
            hi: [], te: []
        },
        difficulty: "Beginner",
        keywords: ["daily", "surya", "sun", "puja", "morning"],
        popularity: 150
    },
    {
        id: "2",
        slug: "ganesha-puja-for-new-beginnings",
        name: {
            en: "Ganesha Puja for New Beginnings",
            hi: "नई शुरुआत के लिए गणेश पूजा",
            te: "కొత్త ప్రారంభాల కోసం గణేశ పూజ",
        },
        deity: {
            en: "Lord Ganesha",
            hi: "भगवान गणेश",
            te: "గణేశుడు",
        },
        description: {
            en: "Perform this puja before starting any new venture, such as a new job, business, or moving into a new home, to remove obstacles and ensure success.",
            hi: "किसी भी नए उद्यम, जैसे नई नौकरी, व्यवसाय, या नए घर में जाने से पहले बाधाओं को दूर करने और सफलता सुनिश्चित करने के लिए इस पूजा को करें।",
            te: "కొత్త ఉద్యోగం, వ్యాపారం లేదా కొత్త ఇంట్లోకి మారడం వంటి ఏదైనా కొత్త పనిని ప్రారంభించే ముందు అడ్డంకులను తొలగించడానికి మరియు విజయాన్ని నిర్ధారించడానికి ఈ పూజను చేయండి.",
        },
        procedure: {
            en: [
                {
                    title: "Preparation (Sthapana)",
                    steps: [
                        "Clean the entire house, especially the puja area. Sprinkling Ganga water is recommended for purification.",
                        "Place a small table or platform and cover it with a clean red or yellow cloth.",
                        "Place a small idol or picture of Lord Ganesha on the platform.",
                        "Light a diya (lamp with ghee or oil) and some incense sticks to create a sacred ambiance."
                    ]
                },
                {
                    title: "The Offerings (Samarpan)",
                    steps: [
                        "Offer a fresh flower, preferably a red hibiscus, at the feet of the idol.",
                        "Offer a piece of fruit and a special sweet, like Modak or Ladoo, which are favorites of Lord Ganesha.",
                        "Offer a small bowl of water."
                    ]
                },
                {
                    title: "The Chant (Mantra Japa)",
                    steps: [
                        "With folded hands, close your eyes and invoke Lord Ganesha's presence.",
                        "Chant the Ganesha mantra: 'Om Gam Ganapataye Namah' 11, 21, or 108 times.",
                        "After the chant, sit in silence for a few minutes and meditate on your new venture."
                    ]
                },
                {
                    title: "Conclusion (Aarti & Prarthana)",
                    steps: [
                        "Perform a simple aarti by circling the lit lamp in front of the deity.",
                        "Conclude by folding your hands again and seeking blessings for success and the removal of all obstacles.",
                        "Distribute the offered fruit and sweets as 'prasad' to family members."
                    ]
                }
            ],
            hi: [], te: []
        },
        itemsRequired: {
            en: [
                { name: "Ganesha Idol", productId: "prod_1" },
                { name: "Pooja Thali Set", productId: "prod_4" },
                { name: "Sandalwood Incense Sticks", productId: "prod_2" }
            ],
            hi: [], te: []
        },
        auspiciousTime: {
            en: {
                timing: "Morning, before starting your new venture.",
                tithi: "Shukla Chaturthi (the 4th day of the waxing moon) is especially auspicious.",
                notes: "Can be performed on any day, but Wednesdays are considered special for Lord Ganesha."
            },
            hi: {}, te: {},
        },
        recommendedPlaylist: {
            id: "pl-ganesha-1",
            title: "Ganesha Power Mantras",
            tracks: [
                { title: "Sankata Nashanam Ganapati Stotram", artist: "Traditional" },
                { title: "Vakratunda Mahakaya", artist: "Shankar Mahadevan" },
                { title: "Ganesh Atharvashirsha", artist: "Traditional" }
            ]
        },
        image: { url: "https://picsum.photos/seed/ganeshapuja/600/400", hint: "Ganesha idol worship" },
        significance: {
            en: "Lord Ganesha is the remover of obstacles (Vighnaharta). Seeking his blessings ensures a smooth path ahead for any new endeavor.",
            hi: "भगवान गणेश विघ्नहर्ता हैं। उनका आशीर्वाद लेने से किसी भी नए प्रयास के लिए आगे का मार्ग सुगम हो जाता है।",
            te: "గణేశుడు విఘ్నహర్త. ఆయన ఆశీస్సులు తీసుకోవడం వల్ల ఏ కొత్త ప్రయత్నానికైనా ముందున్న మార్గం సుగమం అవుతుంది.",
        },
        benefits: {
            en: ["Removes potential obstacles", "Brings good fortune and success", "Provides a sense of confidence and positive energy"],
            hi: [], te: []
        },
        variations: {
            en: ["Can be performed virtually by visualizing the offerings.", "Some people offer Durva grass along with the flower."],
            hi: [], te: []
        },
        commonMistakes: {
            en: ["Performing the puja with a distracted mind.", "Not cleaning the space properly beforehand."],
            hi: [], te: []
        },
        reflections: {
            en: ["What is your biggest hope for this new beginning?", "What obstacle are you asking Lord Ganesha to help you overcome?"],
            hi: [], te: []
        },
        difficulty: "Beginner",
        keywords: ["ganesha", "new beginning", "puja", "success"],
        popularity: 200
    }
];

export const getRitualBySlug = (slug: string) => {
    return rituals.find(r => r.slug === slug);
}
