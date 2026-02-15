
export type Comment = {
    id: string;
    contentId: string; // This would be the postId
    contentType: 'post' | 'media';
    authorId: string;
    text: string;
    createdAt: string;
}

export const comments: Comment[] = [
    {
        id: "comment-1",
        contentId: "post-1",
        contentType: "post",
        authorId: "user456",
        text: "I agree, the story of Markandeya is so powerful! It shows that true devotion can conquer even death.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 55 * 1000).toISOString(),
    },
    {
        id: "comment-2",
        contentId: "post-1",
        contentType: "post",
        authorId: "user789",
        text: "The story of Kannappa Nayanar is another incredible example of unwavering devotion to Lord Shiva.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 50 * 1000).toISOString(),
    },
    {
        id: "comment-3",
        contentId: "post-3",
        contentType: "post",
        authorId: "user101",
        text: "Excellent choice! For me it's Chapter 18, Verse 66: 'Abandon all varieties of religion and just surrender unto Me. I shall deliver you from all sinful reactions. Do not fear.'",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 58 * 1000).toISOString(),
    },
];

export const getCommentsByPostId = (postId: string): Comment[] => {
    return comments.filter(c => c.contentId === postId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
