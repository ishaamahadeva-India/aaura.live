
import type { FirestoreDataConverter, DocumentData } from "firebase/firestore";

export type ChallengeTask = {
    day: number;
    title: string;
    taskType: 'read-story' | 'watch-media' | 'recite-mantra';
    contentId: string; // e.g., story slug, media id, or mantra text
};

export type Challenge = {
    id: string;
    title_en: string;
    title_hi: string;
    description_en: string;
    description_hi: string;
    durationDays: number;
    badgeId: string;
    tasks: ChallengeTask[];
};

export const challenges: Challenge[] = [
    {
        id: "7-day-ramayana-wisdom",
        title_en: "7-Day Ramayana Wisdom Challenge",
        title_hi: "७-दिवसीय रामायण ज्ञान चुनौती",
        description_en: "Embark on a 7-day journey to explore the profound wisdom of the Ramayana. Complete daily tasks to earn the 'Ramayana Scholar' badge.",
        description_hi: "रामायण के गहन ज्ञान का पता लगाने के लिए ७-दिवसीय यात्रा पर निकलें। 'रामायण विद्वान' बैज अर्जित करने के लिए दैनिक कार्यों को पूरा करें।",
        durationDays: 7,
        badgeId: "ramayana-scholar",
        tasks: [
            { day: 1, title: "Read: The Prince's Exile", taskType: 'read-story', contentId: 'ramayana-summary' },
            { day: 2, title: "Watch: The Abduction of Sita", taskType: 'watch-media', contentId: 'media-3' },
            { day: 3, title: "Recite: Hanuman Chalisa", taskType: 'recite-mantra', contentId: 'ॐ हनुमते नमः' },
            { day: 4, title: "Read: The Search for Sita", taskType: 'read-story', contentId: 'ramayana-summary' },
            { day: 5, title: "Watch: The Great Battle", taskType: 'watch-media', contentId: 'media-3' },
            { day: 6, title: "Recite: Rama Raksha Stotram", taskType: 'recite-mantra', contentId: 'श्री राम राम रामेति' },
            { day: 7, title: "Reflect on Dharma", taskType: 'read-story', contentId: 'ramayana-summary' },
        ]
    }
];

export const getChallengeById = (id: string) => {
    return challenges.find(c => c.id === id);
}

export const challengeConverter: FirestoreDataConverter<Challenge> = {
    toFirestore: (challenge: Challenge): DocumentData => {
        return {
            id: challenge.id,
            title_en: challenge.title_en,
            title_hi: challenge.title_hi,
            description_en: challenge.description_en,
            description_hi: challenge.description_hi,
            durationDays: challenge.durationDays,
            badgeId: challenge.badgeId,
            tasks: challenge.tasks,
        };
    },
    fromFirestore: (snapshot, options): Challenge => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            title_en: data.title_en,
            title_hi: data.title_hi,
            description_en: data.description_en,
            description_hi: data.description_hi,
            durationDays: data.durationDays,
            badgeId: data.badgeId,
            tasks: data.tasks,
        };
    }
};
