
export type Manifestation = {
    id: string;
    slug: string;
    title: string;
    technique: string;
    results?: string;
    tags: string[];
    imageUrl?: string;
    imageHint?: string;
    authorId: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
};

export const manifestations: Manifestation[] = [
    {
        id: "1",
        slug: "369-method-for-abundance",
        title: "The 369 Method for Abundance",
        technique: "Write down your desire 3 times in the morning, 6 times in the afternoon, and 9 times at night. Focus on the feeling of having already achieved it. I did this for a week straight, visualizing a new job opportunity.",
        results: "Amazingly, I got a call for my dream job on the eighth day! The key is consistency and truly feeling the emotion.",
        tags: ["abundance", "scripting", "369-method"],
        imageUrl: "https://picsum.photos/seed/manifest-369/800/600",
        imageHint: "journal writing",
        authorId: "user123",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        likesCount: 1200,
        commentsCount: 75,
    },
    {
        id: "2",
        slug: "two-cup-method-for-shifting-realities",
        title: "The Two-Cup Method for Shifting Realities",
        technique: "You'll need two cups and some sticky notes. Label one cup 'Current Reality' and describe your current situation on its note. Label the other 'Desired Reality' and describe what you want. Fill the 'Current' cup with water. As you pour the water into the 'Desired' cup, meditate on the shift and feel the change happening.",
        results: "I used this to shift from a state of creative block to one of inspiration. The next day, ideas were flowing effortlessly. It's a powerful mental reset.",
        tags: ["reality-shifting", "visualization", "water-ritual"],
        imageUrl: "https://picsum.photos/seed/manifest-cups/800/600",
        imageHint: "two glasses water",
        authorId: "user456",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        likesCount: 2500,
        commentsCount: 150,
    },
    {
        id: "3",
        slug: "pillow-method-for-subconscious-programming",
        title: "Pillow Method for Subconscious Programming",
        technique: "Write your affirmation or desire on a piece of paper. Before sleeping, hold the paper, read it, and meditate on it for a few minutes. Place the paper under your pillow and sleep. Your subconscious will work on it overnight.",
        tags: ["subconscious", "scripting", "sleep"],
        imageUrl: "https://picsum.photos/seed/manifest-pillow/800/600",
        imageHint: "peaceful sleep",
        authorId: "user789",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        likesCount: 950,
        commentsCount: 45,
    }
];

export const getManifestationBySlug = (slug: string): Manifestation | undefined => {
    return manifestations.find(m => m.slug === slug);
}
