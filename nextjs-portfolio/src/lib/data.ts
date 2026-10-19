

export const personalInfo = {
  name: "Shivam",
  title: "Full Stack Developer",
  email: "shivam.bgp@outlook.com",
  linkedin: "https://www.linkedin.com/in/shivam-28bbb92ab/",
  github: "https://github.com/shivam2931120",
  githubUsername: "shivam2931120",
  leetcode: "https://leetcode.com/u/Shivam2931120/",
  resume: "https://drive.google.com/file/d/1O6JwA4_Au20Tom0m0liYf4T1nzDqwGSE/view",
};


/* ================= SKILLS ================= */

export const skills = [
  { name: "Bash", icon: "/images/bash.svg" },
  { name: "Python", icon: "/images/python.png" },
  { name: "C++", icon: "/images/cpp.png" },
  { name: "Java", icon: "/images/java.png" },
  { name: "C", icon: "/images/c.png" },
  { name: "MySQL", icon: "/images/mysql.png" },
  { name: "MongoDB", icon: "/images/mongo.svg" },
  { name: "JavaScript", icon: "/images/js.png" },
  { name: "Node.js", icon: "/images/nodejs.png" },
  { name: "React", icon: "/images/react.png" },
  { name: "HTML", icon: "/images/html.png" },
  { name: "CSS", icon: "/images/css.png" },
  { name: "Flask", icon: "/images/flask.svg" },
  { name: "PostgreSQL", icon: "/images/postgresql.svg" },
  { name: "Clerk", icon: "/images/clerk.svg" },
  { name: "Next.js", icon: "/next.svg" },
];


/* ================= ABOUT ================= */

export const aboutParagraphs = [
  "With a strong foundation in multiple programming languages, including C, C++, Python, Java, Ruby, and JavaScript, I possess the versatility to tackle a wide range of software development challenges. My experience spans from low-level systems programming to high-level web applications, allowing me to choose the best tools for each project.",

  "As a skilled front-end developer proficient in HTML, CSS, and React, I excel at creating responsive and user-friendly interfaces. My passion for design and functionality ensures that I deliver visually appealing applications that enhance user experience while adhering to modern web standards.",
];


/* ================= CERTIFICATIONS ================= */

export const certifications = [
  { name: "Programming with JavaScript", image: "/images/jsc.png" },
  { name: "React Basics", image: "/images/reactc.png" },
  { name: "Node.js & MongoDB", image: "/images/node.png" },
  { name: "Data Science with Python", image: "/images/ds.png" },
  { name: "HTML", image: "/images/htmlc.png" },
  { name: "Python3", image: "/images/Python 3.jpeg" },
  { name: "JAVA", image: "/images/javac.png" },
  { name: "Python Advanced", image: "/images/Python Advanced.jpeg" },
  { name: "Computer Vision", image: "/images/Computer Vision.jpeg" },
  { name: "C Programming", image: "/images/C.jpg" },
  { name: "Flask Using Python", image: "/images/Flask Using Python.jpg" },
  { name: "Django", image: "/images/Django.jpg" },
];


/* ================= PROJECTS ================= */

export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  title: string;
  tag?: string;
  description: string;
  techStack: string[];
  link?: string;
  github?: string;
  links?: ProjectLink[];
};

