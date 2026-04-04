import {
  PrismaClient,
  CourseStatus,
  LessonType,
  InstructorStatus,
  UserRole,
  AuthProvider,
  CoursePublicSectionType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

// ─── Instructor seed data ───────────────────────────────────────────

const seedInstructors = [
  {
    name: 'Dr. Nafee Al Islam',
    bio: 'PhD in Computer Science with specialization in Machine Learning and Artificial Intelligence. Over 8 years of experience in research and teaching. Published 20+ papers in top-tier journals and conferences.',
    image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=face',
  },
  {
    name: 'Kazi Mejbaul Islam',
    bio: 'PhD candidate in ECE at University of Florida. Research Scholar at SRC Research Scholars Program. Expert in clinical research methodology, biostatistics, and translational health sciences.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  },
  {
    name: 'Arif Mahmud Sisir',
    bio: 'Senior VLSI Design Engineer with 10+ years in semiconductor industry. Expert in physical design, synthesis, and timing closure. Also experienced in full-stack web development with React and Node.js.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
  },
];

// ─── Course seed data ───────────────────────────────────────────────

interface SeedCourse {
  title: string;
  description: string;
  bannerImage: string;
  price: number;
  discountPrice: number;
  duration: number;
  startDate: Date;
  classDays: string;
  classTime: string;
  totalModules: number;
  totalProjects: number;
  totalLive: number;
  bkashNumber: string;
  nagadNumber: string;
  instructorIndices: number[]; // indices into seedInstructors
  modules: {
    title: string;
    lessons: { title: string; type: LessonType }[];
  }[];
  faqs: { question: string; answer: string }[];
  publicSections: {
    type: CoursePublicSectionType;
    title: string;
    subtitle?: string;
    order: number;
    content: unknown[];
  }[];
}

const seedCourses: SeedCourse[] = [
  // ── Course 1: Machine Learning ──────────────────────────────────
  {
    title: 'Complete Research Pathway with Machine Learning',
    description:
      'A comprehensive program designed to take you from Python fundamentals to advanced machine learning research. Learn data preprocessing, statistical analysis, supervised and unsupervised learning, deep learning with TensorFlow and PyTorch, and how to write and publish research papers. Ideal for aspiring ML researchers and data scientists.',
    bannerImage: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=450&fit=crop',
    price: 8000,
    discountPrice: 5999,
    duration: 90,
    startDate: new Date('2026-06-01T10:00:00Z'),
    classDays: 'Sat, Sun',
    classTime: '10:00 AM - 12:00 PM',
    totalModules: 4,
    totalProjects: 5,
    totalLive: 12,
    bkashNumber: '01704258972',
    nagadNumber: '01704258972',
    instructorIndices: [0],
    modules: [
      {
        title: 'Python & Math Foundations',
        lessons: [
          { title: 'Python for Data Science', type: LessonType.VIDEO },
          { title: 'Linear Algebra Essentials', type: LessonType.VIDEO },
          { title: 'Python Foundations Quiz', type: LessonType.QUIZ },
        ],
      },
      {
        title: 'Data Preprocessing & Visualization',
        lessons: [
          { title: 'Pandas & NumPy Deep Dive', type: LessonType.VIDEO },
          {
            title: 'Data Visualization with Matplotlib & Seaborn',
            type: LessonType.VIDEO,
          },
          {
            title: 'EDA Assignment: Real-World Dataset',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
      {
        title: 'Machine Learning Algorithms',
        lessons: [
          {
            title: 'Supervised Learning: Regression & Classification',
            type: LessonType.VIDEO,
          },
          {
            title: 'Unsupervised Learning: Clustering & Dimensionality Reduction',
            type: LessonType.VIDEO,
          },
          { title: 'ML Algorithms Quiz', type: LessonType.QUIZ },
          {
            title: 'Build a Predictive Model',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
      {
        title: 'Deep Learning & Research Paper Writing',
        lessons: [
          {
            title: 'Neural Networks & Deep Learning with PyTorch',
            type: LessonType.VIDEO,
          },
          {
            title: 'Research Paper Structure & Writing',
            type: LessonType.VIDEO,
          },
          {
            title: 'Final Project: End-to-End ML Research',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
    ],
    faqs: [
      {
        question: 'Do I need prior programming experience?',
        answer:
          'Basic familiarity with any programming language helps, but we start from Python fundamentals. Complete beginners can follow along with extra practice.',
      },
      {
        question: 'Will I get a certificate?',
        answer:
          'Yes. Upon completing all modules, quizzes, and the final project you will receive a verified certificate of completion.',
      },
      {
        question: 'What is the refund policy?',
        answer:
          'We offer a full refund within 7 days of enrollment if you have not completed more than 20% of the course content.',
      },
    ],
    publicSections: [
      {
        type: CoursePublicSectionType.FEATURES,
        title: 'What You Will Get',
        order: 0,
        content: [
          { icon: 'video', text: '40+ hours of HD video content' },
          { icon: 'project', text: '5 hands-on real-world projects' },
          { icon: 'live', text: '12 live Q&A sessions' },
          { icon: 'certificate', text: 'Verified certificate of completion' },
          { icon: 'support', text: 'Lifetime access & community support' },
        ],
      },
      {
        type: CoursePublicSectionType.TARGET_AUDIENCE,
        title: 'Who Is This Course For?',
        order: 1,
        content: [
          { text: 'Aspiring ML researchers and data scientists' },
          { text: 'CS students wanting to publish research papers' },
          { text: 'Working professionals transitioning into AI/ML' },
          { text: 'Anyone preparing for graduate studies in ML' },
        ],
      },
      {
        type: CoursePublicSectionType.PREREQUISITES,
        title: 'Prerequisites',
        order: 2,
        content: [
          { text: 'Basic understanding of mathematics (high school level)' },
          { text: 'A computer with internet access' },
          { text: 'Willingness to practice coding daily' },
        ],
      },
    ],
  },

  // ── Course 2: Clinical Research ─────────────────────────────────
  {
    title: 'Clinical Research Expert Program',
    description:
      'Master the fundamentals and advanced concepts of clinical research. This program covers research design, Good Clinical Practice (GCP), biostatistics, regulatory affairs, clinical trial management, and data analysis. Perfect for healthcare professionals and life science graduates looking to build a career in clinical research.',
    bannerImage: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=450&fit=crop',
    price: 6000,
    discountPrice: 4499,
    duration: 60,
    startDate: new Date('2026-05-15T09:00:00Z'),
    classDays: 'Fri, Sat',
    classTime: '9:00 PM - 11:00 PM',
    totalModules: 3,
    totalProjects: 3,
    totalLive: 8,
    bkashNumber: '01704258972',
    nagadNumber: '01704258972',
    instructorIndices: [1],
    modules: [
      {
        title: 'Foundations of Clinical Research',
        lessons: [
          {
            title: 'Introduction to Clinical Research & Trial Phases',
            type: LessonType.VIDEO,
          },
          {
            title: 'Good Clinical Practice (GCP) Guidelines',
            type: LessonType.VIDEO,
          },
          {
            title: 'GCP Knowledge Check',
            type: LessonType.QUIZ,
          },
        ],
      },
      {
        title: 'Research Design & Biostatistics',
        lessons: [
          {
            title: 'Study Design: RCTs, Cohort, and Case-Control',
            type: LessonType.VIDEO,
          },
          {
            title: 'Biostatistics for Clinical Research',
            type: LessonType.VIDEO,
          },
          {
            title: 'Design a Clinical Study Protocol',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
      {
        title: 'Regulatory Affairs & Data Management',
        lessons: [
          {
            title: 'FDA & EMA Regulatory Framework',
            type: LessonType.VIDEO,
          },
          {
            title: 'Clinical Data Management & EDC Systems',
            type: LessonType.VIDEO,
          },
          {
            title: 'Regulatory Affairs Quiz',
            type: LessonType.QUIZ,
          },
          {
            title: 'Final Project: Complete Trial Documentation',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
    ],
    faqs: [
      {
        question: 'Is this course suitable for pharmacy graduates?',
        answer:
          'Absolutely. This course is designed for pharmacy, medical, nursing, and other life science graduates who want to enter the clinical research field.',
      },
      {
        question: 'Will this help me get a job in clinical research?',
        answer:
          'Yes. The course covers industry-relevant skills and includes portfolio projects that demonstrate your capabilities to potential employers.',
      },
      {
        question: 'Are the live classes recorded?',
        answer:
          'Yes, all live sessions are recorded and available in your dashboard within 24 hours for unlimited replay.',
      },
    ],
    publicSections: [
      {
        type: CoursePublicSectionType.FEATURES,
        title: 'Program Highlights',
        order: 0,
        content: [
          { icon: 'video', text: '30+ hours of expert-led training' },
          { icon: 'project', text: '3 industry-standard projects' },
          { icon: 'live', text: '8 interactive live sessions' },
          { icon: 'certificate', text: 'Professional certificate' },
          { icon: 'mentor', text: 'One-on-one mentorship sessions' },
        ],
      },
      {
        type: CoursePublicSectionType.TARGET_AUDIENCE,
        title: 'Who Should Enroll?',
        order: 1,
        content: [
          { text: 'Pharmacy and medical graduates' },
          { text: 'Healthcare professionals seeking career change' },
          { text: 'Life science researchers' },
          { text: 'CRO professionals wanting to upskill' },
        ],
      },
    ],
  },

  // ── Course 3: VLSI Physical Design ──────────────────────────────
  {
    title: 'VLSI Physical Design Training',
    description:
      'Learn the complete VLSI physical design flow from RTL to GDSII. This intensive course covers synthesis, floorplanning, placement, clock tree synthesis (CTS), routing, and signoff. Gain hands-on experience with industry-standard EDA tools and understand how to translate logic into high-performance, manufacturable silicon.',
    bannerImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&fit=crop',
    price: 10000,
    discountPrice: 7999,
    duration: 120,
    startDate: new Date('2026-07-01T10:00:00Z'),
    classDays: 'Sat, Sun, Tue',
    classTime: '8:00 PM - 10:00 PM',
    totalModules: 4,
    totalProjects: 4,
    totalLive: 16,
    bkashNumber: '01704258972',
    nagadNumber: '01704258972',
    instructorIndices: [2],
    modules: [
      {
        title: 'Digital Design Fundamentals & RTL',
        lessons: [
          {
            title: 'Digital Logic & Verilog Basics',
            type: LessonType.VIDEO,
          },
          {
            title: 'RTL Design & Simulation',
            type: LessonType.VIDEO,
          },
          {
            title: 'RTL Coding Assignment',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
      {
        title: 'Logic Synthesis & Floorplanning',
        lessons: [
          {
            title: 'Logic Synthesis with Design Compiler',
            type: LessonType.VIDEO,
          },
          {
            title: 'Floorplanning & Power Planning',
            type: LessonType.VIDEO,
          },
          {
            title: 'Synthesis Quiz',
            type: LessonType.QUIZ,
          },
        ],
      },
      {
        title: 'Placement, CTS & Routing',
        lessons: [
          {
            title: 'Standard Cell Placement Strategies',
            type: LessonType.VIDEO,
          },
          {
            title: 'Clock Tree Synthesis (CTS)',
            type: LessonType.VIDEO,
          },
          {
            title: 'Detailed Routing & DRC Fixing',
            type: LessonType.VIDEO,
          },
          {
            title: 'PnR Lab Assignment',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
      {
        title: 'Timing Closure & Signoff',
        lessons: [
          {
            title: 'Static Timing Analysis (STA)',
            type: LessonType.VIDEO,
          },
          {
            title: 'Physical Verification: DRC & LVS',
            type: LessonType.VIDEO,
          },
          {
            title: 'STA & Signoff Quiz',
            type: LessonType.QUIZ,
          },
          {
            title: 'Final Project: Complete RTL-to-GDSII Flow',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
    ],
    faqs: [
      {
        question: 'Do I need access to EDA tools?',
        answer:
          'We provide access to open-source EDA tools (OpenROAD, Yosys) for all lab assignments. Familiarity with commercial tools like Cadence/Synopsys is a plus but not required.',
      },
      {
        question: 'What background do I need?',
        answer:
          'A basic understanding of digital logic design and any HDL (Verilog/VHDL) is recommended. ECE/EEE graduates are ideal candidates.',
      },
      {
        question: 'Is this course enough to get a job in VLSI?',
        answer:
          'This course covers the complete PD flow that companies expect from entry-level engineers. Combined with the projects, it gives you a strong portfolio for interviews.',
      },
    ],
    publicSections: [
      {
        type: CoursePublicSectionType.FEATURES,
        title: 'Course Features',
        order: 0,
        content: [
          { icon: 'video', text: '60+ hours of in-depth content' },
          { icon: 'project', text: '4 industry-level design projects' },
          { icon: 'live', text: '16 live lab sessions' },
          { icon: 'tool', text: 'Hands-on with real EDA tools' },
          { icon: 'certificate', text: 'Industry-recognized certificate' },
        ],
      },
      {
        type: CoursePublicSectionType.PREREQUISITES,
        title: 'Prerequisites',
        order: 1,
        content: [
          { text: 'Basic digital logic design knowledge' },
          { text: 'Familiarity with Verilog or VHDL' },
          { text: 'Linux command-line basics' },
        ],
      },
    ],
  },

  // ── Course 4: Full-Stack Web Development ───��────────────────────
  {
    title: 'Full-Stack Web Development Bootcamp',
    description:
      'Build production-ready web applications from scratch. This bootcamp covers HTML, CSS, JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, Prisma ORM, REST APIs, authentication, deployment, and DevOps basics. Work on real projects and graduate with a portfolio that impresses employers.',
    bannerImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=450&fit=crop',
    price: 5000,
    discountPrice: 3499,
    duration: 75,
    startDate: new Date('2026-05-20T10:00:00Z'),
    classDays: 'Mon, Wed, Fri',
    classTime: '7:00 PM - 9:00 PM',
    totalModules: 3,
    totalProjects: 6,
    totalLive: 10,
    bkashNumber: '01704258972',
    nagadNumber: '01704258972',
    instructorIndices: [2, 0],
    modules: [
      {
        title: 'Frontend: HTML, CSS, JavaScript & React',
        lessons: [
          {
            title: 'HTML5 & CSS3 Fundamentals',
            type: LessonType.VIDEO,
          },
          {
            title: 'JavaScript ES6+ & TypeScript',
            type: LessonType.VIDEO,
          },
          {
            title: 'React Fundamentals & Hooks',
            type: LessonType.VIDEO,
          },
          {
            title: 'Build a React Portfolio Site',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
      {
        title: 'Backend: Node.js, Express & Database',
        lessons: [
          {
            title: 'Node.js & Express REST API',
            type: LessonType.VIDEO,
          },
          {
            title: 'PostgreSQL & Prisma ORM',
            type: LessonType.VIDEO,
          },
          {
            title: 'Authentication with JWT',
            type: LessonType.VIDEO,
          },
          {
            title: 'Backend Quiz: REST & Auth',
            type: LessonType.QUIZ,
          },
          {
            title: 'Build a Full REST API',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
      {
        title: 'Deployment & DevOps Essentials',
        lessons: [
          {
            title: 'Git, GitHub & CI/CD Basics',
            type: LessonType.VIDEO,
          },
          {
            title: 'Docker & Cloud Deployment',
            type: LessonType.VIDEO,
          },
          {
            title: 'DevOps Quiz',
            type: LessonType.QUIZ,
          },
          {
            title: 'Final Project: Deploy a Full-Stack App',
            type: LessonType.ASSIGNMENT,
          },
        ],
      },
    ],
    faqs: [
      {
        question: 'Is this course for complete beginners?',
        answer:
          'Yes! We start from the very basics of HTML and CSS. No prior programming experience is required.',
      },
      {
        question: 'What tools do I need?',
        answer:
          'A computer with at least 8GB RAM, VS Code (free), Node.js (free), and a stable internet connection. All other tools used in the course are free.',
      },
      {
        question: 'Can I get job support after completing the course?',
        answer:
          'We provide resume review, mock interview sessions, and access to our job referral network for all graduates.',
      },
    ],
    publicSections: [
      {
        type: CoursePublicSectionType.FEATURES,
        title: 'What Makes This Bootcamp Different',
        order: 0,
        content: [
          { icon: 'video', text: '50+ hours of project-based learning' },
          { icon: 'project', text: '6 portfolio-worthy projects' },
          { icon: 'live', text: '10 live coding sessions' },
          { icon: 'job', text: 'Job-ready skills & career support' },
          { icon: 'certificate', text: 'Completion certificate' },
        ],
      },
      {
        type: CoursePublicSectionType.TARGET_AUDIENCE,
        title: 'Perfect For',
        order: 1,
        content: [
          { text: 'Complete beginners wanting to learn web development' },
          { text: 'Students preparing for software engineering roles' },
          { text: 'Freelancers looking to build full-stack skills' },
          { text: 'Backend developers wanting to learn React' },
        ],
      },
      {
        type: CoursePublicSectionType.PREREQUISITES,
        title: 'What You Need',
        order: 2,
        content: [
          { text: 'No prior programming experience required' },
          { text: 'A computer with internet access' },
          { text: 'Dedication to practice 2-3 hours daily' },
        ],
      },
    ],
  },
];

// ─── Main seed function ─────────────────────────────────────────────

async function main() {
  try {
    // 1. Ensure a super admin exists (reuse from seed-webinars or create)
    const adminEmail = 'mehrab.munna00@gmail.com';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!admin) {
      const hashedPassword = await bcrypt.hash('mehrab2026@', 12);
      admin = await prisma.user.create({
        data: {
          name: 'Mehrab Munna',
          email: adminEmail,
          password: hashedPassword,
          role: UserRole.SUPER_ADMIN,
          provider: AuthProvider.EMAIL,
          isVerified: true,
          isActive: true,
        },
      });
      console.log(`Created super admin: ${adminEmail}`);
    } else {
      console.log(`Using existing super admin: ${adminEmail}`);
    }

    // 2. Create a test student
    const studentEmail = 'student@innodemy.com';
    const studentPassword = await bcrypt.hash('student2026@', 12);
    await prisma.user.upsert({
      where: { email: studentEmail },
      update: {
        name: 'Test Student',
        password: studentPassword,
        role: UserRole.STUDENT,
        isVerified: true,
        isActive: true,
      },
      create: {
        name: 'Test Student',
        email: studentEmail,
        password: studentPassword,
        role: UserRole.STUDENT,
        provider: AuthProvider.EMAIL,
        isVerified: true,
        isActive: true,
      },
    });
    console.log(`Upserted test student: ${studentEmail}`);

    // 3. Seed instructors
    const instructorIds: string[] = [];
    for (const instr of seedInstructors) {
      // Delete existing by name to avoid duplicates
      await prisma.instructor.deleteMany({ where: { name: instr.name } });
      const created = await prisma.instructor.create({
        data: {
          name: instr.name,
          bio: instr.bio,
          image: instr.image,
          status: InstructorStatus.ACTIVE,
        },
      });
      instructorIds.push(created.id);
      console.log(`Created instructor: ${instr.name}`);
    }

    // 4. Seed courses with full hierarchy
    for (const course of seedCourses) {
      const slug = slugify(course.title);

      // Delete existing course by slug (cascades to modules, lessons, etc.)
      await prisma.course.deleteMany({ where: { slug } });

      // Create the course
      const created = await prisma.course.create({
        data: {
          title: course.title,
          slug,
          description: course.description,
          bannerImage: course.bannerImage,
          price: course.price,
          discountPrice: course.discountPrice,
          duration: course.duration,
          startDate: course.startDate,
          classDays: course.classDays,
          classTime: course.classTime,
          totalModules: course.totalModules,
          totalProjects: course.totalProjects,
          totalLive: course.totalLive,
          bkashNumber: course.bkashNumber,
          nagadNumber: course.nagadNumber,
          status: CourseStatus.PUBLISHED,
          createdById: admin.id,
        },
      });
      console.log(`Created course: ${course.title} (${slug})`);

      // Link instructors
      for (const idx of course.instructorIndices) {
        await prisma.courseInstructor.create({
          data: {
            courseId: created.id,
            instructorId: instructorIds[idx],
          },
        });
      }
      console.log(
        `  Linked ${course.instructorIndices.length} instructor(s)`,
      );

      // Create modules and lessons
      for (let mi = 0; mi < course.modules.length; mi++) {
        const mod = course.modules[mi];
        const createdModule = await prisma.courseModule.create({
          data: {
            title: mod.title,
            order: mi,
            courseId: created.id,
          },
        });

        for (let li = 0; li < mod.lessons.length; li++) {
          const lesson = mod.lessons[li];
          await prisma.lesson.create({
            data: {
              title: lesson.title,
              order: li,
              type: lesson.type,
              moduleId: createdModule.id,
            },
          });
        }
        console.log(
          `  Module ${mi + 1}: "${mod.title}" with ${mod.lessons.length} lessons`,
        );
      }

      // Create FAQs
      for (const faq of course.faqs) {
        await prisma.fAQ.create({
          data: {
            question: faq.question,
            answer: faq.answer,
            courseId: created.id,
          },
        });
      }
      console.log(`  Added ${course.faqs.length} FAQs`);

      // Create public sections
      for (const section of course.publicSections) {
        await prisma.coursePublicSection.create({
          data: {
            courseId: created.id,
            type: section.type,
            title: section.title,
            subtitle: section.subtitle,
            order: section.order,
            content: section.content as any,
            isVisible: true,
          },
        });
      }
      console.log(`  Added ${course.publicSections.length} public sections`);
    }

    console.log('\n✅ All courses seeded successfully!');
    console.log('\nTest accounts:');
    console.log('  Super Admin: mehrab.munna00@gmail.com / mehrab2026@');
    console.log('  Student:     student@innodemy.com / student2026@');
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
