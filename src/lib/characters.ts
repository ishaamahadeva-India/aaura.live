
export type EpicHero = {
    id: string;
    slug: string;
    name: { [key: string]: string };
    epicAssociation: string[];
    imageUrl: string;
    imageHint: string;
    description: string;
    quote: {
        text: string;
        source: string;
    };
    modernRelevance: string;
    background: {
        birth: string;
        earlyLife: string;
        family: {
            parents: string[];
            siblings: string[];
            spouses: string[];
            children: string[];
        };
    };
    prominence: string;
    qualities: string[];
    achievements: string[];
    mistakes: string[];
    learningsForChildren: string[];
    relatedContent: {
        sacredTales: string[];
        deities: string[];
        rituals: string[];
    };
    popularity: number;
    createdAt: string;
    updatedAt: string;
};

export const characters: EpicHero[] = [
    {
        id: "arjuna",
        slug: "arjuna",
        name: { en: "Arjuna" },
        epicAssociation: ["Mahabharata"],
        imageUrl: "https://picsum.photos/seed/arjuna1/600/400",
        imageHint: "warrior archer",
        description: "A legendary archer and one of the Pandava brothers, known for his unwavering focus and devotion to Krishna.",
        quote: {
            text: "It is better to live your own destiny imperfectly than to live an imitation of somebody else's life with perfection.",
            source: "Bhagavad Gita"
        },
        modernRelevance: "Arjuna's internal conflict on the battlefield symbolizes the modern struggle with difficult ethical choices. His journey teaches us the importance of seeking wisdom and acting with purpose, even when faced with doubt.",
        background: {
            birth: "Born to Kunti and Indra through divine boon; third of the Pandavas.",
            earlyLife: "Trained under Dronacharya in Hastinapura; excelled in archery from a young age.",
            family: {
                parents: ["Kunti (mother)", "Indra (divine father)", "Pandu (adoptive father)"],
                siblings: ["Yudhishthira", "Bhima", "Nakula", "Sahadeva"],
                spouses: ["Draupadi", "Subhadra", "Chitrangada", "Ulupi"],
                children: ["Abhimanyu (with Subhadra)", "Babhruvahana (with Chitrangada)"]
            }
        },
        prominence: "Central hero in the Mahabharata; recipient of the Bhagavad Gita teachings from Krishna during the Kurukshetra war.",
        qualities: [
            "Exceptional archery skills and concentration (e.g., piercing the fish's eye in Draupadi's swayamvara).",
            "Devotion and humility towards mentors like Krishna and Drona.",
            "Courage and strategic thinking in battles."
        ],
        achievements: [
            "Won Draupadi's hand in marriage through skill.",
            "Acquired divine weapons like the Pashupatastra from Shiva.",
            "Played a pivotal role in the Pandavas' victory in the Kurukshetra war."
        ],
        mistakes: [
            "Initial hesitation and moral dilemma on the battlefield, leading to the Bhagavad Gita discourse.",
            "Arrogance in early life, such as challenging his guru Drona indirectly.",
            "Emotional lapses, like vowing to avenge Abhimanyu's death, which led to intense grief."
        ],
        learningsForChildren: [
            "Focus and perseverance: Arjuna's dedication to practice teaches the value of hard work.",
            "Overcoming doubt: His conversation with Krishna shows how seeking guidance can resolve inner conflicts.",
            "Humility and ethics: Mistakes like hesitation remind us that even heroes learn from errors, promoting resilience and moral growth."
        ],
        relatedContent: {
            sacredTales: ["mahabharata-summary"],
            deities: ["krishna", "shiva"],
            rituals: ["daily-surya-puja"]
        },
        popularity: 1500,
        createdAt: "2025-10-15T00:00:00Z",
        updatedAt: "2025-10-15T00:00:00Z"
    },
    {
        id: "hanuman",
        slug: "hanuman",
        name: { en: "Hanuman" },
        epicAssociation: ["Ramayana"],
        imageUrl: "https://picsum.photos/seed/hanuman1/600/400",
        imageHint: "Hanuman flying",
        description: "An ardent devotee of Lord Rama, Hanuman is a central character in the Ramayana epic. He is a divine vanara (monkey-like humanoid) and is known for his immense strength, devotion, and courage.",
         quote: {
            text: "I am a humble messenger of Sri Rama. I have come here to serve Rama, to do His work. By the command of Lord Rama, I have come here.",
            source: "Ramayana"
        },
        modernRelevance: "Hanuman's selfless service and unwavering devotion are timeless examples of loyalty and faith. In modern life, he represents the power of dedication and using one's strength for a righteous cause.",
        background: {
            birth: "Born to Anjana and Kesari, with the blessings of Vayu, the wind god.",
            earlyLife: "Known for his mischievous childhood, once mistaking the sun for a ripe fruit.",
            family: {
                parents: ["Anjana (mother)", "Kesari (father)", "Vayu (divine father)"],
                siblings: [],
                spouses: ["Celibate"],
                children: []
            }
        },
        prominence: "Pivotal in Rama's quest to rescue Sita, showcasing superhuman feats of strength and loyalty.",
        qualities: [
            "Unwavering devotion (Bhakti) to Lord Rama.",
            "Immense physical strength and the ability to change form.",
            "Humility despite his great power."
        ],
        achievements: [
            "Leaped across the ocean to Lanka.",
            "Found Sita in Lanka and delivered Rama's message.",
            "Carried an entire mountain of herbs to save Lakshmana."
        ],
        mistakes: [
            "His childhood mischief, though innocent, sometimes caused trouble for the sages.",
            "Underestimated the power of Indrajit's Brahmastra initially."
        ],
        learningsForChildren: [
            "The power of devotion: Hanuman's strength came from his faith in Rama.",
            "Service to others: He dedicated his life to serving a righteous cause.",
            "Never give up: No matter the obstacle, Hanuman found a way to succeed."
        ],
        relatedContent: {
            sacredTales: ["ramayana-summary"],
            deities: ["shiva"],
            rituals: []
        },
        popularity: 1800,
        createdAt: "2025-10-15T00:00:00Z",
        updatedAt: "2025-10-15T00:00:00Z"
    }
];

export const getCharacterBySlug = (slug: string) => {
    return characters.find(c => c.slug === slug);
}
