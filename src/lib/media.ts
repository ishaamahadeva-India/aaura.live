
export type Media = {
    id: string;
    userId: string;
    title_en: string;
    title_hi: string;
    title_te: string;
    description_en: string;
    description_hi: string;
    description_te: string;
    uploadDate: string;
    mediaUrl: string;
    thumbnailUrl: string;
    mediaType: 'video' | 'short' | 'bhajan' | 'podcast' | 'pravachan' | 'audiobook';
    duration: number;
    language: string;
    tags: string[];
    status: 'pending' | 'approved' | 'rejected';
    views: number;
    likes: number;
    imageHint?: string;
  };
  
  export const media: Media[] = [
    {
        id: 'media-1',
        userId: 'user123',
        title_en: 'Relaxing Flute Music for Meditation',
        title_hi: 'ध्यान के लिए आरामदायक बांसुरी संगीत',
        title_te: 'ధ్యానం కోసం విశ్రాంతినిచ్చే వేణువు సంగీతం',
        description_en: 'Calm your mind with this serene flute melody, perfect for deep meditation and stress relief.',
        description_hi: 'अपने मन को इस शांत बांसुरी की धुन से शांत करें, जो गहरे ध्यान और तनाव से राहत के लिए एकदम सही है।',
        description_te: 'లోతైన ధ్యానం మరియు ఒత్తిడి ఉపశమనం కోసం సరైన ఈ ప్రశాంతమైన వేణువు శ్రావ్యతతో మీ మనస్సును ప్రశాంతంగా ఉంచుకోండి.',
        uploadDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        mediaUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://picsum.photos/seed/flute/800/600',
        mediaType: 'bhajan',
        duration: 1800,
        language: 'en',
        tags: ['meditation', 'flute', 'instrumental'],
        status: 'approved',
        views: 250000,
        likes: 15000,
        imageHint: 'flute music'
    },
    {
        id: 'media-2',
        userId: 'user456',
        title_en: 'What is Dharma? | A Short Explanation',
        title_hi: 'धर्म क्या है? | एक संक्षिप्त व्याख्या',
        title_te: 'ధర్మం అంటే ఏమిటి? | ఒక సంక్షిప్త వివరణ',
        description_en: 'A quick, animated short explaining the core concept of Dharma in Hindu philosophy.',
        description_hi: 'हिंदू दर्शन में धर्म की मूल अवधारणा को समझाने वाला एक त्वरित, एनिमेटेड शॉर्ट।',
        description_te: 'హిందూ తత్వశాస్త్రంలో ధర్మం యొక్క ప్రధాన భావనను వివరించే ఒక శీఘ్ర, యానిమేటెడ్ షార్ట్.',
        uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        mediaUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://picsum.photos/seed/dharma/450/800',
        mediaType: 'short',
        duration: 59,
        language: 'en',
        tags: ['dharma', 'philosophy', 'short'],
        status: 'approved',
        views: 1200000,
        likes: 98000,
        imageHint: 'spiritual talk'
    },
    {
        id: 'media-3',
        userId: 'user789',
        title_en: 'The Story of Ramayana - Episode 1',
        title_hi: 'रामायण की कहानी - एपिसोड 1',
        title_te: 'రామాయణ కథ - ఎపిసోడ్ 1',
        description_en: 'The beginning of the epic tale of Lord Rama, his exile, and the divine purpose of his incarnation.',
        description_hi: 'भगवान राम की महाकाव्य कथा की शुरुआत, उनका वनवास, और उनके अवतार का दिव्य उद्देश्य।',
        description_te: 'శ్రీరాముని పురాణ గాథ ప్రారంభం, ఆయన వనవాసం, మరియు ఆయన అవతారం యొక్క దివ్య ప్రయోజనం.',
        uploadDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        mediaUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://picsum.photos/seed/ramayana-video/800/450',
        mediaType: 'video',
        duration: 905,
        language: 'en',
        tags: ['ramayana', 'rama', 'epic'],
        status: 'approved',
        views: 500000,
        likes: 45000,
        imageHint: 'epic battle'
    },
    {
        id: 'media-4',
        userId: 'user101',
        title_en: 'Podcast: The Wisdom of the Upanishads',
        title_hi: 'पॉडकास्ट: उपनिषदों का ज्ञान',
        title_te: 'పాడ్‌కాస్ట్: ఉపనిషత్తుల జ్ఞానం',
        description_en: 'Episode 5: A deep dive into the concept of Atman and Brahman.',
        description_hi: 'एपिसोड 5: आत्मा और ब्रह्म की अवधारणा में एक गहरा गोता।',
        description_te: 'ఎపిసోడ్ 5: ఆత్మ మరియు బ్రాహ్మణ భావనలో లోతైన ప్రవేశం.',
        uploadDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        mediaUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://picsum.photos/seed/podcast-wisdom/800/600',
        mediaType: 'podcast',
        duration: 2500,
        language: 'en',
        tags: ['upanishads', 'vedanta', 'podcast'],
        status: 'approved',
        views: 85000,
        likes: 7200,
        imageHint: 'ancient scriptures'
    }
];

export const getMediaById = (id: string) => {
    return media.find(m => m.id === id);
}
  
