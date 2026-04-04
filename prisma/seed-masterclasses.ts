import { PrismaClient, WebinarStatus } from '@prisma/client';

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

// Helper: date N days from now
const futureDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(21, 0, 0, 0); // 9 PM
  return d;
};

const pastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(21, 0, 0, 0);
  return d;
};

interface SeedWebinar {
  title: string;
  description: string;
  image: string;
  videoUrl: string | null;
  time: string;
  instructor: string;
  instructorBio: string;
  instructorImage: string;
  date: Date;
  duration: number;
  isUpcoming: boolean;
  sectionOneTitle: string;
  sectionOnePoints: string[];
  sectionTwoTitle: string;
  sectionTwoPoints: string[];
}

const seedWebinars: SeedWebinar[] = [
  // ── UPCOMING masterclasses (future dates) ──────────────────────
  {
    title: 'Higher Studies Abroad with Scholarship',
    description:
      'Learn the secrets to securing scholarships at top universities worldwide. This masterclass covers profile building, SOP writing, professor emailing strategy, and application timelines for USA, Canada, UK, Australia, and more.',
    image:
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=450&fit=crop',
    videoUrl: null,
    time: '9:00 PM - 11:00 PM',
    instructor: 'Kazi Mejbaul Islam',
    instructorBio:
      'PhD candidate in ECE at University of Florida. Research Scholar, SRC Program.',
    instructorImage:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    date: futureDate(10),
    duration: 120,
    isUpcoming: true,
    sectionOneTitle: 'What You Will Learn',
    sectionOnePoints: [
      'Best countries and universities for your background',
      'IELTS, TOEFL, GRE preparation strategy',
      'Full-fund vs partial scholarship strategies',
      'How to write a powerful SOP and CV',
      'Professor emailing and interview techniques',
    ],
    sectionTwoTitle: 'Why Study Abroad?',
    sectionTwoPoints: [
      'Global career opportunities at top companies',
      'Access to cutting-edge research facilities',
      'Build an international professional network',
      'Work permit and immigration pathways',
    ],
  },
  {
    title: 'Research Paper Writing & Publication Techniques',
    description:
      'Master the complete research paper lifecycle — from choosing a topic, structuring your manuscript, selecting the right journal, to handling reviews and getting published in indexed journals.',
    image:
      'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800&h=450&fit=crop',
    videoUrl: null,
    time: '10:00 PM - 11:30 PM',
    instructor: 'Dr. Nafee Al Islam',
    instructorBio:
      'PhD in Computer Science, published 20+ papers in top-tier AI/ML journals.',
    instructorImage:
      'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=face',
    date: futureDate(18),
    duration: 90,
    isUpcoming: true,
    sectionOneTitle: 'What You Will Learn',
    sectionOnePoints: [
      'How to select a publishable research topic',
      'Paper structure: Abstract, Introduction, Methodology, Results',
      'Literature review and reference management tools',
      'Journal selection: Scopus, Web of Science, Q1-Q4 ranking',
      'Manuscript submission and handling reviewer comments',
    ],
    sectionTwoTitle: 'Why Research Publication Matters',
    sectionTwoPoints: [
      'Strengthens your profile for higher studies and scholarships',
      'Essential for academic and research careers',
      'Builds international visibility and credibility',
      'Develops critical thinking and scientific writing skills',
    ],
  },
  {
    title: 'From Code to Intelligence: Building a Career in AI Engineering',
    description:
      'Understand what AI Engineering really is, the roadmap to becoming an AI Engineer, essential skills, tools, and how to build a portfolio that lands you a job in the AI industry.',
    image:
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop',
    videoUrl: null,
    time: '3:00 PM - 4:30 PM',
    instructor: 'Arif Mahmud Sisir',
    instructorBio:
      'Senior AI Engineer with expertise in ML systems, MLOps, and full-stack development.',
    instructorImage:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    date: futureDate(25),
    duration: 90,
    isUpcoming: true,
    sectionOneTitle: 'What You Will Learn',
    sectionOnePoints: [
      'AI Engineering vs Data Science vs ML Engineering',
      'Core skills: Python, Math, ML fundamentals',
      'Tools: TensorFlow, PyTorch, Scikit-learn, Git, Cloud',
      'Building an AI project portfolio with GitHub and Kaggle',
      'Career path from entry-level to senior AI Engineer',
    ],
    sectionTwoTitle: 'Why AI Engineering?',
    sectionTwoPoints: [
      'One of the highest-paying tech careers globally',
      'Remote work and international opportunities',
      'Future-proof career with continuous innovation',
      'High-impact work solving real-world problems',
    ],
  },

  // ── PAST / FREE masterclasses (past dates, with video) ─────────
  {
    title: 'Introduction to Machine Learning with Python',
    description:
      'A beginner-friendly session covering ML fundamentals, supervised vs unsupervised learning, and building your first model with Scikit-learn. Perfect for anyone starting their ML journey.',
    image:
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=450&fit=crop',
    videoUrl:
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    time: '9:00 PM - 11:00 PM',
    instructor: 'Dr. Nafee Al Islam',
    instructorBio:
      'PhD in Computer Science, specializing in Machine Learning and AI.',
    instructorImage:
      'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=face',
    date: pastDate(30),
    duration: 120,
    isUpcoming: false,
    sectionOneTitle: 'Topics Covered',
    sectionOnePoints: [
      'What is Machine Learning and why it matters',
      'Supervised vs Unsupervised Learning',
      'Setting up Python environment for ML',
      'Building your first model with Scikit-learn',
      'Model evaluation and next steps',
    ],
    sectionTwoTitle: 'Who Was This For?',
    sectionTwoPoints: [
      'Complete beginners in programming or ML',
      'Students exploring data science careers',
      'Professionals wanting to add ML to their skillset',
    ],
  },
  {
    title: 'Clinical Research Fundamentals: GCP & Trial Design',
    description:
      'An introductory masterclass on clinical research covering Good Clinical Practice guidelines, trial phases, study design basics, and career pathways in the CRO industry.',
    image:
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=450&fit=crop',
    videoUrl:
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    time: '9:00 PM - 10:30 PM',
    instructor: 'Kazi Mejbaul Islam',
    instructorBio:
      'PhD candidate in ECE, expert in clinical research methodology.',
    instructorImage:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    date: pastDate(45),
    duration: 90,
    isUpcoming: false,
    sectionOneTitle: 'Topics Covered',
    sectionOnePoints: [
      'Introduction to clinical research and trial phases',
      'Good Clinical Practice (GCP) essentials',
      'Study design: RCT, cohort, case-control',
      'Career opportunities in CRO companies',
    ],
    sectionTwoTitle: 'Who Was This For?',
    sectionTwoPoints: [
      'Pharmacy and medical graduates',
      'Healthcare professionals exploring clinical research',
      'Life science students planning their career',
    ],
  },
  {
    title: 'Web Development Roadmap 2026: Frontend to Full-Stack',
    description:
      'A complete guide to becoming a web developer in 2026. Covers the technology landscape, learning roadmap, and practical tips for building your first full-stack project.',
    image:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=450&fit=crop',
    videoUrl:
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    time: '7:00 PM - 9:00 PM',
    instructor: 'Arif Mahmud Sisir',
    instructorBio:
      'Senior Engineer with 10+ years in full-stack and VLSI design.',
    instructorImage:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    date: pastDate(60),
    duration: 120,
    isUpcoming: false,
    sectionOneTitle: 'Topics Covered',
    sectionOnePoints: [
      'HTML, CSS, JavaScript landscape in 2026',
      'React vs Next.js vs other frameworks',
      'Backend: Node.js, Express, databases',
      'DevOps basics: Git, Docker, deployment',
      'Building your first full-stack portfolio project',
    ],
    sectionTwoTitle: 'Who Was This For?',
    sectionTwoPoints: [
      'Complete beginners wanting to learn web development',
      'Students deciding between frontend and backend',
      'Anyone planning to switch careers into tech',
    ],
  },
];

