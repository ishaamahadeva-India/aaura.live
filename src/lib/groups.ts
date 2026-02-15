
export type Group = {
    id: string;
    name: string;
    description: string;
    coverImageUrl: string;
    topicType: string;
    topicId: string;
    memberCount: number;
    createdAt: string;
}

export const groups: Group[] = [
    {
        id: "1",
        name: "Followers of Lord Shiva",
        description: "A community for devotees of Mahadev. Share stories, bhajans, and discuss the teachings of Lord Shiva.",
        coverImageUrl: "https://picsum.photos/seed/shiva-group/600/400",
        topicType: "deity",
        topicId: "shiva",
        memberCount: 12500,
        createdAt: "2023-01-15T10:00:00Z"
    },
    {
        id: "2",
        name: "Krishna Consciousness & Bhakti Yoga",
        description: "Explore the path of devotion with fellow Krishna devotees. Discuss the Bhagavad Gita, share kirtans, and celebrate the life of Krishna.",
        coverImageUrl: "https://picsum.photos/seed/krishna-group/600/400",
        topicType: "deity",
        topicId: "krishna",
        memberCount: 22800,
        createdAt: "2023-03-20T12:00:00Z"
    },
    {
        id: "3",
        name: "Ramayana & Lessons on Dharma",
        description: "A group dedicated to studying the Ramayana and understanding the principles of Dharma as exemplified by Lord Rama.",
        coverImageUrl: "https://picsum.photos/seed/ramayana-group/600/400",
        topicType: "story",
        topicId: "ramayana-summary",
        memberCount: 8400,
        createdAt: "2023-05-10T14:00:00Z"
    },
    {
        id: "4",
        name: "Pilgrimage to Kedarnath",
        description: "For pilgrims who have visited or plan to visit the holy shrine of Kedarnath. Share travel tips, experiences, and photos.",
        coverImageUrl: "https://picsum.photos/seed/kedarnath-group/600/400",
        topicType: "temple",
        topicId: "kedarnath-temple",
        memberCount: 5600,
        createdAt: "2023-08-01T09:00:00Z"
    },
];

export const getGroupById = (id: string): Group | undefined => {
    return groups.find(g => g.id === id);
}
