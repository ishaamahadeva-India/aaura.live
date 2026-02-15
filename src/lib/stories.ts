

export type Story = {
    id: string;
    slug: string;
    title: {
      [key: string]: string;
    };
    summary: {
      [key: string]: string;
    };
    image: { url: string; hint: string };
    tags: string[];
    relatedCharacters: string[]; // character slugs
    relatedTemples: string[]; // temple slugs
    episodes: {
        episodeNumber: number;
        title: { [key: string]: string };
        description: { [key: string]: string };
        videoId: string;
        thumbnailUrl: string;
        duration: number;
    }[];
};

export const stories: Story[] = [
    {
        id: "1",
        slug: "ramayana-summary",
        title: {
            en: "The Story of Ramayana",
            hi: "रामायण की कहानी",
            te: "రామాయణ కథ",
        },
        summary: {
            en: "An epic series narrating the journey of Prince Rama, his exile, the abduction of his wife Sita, and his war against the demon king Ravana.",
            hi: "एक महाकाव्य श्रृंखला जो राजकुमार राम की यात्रा, उनके वनवास, उनकी पत्नी सीता के अपहरण, और राक्षस राजा रावण के खिलाफ उनके युद्ध का वर्णन करती है।",
            te: "రాకుమారుడు రాముని ప్రయాణం, అతని వనవాసం, అతని భార్య సీత అపహరణ, మరియు రాక్షస రాజు రావణునికి వ్యతిరేకంగా అతని యుద్ధాన్ని వివరించే ఒక పురాణ ధారావాహిక.",
        },
        image: { url: "https://picsum.photos/seed/ramayana1/800/600", hint: "epic battle" },
        tags: ["Ramayana", "Epic", "Dharma", "Rama", "Sita"],
        relatedCharacters: ["rama", "sita", "hanuman", "ravana"],
        relatedTemples: ["ram-mandir-ayodhya"],
        episodes: [
            {
                episodeNumber: 1,
                title: { en: "The Prince's Exile", hi: "राजकुमार का वनवास" },
                description: { en: "The story begins with the circumstances leading to Rama's 14-year exile from Ayodhya.", hi: "कहानी राम के अयोध्या से 14 साल के वनवास की परिस्थितियों से शुरू होती है।" },
                videoId: "SQIbeA-h2lY",
                thumbnailUrl: "https://picsum.photos/seed/episode1/400/225",
                duration: 905 // 15:05
            },
            {
                episodeNumber: 2,
                title: { en: "The Abduction of Sita", hi: "सीता का अपहरण" },
                description: { en: "While in the forest, Sita is deceptively abducted by the demon king Ravana.", hi: "वन में रहते हुए, सीता का राक्षस राजा रावण द्वारा धोखे से अपहरण कर लिया जाता है।" },
                videoId: "SQIbeA-h2lY",
                thumbnailUrl: "https://picsum.photos/seed/episode2/400/225",
                duration: 905
            },
            {
                episodeNumber: 3,
                title: { en: "The Search for Sita", hi: "सीता की खोज" },
                description: { en: "Rama and his brother Lakshmana begin their quest to find Sita, aided by Hanuman.", hi: "राम और उनके भाई लक्ष्मण हनुमान की सहायता से सीता को खोजने की अपनी खोज शुरू करते हैं।" },
                videoId: "SQIbeA-h2lY",
                thumbnailUrl: "https://picsum.photos/seed/episode3/400/225",
                duration: 905
            }
        ]
    },
    {
        id: "2",
        slug: "mahabharata-summary",
        title: {
            en: "The Mahabharata: A Discourse",
            hi: "महाभारत: एक प्रवचन",
            te: "మహాభారతం: ఒక ప్రసంగం",
        },
        summary: {
            en: "A series exploring the epic tale of the Kurukshetra War and the profound philosophical teachings of the Bhagavad Gita.",
            hi: "कुरुक्षेत्र युद्ध की महाकाव्य कहानी और भगवद गीता के गहन दार्शनिक उपदेशों की खोज करने वाली एक श्रृंखला।",
            te: "కురుక్షేత్ర యుద్ధం యొక్క పురాణ కథ మరియు భగవద్గీత యొక్క లోతైన తాత్విక బోధనలను అన్వేషించే ఒక ధారావాహిక.",
        },
        image: { url: "https://picsum.photos/seed/mahabharata1/800/600", hint: "chariot battlefield" },
        tags: ["Mahabharata", "Epic", "Dharma", "Krishna", "Arjuna"],
        relatedCharacters: ["arjuna", "krishna"],
        relatedTemples: [],
        episodes: [
             {
                episodeNumber: 1,
                title: { en: "The Two Families", hi: "दो परिवार" },
                description: { en: "An introduction to the Kauravas and the Pandavas, the two rival families at the heart of the epic.", hi: "महाकाव्य के केंद्र में दो प्रतिद्वंद्वी परिवारों, कौरवों और पांडवों का परिचय।" },
                videoId: "R4shwJabp4s",
                thumbnailUrl: "https://picsum.photos/seed/episode4/400/225",
                duration: 723
            },
             {
                episodeNumber: 2,
                title: { en: "The Dice Game", hi: "चौसर का खेल" },
                description: { en: "The fateful game of dice that leads to the Pandavas losing their kingdom and their honor.", hi: "चौसर का भाग्यपूर्ण खेल जिसके कारण पांडवों को अपना राज्य और अपना सम्मान खोना पड़ा।" },
                videoId: "R4shwJabp4s",
                thumbnailUrl: "https://picsum.photos/seed/episode5/400/225",
                duration: 723
            }
        ]
    },
    {
        id: "3",
        slug: "samudra-manthan",
        title: { en: "Samudra Manthan: The Churning of the Ocean", hi: "समुद्र मंथन", te: "సముద్ర మథనం" },
        summary: { en: "The story of the great churning of the cosmic ocean by the devas and asuras to obtain the nectar of immortality.", hi: "", te: "" },
        image: { url: "https://picsum.photos/seed/samudra/800/600", hint: "cosmic ocean" },
        tags: ["Vishnu", "Kurma Avatar", "Amrita"],
        relatedCharacters: ["vishnu"],
        relatedTemples: [],
        episodes: [
            { episodeNumber: 1, title: { en: "The Churning Begins", hi: "" }, description: { en: "The gods and demons begin their epic task.", hi: "" }, videoId: "example", thumbnailUrl: "https://picsum.photos/seed/samudra1/400/225", duration: 600 }
        ]
    },
    {
        id: "4",
        slug: "ganges-descent",
        title: { en: "The Descent of the Ganga", hi: "गंगा का अवतरण", te: "గంగా అవతరణం" },
        summary: { en: "How the celestial river Ganga was brought down to Earth through the penance of King Bhagiratha and the help of Lord Shiva.", hi: "", te: "" },
        image: { url: "https://picsum.photos/seed/ganga-river/800/600", hint: "river mountains" },
        tags: ["Ganga", "Shiva", "Bhagiratha"],
        relatedCharacters: ["shiva"],
        relatedTemples: [],
        episodes: [
             { episodeNumber: 1, title: { en: "Bhagiratha's Penance", hi: "" }, description: { en: "King Bhagiratha undertakes immense austerities.", hi: "" }, videoId: "example", thumbnailUrl: "https://picsum.photos/seed/ganga1/400/225", duration: 600 }
        ]
    },
    {
        id: "5",
        slug: "narasimha-avatar",
        title: { en: "The Story of Narasimha", hi: "नरसिंह की कथा", te: "నరసింహ కథ" },
        summary: { en: "The tale of how Lord Vishnu took the form of a man-lion to vanquish the demon king Hiranyakashipu and protect his devotee Prahlada.", hi: "", te: "" },
        image: { url: "https://picsum.photos/seed/narasimha/800/600", hint: "man lion" },
        tags: ["Vishnu", "Narasimha", "Prahlada"],
        relatedCharacters: ["vishnu"],
        relatedTemples: [],
        episodes: [
             { episodeNumber: 1, title: { en: "The Demon King's Boon", hi: "" }, description: { en: "Hiranyakashipu obtains a boon of near-invincibility.", hi: "" }, videoId: "example", thumbnailUrl: "https://picsum.photos/seed/narasimha1/400/225", duration: 600 }
        ]
    },
    {
        id: "6",
        slug: "birth-of-ganesha",
        title: { en: "The Birth of Ganesha", hi: "गणेश का जन्म", te: "గణేశుని జననం" },
        summary: { en: "The popular story of how Lord Ganesha was created by Goddess Parvati and acquired his elephant head from Lord Shiva.", hi: "", te: "" },
        image: { url: "https://picsum.photos/seed/ganesha-birth/800/600", hint: "Ganesha child" },
        tags: ["Ganesha", "Shiva", "Parvati"],
        relatedCharacters: ["ganesha", "shiva"],
        relatedTemples: [],
        episodes: [
             { episodeNumber: 1, title: { en: "Parvati's Creation", hi: "" }, description: { en: "Goddess Parvati creates a son from her own being.", hi: "" }, videoId: "example", thumbnailUrl: "https://picsum.photos/seed/ganesha-birth1/400/225", duration: 600 }
        ]
    },
    {
        id: "7",
        slug: "savitri-satyavan",
        title: { en: "Savitri and Satyavan", hi: "सावित्री और सत्यवान", te: "సావిత్రి మరియు సత్యవంతుడు" },
        summary: { en: "The legendary tale of Savitri, a princess who uses her intelligence and devotion to win back her husband's life from Yama, the god of death.", hi: "", te: "" },
        image: { url: "https://picsum.photos/seed/savitri/800/600", hint: "woman devotion" },
        tags: ["Savitri", "Yama", "Devotion"],
        relatedCharacters: [],
        relatedTemples: [],
        episodes: [
            { episodeNumber: 1, title: { en: "The Prophecy", hi: "" }, description: { en: "Savitri chooses Satyavan despite a prophecy of his early death.", hi: "" }, videoId: "example", thumbnailUrl: "https://picsum.photos/seed/savitri1/400/225", duration: 600 }
        ]
    }
];

export const getStoryBySlug = (slug: string) => {
    return stories.find(s => s.slug === slug);
}

    