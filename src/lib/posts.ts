
export type Post = {
    id: string;
    groupId: string;
    authorId: string;
    content: string;
    createdAt: string;
    likes: number;
    commentsCount: number;
}

export const posts: Post[] = [
    {
        id: "post-1",
        groupId: "1",
        authorId: "user123",
        content: "What is your favorite story about Lord Shiva's compassion? The story of Markandeya always moves me.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 152,
        commentsCount: 18,
    },
    {
        id: "post-2",
        groupId: "1",
        authorId: "user456",
        content: "Just returned from a trip to a Shiva temple in the Himalayas. The energy was unreal. Har Har Mahadev!",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 340,
        commentsCount: 25,
    },
    {
        id: "post-3",
        groupId: "2",
        authorId: "user789",
        content: "Which verse from the Bhagavad Gita gives you the most strength in difficult times? For me, it's Chapter 2, Verse 47.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 580,
        commentsCount: 45,
    },
    {
        id: "post-4",
        groupId: "3",
        authorId: "user101",
        content: "Reading the Ramayana again. Rama's commitment to Dharma, even in the face of extreme personal hardship, is a lesson for all time.",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 210,
        commentsCount: 12,
    },
];

export const getPostsByGroupId = (groupId: string): Post[] => {
    return posts.filter(p => p.groupId === groupId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
