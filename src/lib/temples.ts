
export type Temple = {
  id: string;
  slug: string;
  name: { [key: string]: string };
  officialWebsite?: string;
  deity: {
    name: { [key: string]: string };
    significance: { [key: string]: string };
  };
  location: {
    address: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    geo: {
      lat: number;
      lng: number;
    };
  };
  importance: {
    historical: { [key: string]: string };
    mythological: { [key: string]: string };
  };
  media: {
    images: { url: string; hint: string }[];
    videos: { url: string; hint: string }[];
  };
  visitingInfo: {
    timings: { [key: string]: string };
    festivals: { [key: string]: string };
    poojaGuidelines: { [key: string]: string };
    dressCode: { [key: string]: string };
  };
  nearbyInfo: {
    placesToVisit?: { name?: string, description?: string }[];
    accommodation?: { name?: string, phone?: string }[];
    food?: { name?: string, phone?: string }[];
    transport?: { name?: string, phone?: string }[];
    guides?: { name?: string, phone?: string }[];
  };
};

export const temples: Temple[] = [
  {
    id: "1",
    slug: "ram-mandir-ayodhya",
    name: {
      en: "Ram Mandir, Ayodhya",
      hi: "राम मंदिर, अयोध्या",
      te: "రామ మందిరం, అయోధ్య",
      mr: "राम मंदिर, अयोध्या",
      ta: "ராமர் মন্দির, அயோத்தி",
      kn: "ರಾಮ ಮಂದಿರ, ಅಯೋಧ್ಯೆ",
      bn: "রাম মন্দির, অযোধ্যা",
    },
    officialWebsite: "https://srjbtkshetra.org/",
    deity: {
      name: {
        en: "Ram Lalla (infant Lord Rama)",
        hi: "राम लल्ला (बालक भगवान राम)",
        te: "రామ్ లల్లా (బాల రాముడు)",
        mr: "राम लल्ला (बालक भगवान राम)",
        ta: "ராம் லல்லா (குழந்தை ராமர்)",
        kn: "ರಾಮ ಲಲ್ಲಾ (ಶಿಶು ಭಗವಾన్ ರಾಮ)",
        bn: "রাম লল্লা (শিশু ভগবান রাম)",
      },
      significance: {
        en: "Believed to be the birthplace (Ram Janmabhoomi) of Lord Rama, a major avatar of Vishnu.",
        hi: "माना जाता है कि यह भगवान राम, विष्णु के एक प्रमुख अवतार का जन्मस्थान (राम जन्मभूमि) है।",
        te: "విష్ణువు యొక్క ప్రధాన అవతారమైన శ్రీరాముని జన్మస్థలం (రామ జన్మభూమి) అని నమ్ముతారు.",
        mr: "भगवान विष्णूचा प्रमुख अवतार असलेल्या भगवान रामाचे जन्मस्थान (रामजन्मभूमी) मानले जाते.",
        ta: "விஷ்ணுவின் முக்கிய அவதாரமான ராமர் பிறந்த இடம் (ராம் ஜென்மபூமி) என்று நம்பப்படுகிறது.",
        kn: "ವಿಷ್ಣುವಿನ ಪ್ರಮುಖ ಅವತಾರವಾದ ಭಗವಾನ್ ರಾಮನ ಜನ್ಮಸ್ಥಳ (ರಾಮ ಜನ್ಮಭೂಮಿ) ಎಂದು ನಂಬಲಾಗಿದೆ.",
        bn: "বিষ্ণুর অন্যতম প্রধান অবতার ভগবান রামের জন্মস্থান (রাম জন্মভূমি) বলে বিশ্বাস করা হয়।",
      },
    },
    location: {
      address: "Ram Path, Ramkot",
      city: "Ayodhya",
      district: "Ayodhya",
      state: "Uttar Pradesh",
      pincode: "224123",
      geo: { lat: 26.7957, lng: 82.1943 },
    },
    importance: {
      historical: {
        en: "Site of the historic Babri Masjid and a long-standing socio-religious dispute, culminating in the construction of the new temple inaugurated in 2024.",
        hi: "ऐतिहासिक बाबरी मस्जिद का स्थल और एक लंबे समय से चला आ रहा सामाजिक-धार्मिक विवाद, जिसका समापन 2024 में उद्घाटन किए गए नए मंदिर के निर्माण में हुआ।",
        te: "చారిత్రాత్మక బాబ్రీ మసీదు మరియు దీర్ఘకాలంగా ఉన్న సామాజిక-మత వివాదానికి ప్రదేశం, ఇది 2024లో ప్రారంభించబడిన కొత్త ఆలయ నిర్మాణంతో ముగిసింది.",
        mr: "ऐतिहासिक बाबरी मशिदीचे ठिकाण आणि दीर्घकाळ चाललेला सामाजिक-धार्मिक वाद, ज्याचा शेवट २०२४ मध्ये उद्घाटन झालेल्या नवीन मंदिराच्या बांधकामात झाला.",
        ta: "வரலாற்று சிறப்புமிக்க பாபர் மசூதி மற்றும் நீண்டகாலமாக இருந்து வரும் சமூக-மத தகராறுக்குரிய இடம், இதன் விளைவாக 2024 இல் திறக்கப்பட்ட புதிய கோயில் கட்டப்பட்டது.",
        kn: "ಐತಿಹಾಸಿಕ ಬಾಬರಿ ಮಸೀದಿಯ ಸ್ಥಳ ಮತ್ತು ದೀರ್ಘಕಾಲದ ಸಾಮಾಜಿಕ-ಧಾರ್ಮಿಕ ವಿವಾದ, 2024 ರಲ್ಲಿ ಉದ್ಘಾಟನೆಗೊಂಡ ಹೊಸ ದೇವಾಲಯದ ನಿರ್ಮಾಣದಲ್ಲಿ ಕೊನೆಗೊಂಡಿತು.",
        bn: "ঐতিহাসিক বাবরি মসজিদের স্থান এবং একটি দীর্ঘস্থায়ী সামাজিক-ধর্মীয় বিরোধ, যা ২০২৪ সালে উদ্বোধন করা নতুন মন্দির নির্মাণের মাধ্যমে শেষ হয়।",
      },
      mythological: {
        en: "The epic Ramayana centers around Ayodhya as the capital of the Kosala Kingdom and the divine realm of Lord Rama.",
        hi: "महाकाव्य रामायण अयोध्या को कोशल साम्राज्य की राजधानी और भगवान राम के दिव्य क्षेत्र के रूप में केंद्रित करता है।",
        te: "రామాయణ ఇతిహాసం కోసల రాజ్యానికి రాజధానిగా మరియు శ్రీరాముని దివ్య రాజ్యంగా అయోధ్య చుట్టూ కేంద్రీకృతమై ఉంది.",
        mr: "रामायण महाकाव्य कोसल राज्याची राजधानी आणि भगवान रामाचे दिव्य क्षेत्र म्हणून अयोध्येभोवती केंद्रित आहे.",
        ta: "ராமாயண காவியம் கோசல ராஜ்ஜியத்தின் தலைநகராகவும், ராமர் தெய்வீக ராஜ்யமாகவும் அயோத்தியை மையமாகக் கொண்டுள்ளது.",
        kn: "ರಾಮಾಯಣ ಮಹಾಕಾವ್ಯವು ಕೋಸಲ ಸಾಮ್ರಾಜ್ಯದ ರಾಜಧಾನಿಯಾಗಿ ಮತ್ತು ಭಗವಾನ್ ರಾಮನ ದೈವಿಕ ಕ್ಷೇತ್ರವಾಗಿ ಅಯೋಧ್ಯೆಯ ಸುತ್ತ ಕೇಂದ್ರೀಕೃತವಾಗಿದೆ.",
        bn: "রামায়ণ মহাকাব্যটি কোশল রাজ্যের রাজধানী এবং ভগবান রামের দিব্য রাজ্য হিসাবে অযোধ্যাকে কেন্দ্র করে আবর্তিত হয়েছে।",
      },
    },
    media: {
      images: [
        { url: "https://picsum.photos/seed/rammandir1/800/600", hint: "grand temple" },
        { url: "https://picsum.photos/seed/rammandir2/800/600", hint: "temple carvings" },
        { url: "https://picsum.photos/seed/rammandir3/800/600", hint: "devotees praying" },
      ],
      videos: [],
    },
    visitingInfo: {
      timings: {
        en: "Darshan: 7:00 AM - 11:30 AM & 2:00 PM - 7:00 PM. Aarti times vary.",
        hi: "दर्शन: सुबह 7:00 बजे - 11:30 बजे और दोपहर 2:00 बजे - शाम 7:00 बजे। आरती का समय बदलता रहता है।",
        te: "దర్శనం: ఉదయం 7:00 - 11:30 మరియు మధ్యాహ్నం 2:00 - 7:00. హారతి సమయాలు మారుతూ ఉంటాయి.",
        mr: "दर्शन: सकाळी ७:०० ते ११:३० आणि दुपारी २:०० ते संध्याकाळी ७:००. आरतीच्या वेळा बदलतात.",
        ta: "தரிசனம்: காலை 7:00 - 11:30 & மதியம் 2:00 - மாலை 7:00. ஆரத்தி நேரங்கள் மாறுபடும்.",
        kn: "ದರ್ಶನ: ಬೆಳಿಗ್ಗೆ 7:00 - 11:30 & ಮಧ್ಯಾಹ್ನ 2:00 - ಸಂಜೆ 7:00. ಆರತಿ ಸಮಯಗಳು ಬದಲಾಗುತ್ತವೆ.",
        bn: "দর্শন: সকাল ৭:০০ - ১১:৩০ এবং দুপুর ২:০০ - সন্ধ্যা ৭:০০। আরতির সময় পরিবর্তিত হয়।",
      },
      festivals: {
        en: "Ram Navami, Deepavali, and Vivah Panchami are celebrated with grandeur.",
        hi: "राम नवमी, दीपावली और विवाह पंचमी भव्यता के साथ मनाई जाती हैं।",
        te: "శ్రీరామనవమి, దీపావళి, మరియు వివాహ పంచమి వైభవంగా జరుపుకుంటారు.",
        mr: "रामनवमी, दिवाळी आणि विवाह पंचमी मोठ्या थाटामाटात साजरी केली जाते.",
        ta: "ராம நவமி, தீபாவளி மற்றும் விவாஹ பஞ்சமி ஆகியவை பிரம்மாண்டமாக கொண்டாடப்படுகின்றன.",
        kn: "ರಾಮ ನವಮಿ, ದೀಪಾವಳಿ ಮತ್ತು ವಿವಾಹ ಪಂಚಮಿಯನ್ನು ವೈಭವದಿಂದ ಆಚರಿಸಲಾಗುತ್ತದೆ.",
        bn: "রাম নবমী, দীপাবলি এবং বিবাহ পঞ্চমী জাঁকজমকের সাথে উদযাপিত হয়।",
      },
      poojaGuidelines: {
        en: "Offerings of flowers and sweets are common. Follow temple instructions for specific poojas.",
        hi: "फूलों और मिठाइयों का प्रसाद चढ़ाना आम बात है। विशिष्ट पूजा के लिए मंदिर के निर्देशों का पालन करें।",
        te: "పువ్వులు మరియు స్వీట్ల నైవేద్యాలు సాధారణం. నిర్దిష్ట పూజల కోసం ఆలయ సూచనలను అనుసరించండి.",
        mr: "फुले आणि मिठाईचे नैवेद्य सामान्य आहेत. विशिष्ट पूजांसाठी मंदिराच्या सूचनांचे पालन करा.",
        ta: "பூக்கள் மற்றும் இனிப்புகள் வழங்குவது பொதுவானது. குறிப்பிட்ட பூஜைகளுக்கு கோயில் வழிமுறைகளைப் பின்பற்றவும்.",
        kn: "ಹೂವುಗಳು ಮತ್ತು ಸಿಹಿತಿಂಡಿಗಳ ನೈವೇದ್ಯಗಳು ಸಾಮಾನ್ಯ. ನಿರ್ದಿಷ್ಟ ಪೂಜೆಗಳಿಗಾಗಿ ದೇವಾಲಯದ ಸೂಚನೆಗಳನ್ನು ಅನುಸರಿಸಿ.",
        bn: "ফুল ও মিষ্টির নৈবেদ্য সাধারণ। নির্দিষ্ট পূজার জন্য মন্দিরের নির্দেশাবলী অনুসরণ করুন।",
      },
      dressCode: {
        en: "Modest attire is required. Shoulders and knees should be covered.",
        hi: "शिष्ट पोशाक आवश्यक है। कंधे और घुटने ढके होने चाहिए।",
        te: "సాధారణ దుస్తులు అవసరం. భుజాలు మరియు మోకాళ్లు కప్పి ఉండాలి.",
        mr: "साधा पोशाख आवश्यक आहे. खांदे आणि गुडघे झाकलेले असावेत.",
        ta: "சாதாரண உடை தேவை. தோள்கள் மற்றும் முழங்கால்கள் மூடப்பட்டிருக்க வேண்டும்.",
        kn: "ಸರಳ ಉಡುಪು ಅಗತ್ಯ. ಭುజಗಳು ಮತ್ತು ಮೊಣಕಾಲುಗಳು ಮುಚ್ಚಿರಬೇಕು.",
        bn: "শালীন পোশাক প্রয়োজন। কাঁধ এবং হাঁটু ঢাকা উচিত।",
      },
    },
    nearbyInfo: {
      placesToVisit: [ {name: "Hanuman Garhi"}, {name: "Kanak Bhawan"}, {name: "Sarayu River Ghats"} ],
      accommodation: [ {name: "Various hotels, guesthouses, and dharamshalas are available in Ayodhya. Booking in advance is recommended."} ],
      food: [ {name: "Local vegetarian cuisine is widely available. Temple trust provides 'Prasadam'."} ],
      transport: [ {name: "Nearest Airport: Ayodhya (AYJ). Well-connected by rail (Ayodhya Dham Jn) and road."} ],
      guides: [ ],
    },
  },
  {
    id: "2",
    slug: "kedarnath-temple",
    name: {
      en: "Kedarnath Temple",
      hi: "केदारनाथ मंदिर",
      te: "కేదార్‌నాథ్ ఆలయం",
      mr: "केदारनाथ मंदिर",
      ta: "கேதார்நாத் கோயில்",
      kn: "ಕೇದಾರನಾಥ ದೇವಾಲಯ",
      bn: "কেদারনাথ মন্দির",
    },
    deity: {
      name: {
        en: "Lord Shiva (as Kedarnath)",
        hi: "भगवान शिव (केदारनाथ के रूप में)",
        te: "శివుడు (కేదార్‌నాథ్‌గా)",
        mr: "भगवान शिव (केदारनाथ म्हणून)",
        ta: "சிவன் (கேதார்நாத் ஆக)",
        kn: "ಶಿವ ದೇವರು (ಕೇದಾರನಾಥನಾಗಿ)",
        bn: "ভগবান শিব (কেদারনাথ রূপে)",
      },
      significance: {
        en: "One of the twelve Jyotirlingas of Lord Shiva. It is one of the most sacred pilgrimage sites for Hindus.",
        hi: "भगवान शिव के बारह ज्योतिर्लिंगों में से एक। यह हिंदुओं के लिए सबसे पवित्र तीर्थ स्थलों में से एक है।",
        te: "శివుని పన్నెండు జ్యోతిర్లింగాలలో ఒకటి. ఇది హిందువులకు అత్యంత పవిత్రమైన పుణ్యక్షేత్రాలలో ఒకటి.",
        mr: "भगवान शिवाच्या बारा ज्योतिर्lingaंपैकी एक. हे हिंदूंच्या सर्वात पवित्र तीर्थक्षेत्रांपैकी एक आहे.",
        ta: "சிவனின் பன்னிரண்டு ஜோதிர்லிங்கங்களில் ஒன்று. ఇది இந்துக்களுக்கு மிகவும் புனிதமான तीर्थத்தலங்களில் ஒன்றாகும்.",
        kn: "ಶಿವನ ಹನ್ನೆರಡು ಜ್ಯೋತಿರ್ಲಿಂಗಗಳಲ್ಲಿ ಒಂದು. ಇದು ಹಿಂದೂಗಳಿಗೆ ಅತ್ಯಂತ ಪವಿತ್ರವಾದ ಯಾತ್ರಾ ಸ್ಥಳಗಳಲ್ಲಿ ಒಂದಾಗಿದೆ.",
        bn: "ভগবান শিবের বারোটি জ্যোতির্লিঙ্গের মধ্যে একটি। এটি হিন্দুদের জন্য সবচেয়ে পবিত্র তীর্থস্থানগুলির মধ্যে একটি।",
      },
    },
    location: {
      address: "Kedarnath",
      city: "Kedarnath",
      district: "Rudraprayag",
      state: "Uttarakhand",
      pincode: "246445",
      geo: { lat: 30.7352, lng: 79.0669 },
    },
    importance: {
      historical: {
        en: "An ancient temple believed to have been built by the Pandavas and revived by Adi Shankaracharya in the 8th century.",
        hi: "माना जाता है कि यह एक प्राचीन मंदिर है जिसे पांडवों ने बनवाया था और 8वीं शताब्दी में आदि शंकराचार्य ने इसका पुनरुद्धार किया था।",
        te: "పాండవులు నిర్మించారని మరియు 8వ శతాబ్దంలో ఆదిశంకరాచార్యులచే పునరుద్ధరించబడిందని నమ్మబడే ఒక పురాతన ఆలయం.",
        mr: "पांडवांनी बांधलेले आणि आठव्या शतकात आदि शंकराचार्यांनी पुनरुज्जीवित केलेले एक प्राचीन मंदिर मानले जाते.",
        ta: "பாண்டவர்களால் கட்டப்பட்டதாகவும், 8 ஆம் நூற்றாண்டில் ஆதி சங்கராச்சாரியாரால் புனரமைக்கப்பட்டதாகவும் நம்பப்படும் ஒரு பழங்கால கோயில்.",
        kn: "ಪಾಂಡವರು ನಿರ್ಮಿಸಿದರು ಮತ್ತು 8 ನೇ ಶತಮಾನದಲ್ಲಿ ಆದಿ ಶಂಕರಾಚಾರ್ಯರು ಪುನರುಜ್ಜೀವನಗೊಳಿಸಿದರು ಎಂದು ನಂಬಲಾದ ಒಂದು ಪ್ರಾಚೀನ ದೇವಾಲಯ.",
        bn: "পাণ্ডবদের দ্বারা নির্মিত এবং ৮ম শতাব্দীতে আদি শঙ্করাচার্য দ্বারা পুনরুজ্জীবিত একটি প্রাচীন মন্দির বলে বিশ্বাস করা হয়।",
      },
      mythological: {
        en: "After the Kurukshetra war, the Pandavas sought Shiva's forgiveness. Shiva, avoiding them, took the form of a bull. The hump of the bull is worshipped at Kedarnath.",
        hi: "कुरुक्षेत्र युद्ध के बाद, पांडवों ने शिव से क्षमा मांगी। शिव ने उनसे बचते हुए एक बैल का रूप धारण किया। केदारनाथ में बैल के कूबड़ की पूजा की जाती है।",
        te: "కురుక్షేత్ర యుద్ధం తరువాత, పాండవులు శివుని క్షమ కోరారు. శివుడు వారిని తప్పించుకుని, ఒక ఎద్దు రూపాన్ని తీసుకున్నాడు. కేదార్‌నాథ్‌లో ఎద్దు యొక్క మూపురం పూజించబడుతుంది.",
        mr: "कुरुक्षेत्र युद्धानंतर, पांडवांनी शिवाची क्षमा मागितली. शिव त्यांना टाळून एका बैलाचे रूप धारण करतो. केदारनाथमध्ये बैलाच्या कुबडाची पूजा केली जाते.",
        ta: "குருக்ஷேத்திரப் போருக்குப் பிறகு, பாண்டவர்கள் சிவனிடம் மன்னிப்பு கேட்டார்கள். சிவன் அவர்களைத் தவிர்த்து, ஒரு காளையின் வடிவத்தை எடுத்தார். కేదార్‌నాத்தில் காளையின் கூம்பு வணங்கப்படுகிறது.",
        kn: "ಕುರುಕ್ಷೇತ್ರ ಯುದ್ಧದ ನಂತರ, ಪಾಂಡವರು ಶಿವನ ಕ್ಷಮೆಯನ್ನು ಕೋರಿದರು. ಶಿವನು ಅವರನ್ನು ತಪ್ಪಿಸಿ, ಒಂದು ಗೂಳಿಯ ರೂಪವನ್ನು ಪಡೆದನು. ಕೇದಾರನಾಥದಲ್ಲಿ ಗೂಳಿಯ ಗೂನನ್ನು ಪೂಜಿಸಲಾಗುತ್ತದೆ.",
        bn: "কুরুক্ষেত্র যুদ্ধের পর, পাণ্ডবরা শিবের ক্ষমা চেয়েছিলেন। শিব তাদের এড়িয়ে গিয়ে একটি ষাঁড়ের রূপ ধারণ করেন। কেদারনাথে ষাঁড়ের কুঁজ পূজা করা হয়।",
      },
    },
    media: {
      images: [
        { url: "https://picsum.photos/seed/kedarnath1/800/600", hint: "temple snow" },
        { url: "https://picsum.photos/seed/kedarnath2/800/600", hint: "himalayan mountains" },
        { url: "https://picsum.photos/seed/kedarnath3/800/600", hint: "pilgrims trekking" },
      ],
      videos: [],
    },
    visitingInfo: {
      timings: {
        en: "The temple is open only for six months (late April to early November) due to extreme weather conditions. Timings are generally 4:00 AM to 9:00 PM.",
        hi: "अत्यधिक मौसम की स्थिति के कारण मंदिर केवल छह महीने (अप्रैल के अंत से नवंबर की शुरुआत तक) के लिए खुला रहता है। समय आमतौर पर सुबह 4:00 बजे से रात 9:00 बजे तक होता है।",
        te: "తీవ్రమైన వాతావరణ పరిస్థితుల కారణంగా ఆలయం కేవలం ఆరు నెలలు (ఏప్రిల్ చివరి నుండి నవంబర్ ప్రారంభం వరకు) మాత్రమే తెరిచి ఉంటుంది. సమయాలు సాధారణంగా ఉదయం 4:00 నుండి రాత్రి 9:00 వరకు ఉంటాయి.",
        mr: "अतिशय हवामानामुळे मंदिर फक्त सहा महिने (एप्रिलच्या अखेरीस ते नोव्हेंबरच्या सुरुवातीस) खुले असते. वेळ साधारणपणे सकाळी ४:०० ते रात्री ९:०० पर्यंत असते.",
        ta: "கடுமையான வானிலை காரணமாக கோயில் ஆறு மாதங்களுக்கு மட்டுமே (ஏப்ரல் பிற்பகுதியிலிருந்து நவம்பர் முற்பகுதி வரை) திறந்திருக்கும். நேரம் பொதுவாக காலை 4:00 மணி முதல் இரவு 9:00 மணி வரை.",
        kn: "ತೀವ್ರ ಹವಾಮಾನ ಪರಿಸ್ಥಿತಿಗಳಿಂದಾಗಿ ದೇವಾಲಯವು ಕೇವಲ ಆರು ತಿಂಗಳು (ಏಪ್ರಿಲ್ ಅಂತ್ಯದಿಂದ ನವೆಂಬರ್ ಆರಂಭದವರೆಗೆ) ಮಾತ್ರ ತೆರೆದಿರುತ್ತದೆ. ಸಮಯಗಳು ಸಾಮಾನ್ಯವಾಗಿ ಬೆಳಿಗ್ಗೆ 4:00 ರಿಂದ ರಾತ್ರಿ 9:00 ರವರೆಗೆ ಇರುತ್ತವೆ.",
        bn: "চরম আবহাওয়ার কারণে মন্দিরটি কেবল ছয় মাস (এপ্রিলের শেষ থেকে নভেম্বরের শুরু পর্যন্ত) খোলা থাকে। সময় সাধারণত সকাল ৪:০০ থেকে রাত ৯:০০ পর্যন্ত।",
      },
      festivals: {
        en: "The opening and closing ceremonies are major events. Maha Shivaratri is significant even when the temple is closed.",
        hi: "उद्घाटन और समापन समारोह प्रमुख कार्यक्रम हैं। मंदिर बंद होने पर भी महा शिवरात्रि महत्वपूर्ण है।",
        te: "ప్రారంభ మరియు ముగింపు వేడుకలు ప్రధాన కార్యక్రమాలు. ఆలయం మూసి ఉన్నప్పటికీ మహా శివరాత్రి ముఖ్యమైనది.",
        mr: "उद्घाटन आणि समारोपाचे कार्यक्रम मोठे असतात. मंदिर बंद असतानाही महाशिवरात्री महत्त्वाची असते.",
        ta: "தொடக்க மற்றும் நிறைவு விழாக்கள் முக்கிய நிகழ்வுகளாகும். கோயில் மூடப்பட்டிருந்தாலும் மகா சிவராத்திரி முக்கியமானது.",
        kn: "ಉದ್ಘಾಟನಾ ಮತ್ತು ಸಮಾರೋಪ ಸಮಾರಂಭಗಳು ಪ್ರಮುಖ ಕಾರ್ಯಕ್ರಮಗಳಾಗಿವೆ. ದೇವಾಲಯ ಮುಚ್ಚಿದ್ದರೂ ಮಹಾಶಿವರಾತ್ರಿ ಮಹತ್ವದ್ದಾಗಿದೆ.",
        bn: "উদ্বোধন ও সমাপনী অনুষ্ঠান প্রধান অনুষ্ঠান। মন্দির বন্ধ থাকলেও মহা শিবরাত্রি তাৎপর্যপূর্ণ।",
      },
      poojaGuidelines: {
        en: "Devotees can perform various poojas. It's advisable to book them in advance online.",
        hi: "भक्त विभिन्न पूजा कर सकते हैं। उन्हें ऑनलाइन अग्रिम रूप से बुक करने की सलाह दी जाती है।",
        te: "భక్తులు వివిధ పూజలు చేయవచ్చు. వాటిని ముందుగానే ఆన్‌లైన్‌లో బుక్ చేసుకోవడం మంచిది.",
        mr: "भाविक विविध पूजा करू शकतात. त्यांना ऑनलाइन आगाऊ बुक करण्याचा सल्ला दिला जातो.",
        ta: "பக்தர்கள் பல்வேறு பூஜைகளை செய்யலாம். அவற்றை முன்கூட்டியே ஆன்லைனில் முன்பதிவு செய்வது நல்லது.",
        kn: "ಭಕ್ತರು ವಿವಿಧ ಪೂಜೆಗಳನ್ನು ಮಾಡಬಹುದು. ಅವುಗಳನ್ನು ಮುಂಚಿತವಾಗಿ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಬುಕ್ ಮಾಡಲು ಸಲಹೆ ನೀಡಲಾಗುತ್ತದೆ.",
        bn: "ভক্তরা বিভিন্ন পূজা করতে পারেন। সেগুলি আগে থেকে অনলাইনে বুক করার পরামর্শ দেওয়া হয়।",
      },
      dressCode: {
        en: "Warm clothing is essential. Traditional and modest dress is expected inside the temple.",
        hi: "गर्म कपड़े आवश्यक हैं। मंदिर के अंदर पारंपरिक और मामूली पोशाक की उम्मीद की जाती है।",
        te: "వెచ్చని దుస్తులు అవసరం. ఆలయం లోపల సాంప్రదాయ మరియు సాధారణ దుస్తులు ధరించాలి.",
        mr: "गरम कपडे आवश्यक आहेत. मंदिरात पारंपारिक आणि साधा पोशाख अपेक्षित आहे.",
        ta: "சூடான உடை அவசியம். கோயிலுக்குள் பாரம்பரிய மற்றும் சாதாரண உடை எதிர்பார்க்கப்படுகிறது.",
        kn: "ಬೆಚ್ಚಗಿನ ಬಟ್ಟೆಗಳು ಅತ್ಯಗತ್ಯ. ದೇವಾಲಯದೊಳಗೆ ಸಾಂಪ್ರದಾಯಿಕ ಮತ್ತು ಸರಳ ಉಡುಗೆ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ.",
        bn: "গরম পোশাক অপরিহার্য। মন্দিরের ভিতরে ঐতিহ্যবাহী এবং শালীন পোশাক প্রত্যাশিত।",
      },
    },
    nearbyInfo: {
      placesToVisit: [ {name: "Bhairavnath Temple"}, {name: "Vasuki Tal"}, {name: "Chorabari Tal (Gandhi Sarovar)"} ],
      accommodation: [ {name: "Guesthouses by GMVN, private lodges, and tents are available in Kedarnath. Booking is essential."} ],
      food: [ {name: "Basic vegetarian food is available. It's advisable to carry some energy bars and snacks."} ],
      transport: [ {name: "Nearest motorable road is Gaurikund. From there, it's a 16 km trek. Pony and helicopter services are available."} ],
      guides: [ {name: "Local guides can be hired at Gaurikund or Sonprayag for the trek."} ],
    },
  },
  {
    id: "3",
    slug: "badrinath-temple",
    name: { en: "Badrinath Temple" },
    deity: { name: { en: "Lord Vishnu" }, significance: { en: "" } },
    location: { city: "Badrinath", state: "Uttarakhand", pincode: "246422", address: "Badrinath", district: "Chamoli", geo: { lat: 30.7433, lng: 79.4938 } },
    importance: { historical: { en: "" }, mythological: { en: "" } },
    media: { images: [{ url: "https://picsum.photos/seed/badrinath1/800/600", hint: "colorful temple mountain" }], videos: [] },
    visitingInfo: { timings: { en: "" }, festivals: { en: "" }, poojaGuidelines: { en: "" }, dressCode: { en: "" } },
    nearbyInfo: {}
  },
  {
    id: "4",
    slug: "somnath-temple",
    name: { en: "Somnath Temple" },
    deity: { name: { en: "Lord Shiva" }, significance: { en: "" } },
    location: { city: "Somnath", state: "Gujarat", pincode: "362268", address: "Somnath", district: "Gir Somnath", geo: { lat: 20.8880, lng: 70.4013 } },
    importance: { historical: { en: "" }, mythological: { en: "" } },
    media: { images: [{ url: "https://picsum.photos/seed/somnath1/800/600", hint: "temple sea" }], videos: [] },
    visitingInfo: { timings: { en: "" }, festivals: { en: "" }, poojaGuidelines: { en: "" }, dressCode: { en: "" } },
    nearbyInfo: {}
  },
  {
    id: "5",
    slug: "vaishno-devi",
    name: { en: "Vaishno Devi Temple" },
    deity: { name: { en: "Goddess Vaishnavi" }, significance: { en: "" } },
    location: { city: "Katra", state: "Jammu and Kashmir", pincode: "182301", address: "Katra", district: "Reasi", geo: { lat: 33.0308, lng: 74.9497 } },
    importance: { historical: { en: "" }, mythological: { en: "" } },
    media: { images: [{ url: "https://picsum.photos/seed/vaishno1/800/600", hint: "mountain shrine" }], videos: [] },
    visitingInfo: { timings: { en: "" }, festivals: { en: "" }, poojaGuidelines: { en: "" }, dressCode: { en: "" } },
    nearbyInfo: {}
  },
  {
    id: "6",
    slug: "golden-temple",
    name: { en: "Golden Temple (Harmandir Sahib)" },
    deity: { name: { en: "Guru Granth Sahib (Sikhism)" }, significance: { en: "" } },
    location: { city: "Amritsar", state: "Punjab", pincode: "143001", address: "Amritsar", district: "Amritsar", geo: { lat: 31.6200, lng: 74.8765 } },
    importance: { historical: { en: "" }, mythological: { en: "" } },
    media: { images: [{ url: "https://picsum.photos/seed/golden-temple/800/600", hint: "golden temple water" }], videos: [] },
    visitingInfo: { timings: { en: "" }, festivals: { en: "" }, poojaGuidelines: { en: "" }, dressCode: { en: "" } },
    nearbyInfo: {}
  },
  {
    id: "7",
    slug: "jagannath-puri",
    name: { en: "Jagannath Temple, Puri" },
    deity: { name: { en: "Lord Jagannath (Krishna)" }, significance: { en: "" } },
    location: { city: "Puri", state: "Odisha", pincode: "752001", address: "Puri", district: "Puri", geo: { lat: 19.8048, lng: 85.8181 } },
    importance: { historical: { en: "" }, mythological: { en: "" } },
    media: { images: [{ url: "https://picsum.photos/seed/jagannath1/800/600", hint: "temple chariot" }], videos: [] },
    visitingInfo: { timings: { en: "" }, festivals: { en: "" }, poojaGuidelines: { en: "" }, dressCode: { en: "" } },
    nearbyInfo: {}
  }
];

export const getTempleBySlug = (slug: string) => {
    return temples.find(t => t.slug === slug);
}

    