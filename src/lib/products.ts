
import type { FirestoreDataConverter } from "firebase/firestore";

export type Product = {
    id: string;
    shopId: string;
    name_en: string;
    name_hi: string;
    description_en: string;
    description_hi: string;
    price: number;
    originalPrice?: number;
    imageUrl: string;
    category: string;
    imageHint?: string;
  };
  
  export const products: Product[] = [
    {
      id: "prod_1",
      shopId: "shop_123",
      name_en: "Handcrafted Ganesha Idol",
      name_hi: "हस्तनिर्मित गणेश मूर्ति",
      description_en: "A beautiful, eco-friendly Ganesha idol made from clay. Perfect for your home altar or as a gift.",
      description_hi: "मिट्टी से बनी एक सुंदर, पर्यावरण-अनुकूल गणेश मूर्ति। आपके घर के मंदिर या उपहार के रूप में बिल्कुल सही।",
      originalPrice: 1599.00,
      price: 1299.00,
      imageUrl: "https://picsum.photos/seed/ganesha-idol/600/600",
      category: "Idols",
      imageHint: "Ganesha idol",
    },
    {
      id: "prod_2",
      shopId: "shop_456",
      name_en: "Premium Sandalwood Incense Sticks",
      name_hi: "प्रीमियम चंदन अगरबत्ती",
      description_en: "100% natural sandalwood incense sticks. Creates a calming and meditative atmosphere.",
      description_hi: "100% प्राकृतिक चंदन अगरबत्ती। एक शांत और ध्यानपूर्ण वातावरण बनाती है।",
      price: 499.00,
      imageUrl: "https://picsum.photos/seed/incense/600/600",
      category: "Incense",
      imageHint: "incense sticks",
    },
    {
      id: "prod_3",
      shopId: "shop_789",
      name_en: "Bhagavad Gita - Hardcover Edition",
      name_hi: "भगवद गीता - हार्डकवर संस्करण",
      description_en: "A beautifully printed hardcover edition of the timeless scripture, with original Sanskrit and English translation.",
      description_hi: "कालातीत शास्त्र का एक खूबसूरती से मुद्रित हार्डकवर संस्करण, मूल संस्कृत और अंग्रेजी अनुवाद के साथ।",
      price: 799.00,
      imageUrl: "https://picsum.photos/seed/gita-book/600/600",
      category: "Books",
      imageHint: "holy book",
    },
    {
      id: "prod_4",
      shopId: "shop_123",
      name_en: "Brass Pooja Thali Set",
      name_hi: "पीतल की पूजा थाली सेट",
      description_en: "A complete pooja thali set made of pure brass, including a diya, bell, and incense holder.",
      description_hi: "शुद्ध पीतल से बना एक संपूर्ण पूजा थाली सेट, जिसमें एक दीया, घंटी और अगरबत्ती होल्डर शामिल है।",
      originalPrice: 2999.00,
      price: 2499.00,
      imageUrl: "https://picsum.photos/seed/pooja-thali/600/600",
      category: "Pooja Items",
      imageHint: "brass plate ritual",
    },
     {
      id: "prod_5",
      shopId: "shop_456",
      name_en: "Rudraksha Mala (5-Mukhi)",
      name_hi: "रुद्राक्ष माला (5-मुखी)",
      description_en: "Authentic 5-Mukhi Rudraksha mala for meditation and spiritual well-being. Lab-certified beads.",
      description_hi: "ध्यान और आध्यात्मिक कल्याण के लिए प्रामाणिक 5-मुखी रुद्राक्ष माला। लैब-प्रमाणित मोती।",
      price: 1599.00,
      imageUrl: "https://picsum.photos/seed/rudraksha/600/600",
      category: "Jewelry",
      imageHint: "prayer beads",
    },
    {
      id: "prod_6",
      shopId: "shop_789",
      name_en: "Meditation Cushion (Zafu)",
      name_hi: "ध्यान कुशन (ज़ाफू)",
      description_en: "Ergonomic zafu meditation cushion filled with buckwheat hulls for comfortable, long-duration practice.",
      description_hi: "आरामदायक, लंबी अवधि के अभ्यास के लिए बकव्हीट हल्स से भरा एर्गोनोमिक ज़ाफू ध्यान कुशन।",
      price: 1999.00,
      imageUrl: "https://picsum.photos/seed/meditation-cushion/600/600",
      category: "Wellness",
      imageHint: "meditation cushion",
    },
    {
      id: "prod_7",
      shopId: "shop_123",
      name_en: "Copper Water Bottle",
      name_hi: "तांबे की पानी की बोतल",
      description_en: "Leak-proof copper bottle for Ayurvedic health benefits. Enjoy Tamra Jal (copper-infused water).",
      description_hi: "आयुर्वेदिक स्वास्थ्य लाभों के लिए लीक-प्रूफ तांबे की बोतल। ताम्र जल (तांबा-युक्त पानी) का आनंद लें।",
      originalPrice: 999.00,
      price: 899.00,
      imageUrl: "https://picsum.photos/seed/copper-bottle/600/600",
      category: "Wellness",
      imageHint: "copper bottle",
    },
    {
      id: "prod_8",
      shopId: "shop_456",
      name_en: "Shiva Statue - Nataraja",
      name_hi: "शिव प्रतिमा - नटराज",
      description_en: "Exquisite bronze-finish statue of Lord Shiva as Nataraja, the cosmic dancer. A masterpiece for your collection.",
      description_hi: "नटराज, ब्रह्मांडीय नर्तक के रूप में भगवान शिव की उत्कृष्ट कांस्य-फिनिश प्रतिमा। आपके संग्रह के लिए एक उत्कृष्ट कृति।",
      price: 4999.00,
      imageUrl: "https://picsum.photos/seed/nataraja/600/600",
      category: "Idols",
      imageHint: "dancing Shiva statue",
    }
  ];

  export const productConverter: FirestoreDataConverter<Product> = {
    toFirestore: (product: Product) => product,
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return { ...data, id: snapshot.id } as Product;
    }
};
  
  export const getProductById = (id: string) => {
    return products.find(p => p.id === id);
  }
  
