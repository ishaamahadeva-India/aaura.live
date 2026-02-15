
export type TemplePost = {
    id: string;
    templeId: string;
    authorId: string;
    content: string;
    createdAt: string;
    likes: number;
    commentsCount: number;
}

export const templePosts: TemplePost[] = [
    {
        id: "tpost-1",
        templeId: "ram-mandir-ayodhya",
        authorId: "user123",
        content: "Just visited today! The queue for darshan was about 90 minutes around 11 AM. The divine atmosphere is unbelievable. Jai Shri Ram!",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 78,
        commentsCount: 12,
    },
    {
        id: "tpost-2",
        templeId: "ram-mandir-ayodhya",
        authorId: "user456",
        content: "Planning to visit next month. Any suggestions for good, affordable accommodation nearby?",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 15,
        commentsCount: 5,
    },
    {
        id: "tpost-3",
        templeId: "kedarnath-temple",
        authorId: "user789",
        content: "The weather is very cold, make sure to carry heavy woolens. The trek was challenging but worth every step. The view is breathtaking. Har Har Mahadev!",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 250,
        commentsCount: 34,
    },
];

export const getPostsByTempleId = (templeId: string): TemplePost[] => {
    return templePosts.filter(p => p.templeId === templeId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
