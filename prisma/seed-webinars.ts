import { PrismaClient, CourseCategory, WebinarStatus } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(s: string) {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// using an explicit type ensures each object matches the Prisma model and
// eliminates the need for "as any" casts.
interface SeedWebinar {
  id: string;
  title: string;
  description: string;
  image?: string;
  videoUrl?: string;
  time?: string;
  instructor?: string;
  instructorBio?: string;
  instructorImage?: string;
  category?: CourseCategory;
  isUpcoming: boolean;
  date: Date;
  duration: number;
  sectionOneTitle?: string;
  sectionOnePoints: string[];
  sectionTwoTitle?: string;
  sectionTwoPoints: string[];
  status: WebinarStatus;
}

const seedWebinars: SeedWebinar[] = [
  {
    id: 'higher-studies-abroad-scholarship',
    title: 'Webinar on Higher Studies Abroad with Scholarship',
    description:
      'বিদেশে পড়ার ইচ্ছা সবার থাকলেও সঠিক তথ্যের অভাবে অনেকেই পিছিয়ে পড়েন। তাই আমরা সাজিয়েছি এই বিশেষ সেশন, যেখানে বিশ্বের নামী-দামী বিশ্ববিদ্যালয়ে স্কলারশিপ পাওয়ার সিক্রেট এবং স্কলারশিপ পাওয়ার জন্য একটি শক্তিশালী প্রোফাইল তৈরির আদ্যোপান্ত শেয়ার করা হবে যাতে কোনো দ্বিধা ছাড়াই আপনি আপনার গ্লোবাল ক্যারিয়ারের পথে পা বাড়াতে পারেন',
    image: '/upcoming-webinar/higher-studies.jpeg',
    videoUrl:
      'https://drive.google.com/file/d/1z1CQDw9ex77RYazgCmS0YSO-YJURYonn/preview',
    time: '9:00 PM - 11:00 PM',
    instructor: 'Kazi Mejbaul Islam',
    instructorBio:
      'PhD in ECE candidate - University of Florida | Research Scholar, SRC Research Scholars Program | Graduate Research Assistant, RISING Lab at The University of Florida | MS, Computer Science, Florida State University',
    instructorImage: '/instructors/Kazi-Mejbaul-Islam.jpeg',
    category: CourseCategory.PROGRAMMING,
    isUpcoming: true,
    date: new Date('2026-01-11T21:00:00Z'),
    duration: 120,
    sectionOneTitle: 'কী কী শিখতে পারবেন এই ওয়েবিনারে?',
    sectionOnePoints: [
      'আপনার জন্য কোন দেশ সেরা হবে? যুক্তরাষ্ট্র (USA), কানাডা, যুক্তরাজ্য (UK), অস্ট্রেলিয়া, জাপান ও কোরিয়ার মতো জনপ্রিয় দেশগুলোর সুযোগ-সুবিধা সম্পর্কে আলোচনা।',
      'একাডেমিক রেজাল্ট কেমন হতে হবে এবং IELTS, TOEFL কিংবা GRE-র মতো পরীক্ষাগুলোর প্রস্তুতি কীভাবে নেবেন।',
      'বিভিন্ন ধরনের স্কলারশিপ (Full-fund/Partial) পাওয়ার উপায়।',
      'কীভাবে একটি শক্তিশালী SOP, LOR এবং প্রফেশনাল CV তৈরি করবেন। সেই সাথে সহ-শিক্ষা কার্যক্রম (Extracurricular) ও রিসার্চ পেপারের গুরুত্ব।',
      'সঠিক সময়ে সঠিক প্রফেসরের সাথে যোগাযোগের কৌশল এবং আবেদনের উপযুক্ত সময় নির্ধারণ।',
      'বিদেশের বিশ্ববিদ্যালয়ে বর্তমান ছাত্র বা অ্যালুমনাইদের সাথে কীভাবে যোগাযোগ স্থাপন করবেন এবং কেনো প্রয়োজন?',
    ],
    sectionTwoTitle: 'কেন Abroad থেকে উচ্চশিক্ষা গ্রহণ করবেন?',
    sectionTwoPoints: [
      'বিদেশের ডিগ্রি আপনাকে বিশ্বের নামী-দামী কোম্পানিগুলোতে কাজ করার সুযোগ করে দেয়। আন্তর্জাতিক কর্মপরিবেশে নিজেকে খাপ খাইয়ে নিতে এটি সহায়ক।',
      'বিদেশের বিশ্ববিদ্যালয়গুলো আধুনিক ল্যাবরেটরি, লাইব্রেরি এবং উন্নত প্রযুক্তি ব্যবহারের সুযোগ দেয়, যা উচ্চমানের গবেষণার জন্য অপরিহার্য।',
      'সম্পূর্ণ ভিন্ন একটি পরিবেশে বসবাসের মাধ্যমে আপনার মধ্যে স্বনির্ভরতা গড়ে ওঠে। ভিন্ন ভিন্ন সংস্কৃতির মানুষের সাথে মেলামেশার ফলে আপনার দৃষ্টিভঙ্গি প্রসারিত হয়।',
      'বিশ্বের বিভিন্ন প্রান্তের মেধাবী শিক্ষার্থীদের সাথে কাজ করার ফলে একটি শক্তিশালী প্রফেশনাল নেটওয়ার্ক তৈরি হয়, যা সারাজীবন কাজে লাগে।',
      'প্রায় সকল দেশেই পড়াশোনা শেষে কাজের অনুমতির (Work Permit) পাশাপাশি স্থায়ীভাবে বসবাসের সুযোগ থাকে, যা আপনার ভবিষ্যৎ জীবনকে আর্থিকভাবে সচ্ছল ও নিরাপদ করে।',
    ],
    status: WebinarStatus.PUBLISHED,
  },
  {
    id: 'research-paper-writing-and-publication-techniques',
    title: 'Webinar on Research Paper Writing & Publication Techniques',
    category: CourseCategory.PROGRAMMING,
    description:
      'Research paper লেখা ও publish করা higher studies, scholarship এবং academic বা research career-এর জন্য একটি অত্যন্ত গুরুত্বপূর্ণ যোগ্যতা। এই ওয়েবিনারে আপনি শিখবেন - research paper কীভাবে শুরু থেকে লিখবেন, কোন Journal বা Conference আপনার research-এর জন্য উপযুক্ত, এবং কীভাবে rejection এড়িয়ে publication-এর সম্ভাবনা বাড়ানো যায়',
    image: '/upcoming-webinar/research-pager.jpeg',
    videoUrl: 'https://zoom.us/j/placeholder',
    time: '10:15 PM - 11:15 PM',
    instructor: 'Md Nafee Al Islam, PhD',
    instructorBio:
      'Research Expert & Academic Mentor specializing in Research Paper Writing & Publication | Experienced in guiding students through the research publication process',
    instructorImage: '/instructors/Nafee.jpg',
    isUpcoming: true,
    date: new Date('2026-03-12T22:15:00Z'),
    duration: 60,
    sectionOneTitle: 'এই ওয়েবিনারে যা যা শিখবেন',
    sectionOnePoints: [
      'Research idea ও topic selection - কীভাবে একটি publishable research question তৈরি করবেন',
      'Research paper-এর structure - Title, Abstract, Introduction, Methodology, Results, Discussion ও Conclusion কীভাবে লিখবেন',
      'Proper literature review ও reference management (Google Scholar, PubMed, Scopus, Zotero, Mendeley)',
      'Journal selection strategy - indexed journal (Scopus, Web of Science), impact factor, Q1–Q4 journal বোঝা',
      'Manuscript submission process - cover letter লেখা, reviewer comments handle করা এবং revision strategy',
    ],
    sectionTwoTitle: 'কেন Research Paper Writing & Publication গুরুত্বপূর্ণ?',
    sectionTwoPoints: [
      'Higher studies (Master’s/PhD) ও scholarship application-এ research publication আপনার profile শক্তিশালী করে',
      'Academic ও research career-এ promotion, funding এবং collaboration-এর সুযোগ বাড়ায়',
      'International research community-তে আপনার visibility ও credibility তৈরি হয়',
      'Critical thinking, scientific writing ও data analysis skill উন্নত হয়',
      'Future supervisor ও professor-দের কাছে আপনার research potential প্রমাণ করা সহজ হয়',
    ],
    status: WebinarStatus.PUBLISHED,
  },
  {
    id: 'higher-studies-abroad-with-scholarship-for-clinical-and-translational-health-science-background',
    title:
      'Webinar on Higher Studies Abroad with Scholarship for Clinical & Translational Health Science Background',
    category: CourseCategory.PROGRAMMING,
    description:
      'Clinical & Translational Health Science background থেকে বিদেশে উচ্চশিক্ষা ও scholarship পেতে সঠিক দিকনির্দেশনা অত্যন্ত গুরুত্বপূর্ণ। এই ওয়েবিনারে আপনি জানতে পারবেন কীভাবে Clinical অথবা Translational Health Science background থেকে বিশ্বের নামী দামী বিশ্ববিদ্যালয়গুলোতে scholarship-সহ higher studies-এর সুযোগ তৈরি করা যায়',
    image: '/upcoming-webinar/clinical-translational.png',
    videoUrl: 'https://zoom.us/j/placeholder',
    time: '9:00 PM - 11:00 PM',
    instructor: 'Md Saiful Islam',
    instructorBio:
      'Clinical & Health Science Expert | Specialist in guiding students through higher studies and scholarship opportunities for Clinical & Translational Health Science backgrounds',
    instructorImage: '/instructors/saiful.jpeg',
    isUpcoming: true,
    date: new Date('2026-01-16T21:00:00Z'),
    duration: 120,
    sectionOneTitle: 'এই ওয়েবিনারে যা যা শিখবেন',
    sectionOnePoints: [
      'Clinical & Translational Health Science background-এর শিক্ষার্থীদের জন্য কোন দেশ সবচেয়ে উপযোগী',
      'Academic profile কতটা শক্তিশালী হওয়া প্রয়োজন - CGPA, clinical experience, internship, research ও publication-এর গুরুত্ব এবং IELTS preparation strategy',
      'Fully-funded বা scholarship, Research Assistantship (RA), Teaching Assistantship (TA) এবং Fellowship পাওয়ার কার্যকর কৌশল',
      'Health Science background-এর জন্য একটি শক্তিশালী SOP, LOR এবং Academic CV কীভাবে তৈরি করবেন',
      'সঠিক professor নির্বাচন, professional email writing strategy এবং interview preparation techniques',
      'বিদেশে অধ্যয়নরত Health Science students ও alumni-দের সাথে যোগাযোগের গুরুত্ব এবং কেন এই network আপনার career-এ গুরুত্বপূর্ণ ভূমিকা রাখে',
    ],
    sectionTwoTitle:
      'কেন Clinical & Translational Health Science Background থেকে Abroad-এ Higher Studies করবেন?',
    sectionTwoPoints: [
      'বিদেশের degree আপনাকে আন্তর্জাতিক health organization, research institute, pharmaceutical ও biotech company-তে কাজ করার সুযোগ করে দেয়',
      'Advanced laboratory, clinical trial facilities এবং cutting-edge research technology ব্যবহারের মাধ্যমে আপনি বাস্তবমুখী research experience অর্জন করতে পারবেন',
      'Multidisciplinary ও multicultural environment-এ কাজ করার ফলে আপনার problem-solving skills ও professional confidence বৃদ্ধি পায়',
      'বিশ্বের বিভিন্ন দেশের health professionals ও researchers-দের সাথে কাজ করে একটি শক্তিশালী global network তৈরি হয়',
      'অধিকাংশ দেশেই পড়াশোনা শেষে work permit ও permanent residency-র সুযোগ থাকে, যা আপনাকে একটি নিরাপদ ও সমৃদ্ধ ভবিষ্যৎ গড়ে তুলতে সহায়তা করে',
    ],
    status: WebinarStatus.PUBLISHED,
  },
  {
    id: 'from-code-to-intelligence-ai-engineering-career',
    title:
      'Webinar on From Code to Intelligence: Building a Career in AI Engineering',
    category: CourseCategory.PROGRAMMING,
    description:
      'Artificial Intelligence এখন শুধু একটি buzzword নয়, এটি software engineering, data science ও product development-এর ভবিষ্যৎ নির্ধারণ করছে। কিন্তু অনেকেই জানেন না, AI Engineering আসলে কী, কোথা থেকে শুরু করতে হবে, এবং কীভাবে একটি structured roadmap অনুসরণ করে expert AI engineer হওয়া যায়',
    image: '/upcoming-webinar/ai-code.jpeg',
    videoUrl: 'https://zoom.us/j/placeholder',
    time: '3:00 PM - 4:00 PM',
    instructor: 'Arif Mahmud Sisir',
    instructorBio:
      'AI Engineering Expert & Technical Mentor | Specialist in Machine Learning, Deep Learning & AI Career Development | Helping aspiring engineers build successful careers in Artificial Intelligence',
    instructorImage: '/instructors/shishir.png',
    isUpcoming: true,
    date: new Date('2026-03-06T15:00:00Z'),
    duration: 60,
    sectionOneTitle: 'এই ওয়েবিনারে যা যা শিখবেন',
    sectionOnePoints: [
      'AI Engineering কী এবং এটি Data Science, Machine Learning ও Software Engineering থেকে কীভাবে আলাদা',
      'AI Engineer হতে প্রয়োজনীয় core skills যেমন Python, Data Structures, Algorithms,  ও Mathmatics',
      'Machine Learning ও Deep Learning fundamentals—Supervised/Unsupervised Learning, Neural Networks ও Model Evaluation',
      'Industry-relevant tools ও frameworks—TensorFlow, PyTorch, Scikit-learn, SQL, Git ও Cloud platforms',
      'Real-world AI systems design—data pipeline, model training, deployment ও monitoring (MLOps overview)',
      'AI project portfolio কীভাবে তৈরি করবেন—GitHub, Kaggle, real-world use cases ও capstone projects',
      'Career roadmap, entry-level থেকে mid/senior AI Engineer পর্যন্ত growth path, job roles ও salary insight',
    ],
    sectionTwoTitle: 'Why Build a Career in AI Engineering?',
    sectionTwoPoints: [
      'AI Engineers বিশ্বের সবচেয়ে high-demand ও high-paying tech professionals-দের মধ্যে অন্যতম',
      'Global tech companies, startups, research labs ও product-based organizations-এ কাজ করার সুযোগ',
      'Real-world problem solving ও intelligent system building-এর মাধ্যমে high-impact work করার সুযোগ',
      'Remote job, international collaboration ও long-term career growth-এর বিশাল সম্ভাবনা',
      'Continuous innovation ও learning-driven career path, যা future-proof',
    ],
    status: WebinarStatus.PUBLISHED,
  },
];

async function main() {
  try {
    for (const w of seedWebinars) {
      const slug = slugify(w.title);
      await prisma.webinar.upsert({
        where: { id: w.id },
        update: {
          title: w.title,
          slug,
          description: w.description,
          image: w.image,
          videoUrl: w.videoUrl,
          time: w.time,
          instructor: w.instructor,
          instructorBio: w.instructorBio,
          instructorImage: w.instructorImage,
          category: w.category,
          isUpcoming: w.isUpcoming,
          date: w.date,
          duration: w.duration,
          sectionOneTitle: w.sectionOneTitle,
          sectionOnePoints: w.sectionOnePoints,
          sectionTwoTitle: w.sectionTwoTitle,
          sectionTwoPoints: w.sectionTwoPoints,
          status: w.status,
        },
        create: {
          id: w.id,
          title: w.title,
          slug,
          description: w.description,
          image: w.image,
          videoUrl: w.videoUrl,
          time: w.time,
          instructor: w.instructor,
          instructorBio: w.instructorBio,
          instructorImage: w.instructorImage,
          category: w.category,
          isUpcoming: w.isUpcoming,
          date: w.date,
          duration: w.duration,
          sectionOneTitle: w.sectionOneTitle,
          sectionOnePoints: w.sectionOnePoints,
          sectionTwoTitle: w.sectionTwoTitle,
          sectionTwoPoints: w.sectionTwoPoints,
          status: w.status,
        },
      });
      console.log(`Upserted webinar: ${w.id}`);
    }
    console.log('All webinars seeded/upserted successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ensure the returned promise is handled according to lint rules
void main().catch((err) => {
  console.error('Unhandled seeding error:', err);
  process.exit(1);
});