export const projects: Project[] = [
  {
    title: "Cross-Market Disclosure Analysis",
    tag: "Major Project",
    description:
      "A pilot research dashboard comparing US and Indian corporate disclosures across matched companies. Next.js and FastAPI serve document comparisons, extracted sentiment and risks, financial snapshots, benchmark results, and retrieval-grounded chat using Supabase pgvector, Gemini embeddings, and Groq generation.",

    techStack: ["Next.js", "Python", "PostgreSQL", "React"],

    link: "https://major-project-new-plum.vercel.app",
    github: "https://github.com/Hrudai-Nirmal/MajorProject-new",
  },

  {
    title: "Hybrid CNN + Transformer Object Detection",
    tag: "Major Project",
    description:
      "A PyTorch computer-vision project comparing a ResNet18-based CNN detector with a CNN + Transformer model on KITTI-style data. Includes uncertainty-gated prediction refinement, checkpoint-based image inference, bounding-box visualization, and mAP@0.5 evaluation tools.",

    techStack: ["Python", "PyTorch"],

    github: "https://github.com/shivam2931120/MajorProject",
  },

  {
    title: "Nexus",
    description:
      "An organization-scoped team workspace built with a Next.js frontend and Spring Boot modular monolith. Connects chat, projects, tasks, collaborative documents, forms, calendars, and meetings through PostgreSQL persistence, token authentication, REST APIs, and STOMP/WebSocket updates.",

    techStack: ["Next.js", "React", "Java", "PostgreSQL"],

    link: "https://nexus-nine-drab-77.vercel.app",
    github: "https://github.com/shivam2931120/Nexus",
  },

  {
    title: "BB84 Quantum Messenger",
    tag: "Mini Project",
    description:
      "An educational realtime messaging prototype built with Flask, Socket.IO, and SQLAlchemy. Supports private and group chats, media sharing, read receipts, presence, and a simulated BB84/eavesdropping demonstration for exploring messaging and protocol behavior.",

    techStack: ["Python", "Flask", "JavaScript", "PostgreSQL"],

    link: "https://bb84-chat.justshivamm.in",
    github: "https://github.com/shivam2931120/bb8_messenger_app",
  },

  {
    title: "SecureVault",
    description:
      "A browser-encrypted vault for logins, secure notes, and API keys. Uses Web Crypto for PBKDF2-derived AES-GCM item encryption, with a configurable password generator, vault search and filtering, masked entries, and encrypted backup workflows.",

    techStack: ["Next.js", "React", "PostgreSQL"],

    link: "https://securevault.justshivamm.in",
    github: "https://github.com/shivam2931120/SecureVault",
  },
  {
    title: "TheMovie",
    description:
      "A movie and TV discovery app with TMDB metadata, optional OMDb enrichment, Clerk sign-in, and PostgreSQL-backed lists, watch diary, and episode tracking. Next.js ranks personalized recommendations using taste signals, fresh candidates, and model artifacts prepared by offline Python workflows.",

    techStack: ["Next.js", "React", "Clerk", "PostgreSQL"],

    link: "https://themovie.justshivamm.in",
    github: "https://github.com/shivam2931120/TheMovie",
  },

  {
    title: "Neo",
    description:
      "A Python desktop voice assistant using speech recognition, phrase-based command routing, and text-to-speech responses. Connects Windows system controls, application launching, web search, weather, QR generation, screen recording, and system monitoring.",

    techStack: ["Python"],

    github: "https://github.com/shivam2931120/Neo",
  },

  {
    title: "Shikshan - College Management System",
    description:
      "A Flask and Jinja college ERP with admin, teacher, and student portals. Includes account approval, role-based workflows, attendance analytics, timetables, fees, library records, exams, and homework through SQLAlchemy with PostgreSQL or local SQLite storage.",

    techStack: ["Python", "Flask", "PostgreSQL"],

    link: "https://shikshan.justshivamm.in",
    github: "https://github.com/shivam2931120/sms",
  },

  {
    title: "Attendify",
    description:
      "An Express attendance tracker with a browser JavaScript client and Clerk sign-in. Manages subjects, attendance history, timetables, calendar exclusions, and attendance analytics using account-scoped Clerk private metadata.",

    techStack: ["JavaScript", "Express", "Clerk", "CSS"],

    link: "https://attendify.justshivamm.in",
    github: "https://github.com/shivam2931120/attendify",
  },
  {
    title: "EventHub",
    description:
      "A Next.js event management and ticketing app with organizer dashboards, attendee registration, Razorpay payment signature verification, HMAC ticket-token generation, QR lookup, certificates, and check-in state updates through Prisma and PostgreSQL.",

    techStack: ["Next.js", "React", "PostgreSQL"],

    link: "https://eventhub.justshivamm.in",
    github: "https://github.com/shivam2931120/EventHub",
  },
  {
    title: "Editorial",
    description:
      "A collaborative document workspace built with React, Tiptap, Express, and Supabase Postgres. Uses Yjs and Socket.IO for shared editing, alongside folders, comments, version history, search, document exports, and optional NVIDIA-backed writing assistance.",

    techStack: ["React", "Node.js", "PostgreSQL"],

    link: "https://editorial.justshivamm.in",
    github: "https://github.com/shivam2931120/realtime_collab",
  },
  {
    title: "UNIX System Utility Toolkit",
    description:
      "A Linux desktop utility suite using a Bash launcher, Zenity dialogs, and compiled C helpers. Brings together process inspection and termination, network throughput monitoring, systemd service actions, a calculator, and CPU scheduling simulations with metrics and Gantt output.",

    techStack: ["Bash", "C", "Zenity"],

    links: [
      {
        label: "Release",
        href: "https://github.com/shivam2931120/unix_mini_project/releases/tag/v1.0.0",
      },
      {
        label: "Ubuntu package",
        href: "https://github.com/shivam2931120/unix_mini_project/releases/download/v1.0.0/unix-utility-suite_1.0.0_amd64.deb",
      },
      {
        label: "Snap package",
        href: "https://github.com/shivam2931120/unix_mini_project/releases/download/v1.0.0/unix-utility-suite_1.0.0_amd64.snap",
      },
      {
        label: "GNOME extension",
        href: "https://github.com/shivam2931120/unix_mini_project/releases/download/v1.0.0/unix-toolkit-launcher@shivam2931120.github.io.shell-extension.zip",
      },
      {
        label: "Flatpak",
        href: "https://github.com/shivam2931120/unix_mini_project/releases/download/v1.0.0/io.github.shivam2931120.UnixToolkitLauncher.flatpak",
      },
    ],
    github: "https://github.com/shivam2931120/unix_mini_project.git",
  },
];



export const techStackIcons: Record<string, string> = {
  Python: "/images/python.png",
  MongoDB: "/images/mongo.svg",
  HTML: "/images/html.png",
  CSS: "/images/css.png",
  JavaScript: "/images/js.png",
  React: "/images/react.png",
  "Node.js": "/images/nodejs.png",
  Flask: "/images/flask.svg",
  PostgreSQL: "/images/postgresql.svg",
  "Next.js": "/next.svg",
  Java: "/images/java.png",
  Clerk: "/images/clerk.svg",
  Bash: "/images/bash.svg",
  C: "/images/c.png",
  Zenity: "/images/zenity.png",
};