async function main() {
  try {
    // Delete all existing webinars to re-seed cleanly
    const deleted = await prisma.webinar.deleteMany({});
    console.log(`Deleted ${deleted.count} existing webinars`);

    for (const w of seedWebinars) {
      const slug = slugify(w.title);

      await prisma.webinar.create({
        data: {
          title: w.title,
          slug,
          description: w.description,
          image: w.image,
          videoUrl: w.videoUrl,
          time: w.time,
          instructor: w.instructor,
          instructorBio: w.instructorBio,
          instructorImage: w.instructorImage,
          date: w.date,
          duration: w.duration,
          isUpcoming: w.isUpcoming,
          sectionOneTitle: w.sectionOneTitle,
          sectionOnePoints: w.sectionOnePoints,
          sectionTwoTitle: w.sectionTwoTitle,
          sectionTwoPoints: w.sectionTwoPoints,
          status: WebinarStatus.PUBLISHED,
        },
      });
      console.log(
        `Created ${w.isUpcoming ? 'UPCOMING' : 'PAST'} masterclass: ${w.title}`,
      );
    }

    console.log(
      `\n✅ Seeded ${seedWebinars.length} masterclasses (${seedWebinars.filter((w) => w.isUpcoming).length} upcoming, ${seedWebinars.filter((w) => !w.isUpcoming).length} past/free)`,
    );
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error('Unhandled seeding error:', err);
  process.exit(1);
});
