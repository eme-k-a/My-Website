// The one content file (ARCHITECTURE §3). Every string is transcribed from docs/CONTENT_DRAFT.md
// (§2, §3.3, §3.4, §5 and §6); wording changes go through that file first. The phone number is
// never written here: `contact` is strict. Unknown facts in optional fields are omitted, never
// stored as text (CONTENT_DRAFT transcription rule 4); the report for WP-03 lists them.
// Derived values (exhibit numbers, durations, "ON VIEW NOW", "ONGOING", "expected") are computed by
// format.ts and selectors.ts, never stored.
import { SITE_URL } from './site';
import type { ResumeInput } from './types';

export const resume = {
  meta: {
    siteUrl: SITE_URL,
    title: 'Chukwuemeka (Emeka) Nduka-Nwagbo | Commit History',
    description:
      'Chukwuemeka (Emeka) Nduka-Nwagbo, Computer Engineering student at Memorial University of Newfoundland. Walk a 3D gallery of his work, newest first.',
    lang: 'en-CA',
  },
  contact: {
    name: 'Chukwuemeka Nduka-Nwagbo',
    preferredName: 'Emeka',
    email: 'cndukanwagbo@mun.ca',
    linkedin: 'https://linkedin.com/in/emekanduka',
    github: 'https://github.com/eme-k-a',
    location: "St. John's, NL",
    phoneInPublicPdf: false,
  },
  gallery: {
    title: 'Commit History',
    lobby: {
      eyebrow: 'A gallery of work by',
      headline: 'Welcome. Walk through my work.',
      intro: {
        text: "I'm Emeka, a Computer Engineering student at Memorial University of Newfoundland who builds software across mobile, web, and data. The first exhibit is my most recent work, and every step down the aisle takes you further into my past.",
        draft: true,
      },
      hint: 'Scroll, swipe, or use the arrow keys to walk. Open any exhibit to read its full story.',
    },
    desk: {
      headline: "You've reached the beginning.",
      body: {
        text: "Thanks for walking through. I'm finishing my B.Eng in Computer Engineering in May 2027 and I'm open to [placeholder: target roles]. If something here sparked an idea, I'd love to hear from you.",
        draft: true,
      },
      footnote: 'New exhibits are installed as the collection grows.',
    },
  },
  experiences: [
    {
      id: 'verafin',
      kind: 'work',
      role: 'Software Development Co-op Student',
      shortRole: 'Software Development Co-op',
      org: 'Nasdaq Verafin',
      employment: 'co-op',
      // On-site is assumed until Emeka confirms (CONTENT_DRAFT §7 item 1).
      location: { city: "St. John's", region: 'NL', mode: 'on-site' },
      dates: { start: '2026-09', end: '2026-12' },
      // From the first build after 2026-12, check-content fails until this is 'past' (§8).
      tense: 'present',
      // The three safe bullets: draft until Emeka (and ideally his manager) clears them at G0.
      bullets: [
        {
          text: 'Develop data platform features supporting fraud detection and anti-money laundering software.',
          print: true,
          priority: 1,
          draft: true,
        },
        {
          text: 'Build data reporting features that turn platform data into accurate, readable reports for end users.',
          print: true,
          priority: 2,
          draft: true,
        },
        {
          text: 'Develop data reporting plugins that extend reporting capabilities with modular, reusable components.',
          print: true,
          priority: 2,
          draft: true,
        },
      ],
      exhibit: {
        title: 'The Reporting Engine',
        caption:
          'Data platform, reporting, and plugin work on software that supports fraud detection and anti-money laundering.',
        story: [
          {
            type: 'p',
            text: 'This is where my story stands today. Since September 2026, I have been a Software Development Co-op Student at Nasdaq Verafin, working on software that supports fraud detection and anti-money laundering. My work sits on the data side of the product: data platform features, data reporting features that turn platform data into accurate, readable reports, and reporting plugins built from modular, reusable components.',
            draft: true,
          },
          {
            type: 'p',
            text: 'In a domain like this, data has to be accurate and clear before it can be useful, and that is the standard I hold my work to. This exhibit is still being installed, so check back after December.',
            draft: true,
          },
        ],
        object: {
          text: 'A frosted glass column feeds a six-by-six grid of bars that refreshes like a report. Three brass cartridges docked in the column are the plugins that extend it.',
          draft: true,
        },
        tags: ['Data Platforms', 'Data Reporting', 'Reporting Plugins'],
        // PLAN Addendum (R0 rulings after WP-00): Verafin starts as a draft exhibit, and so does any
        // exhibit whose copy goes beyond the resume (R0 ruling in the WP-03 brief).
        draft: true,
      },
    },
    {
      id: 'mysa',
      kind: 'work',
      role: 'Full Stack Software Developer (Co-op)',
      org: 'Mysa',
      employment: 'co-op',
      location: { city: "St. John's", region: 'NL' },
      dates: { start: '2026-01', end: '2026-05' },
      tense: 'past',
      bullets: [
        {
          text: 'Built end-to-end Detox CI/CD pipelines for iOS and Android, automating dev and production store releases to significantly reduce manual QA overhead.',
          print: true,
          priority: 1,
        },
        {
          text: 'Led the SSO integration with a major utility partner for demand response enrollment using Keycloak and OAuth 2.0, resolving token exchange bottlenecks for secure access across mobile and web.',
          print: true,
          priority: 1,
        },
        {
          // PLAN §1 trim 1: Cognito is not "database management"; CONTENT_DRAFT §3.5 A4 holds the
          // database variant until Emeka answers §7 item 12.
          text: 'Built and deployed a responsive web app using AWS Cognito for authentication, monitoring telemetry and logs to troubleshoot runtime failures for a stable production release.',
          print: true,
          priority: 2,
        },
        {
          text: 'Enhanced internal Customer Support Platform tooling by building smarter search classifications and integrating Pylon bug-report metadata to streamline issue routing and operator efficiency.',
          print: true,
          priority: 3,
        },
      ],
      exhibit: {
        title: 'Warm Start',
        caption:
          'End-to-end Detox release pipelines for iOS and Android, and a Single Sign-On integration with a major utility partner.',
        story: [
          {
            type: 'p',
            text: 'At Mysa, I was a Full Stack Software Developer co-op from January to May 2026. I built end-to-end Detox CI/CD pipelines for iOS and Android that automated dev and production store releases and reduced manual QA overhead. I led the Single Sign-On integration with a major utility partner for demand response enrollment, using Keycloak and OAuth 2.0 and resolving token exchange bottlenecks for secure access across mobile and web.',
            draft: true,
          },
          {
            type: 'p',
            text: 'I also built and deployed a responsive web app with AWS Cognito authentication, used telemetry and logs to troubleshoot runtime failures, and improved our internal support tooling with smarter search classifications and Pylon bug-report metadata.',
            draft: true,
          },
        ],
        object: {
          text: 'A ring dial on a wall unit lights four segments in turn (build, end-to-end tests, dev release, store release) as the release pipeline warms up. At its foot, a brass key passes through a ring: the single sign-on token exchange.',
          draft: true,
        },
        tags: ['Detox', 'CI/CD', 'Keycloak', 'OAuth 2.0', 'AWS Cognito', 'iOS', 'Android'],
      },
    },
    {
      id: 'wailo',
      kind: 'work',
      role: 'Front End Developer (Co-op)',
      org: 'Wailo',
      employment: 'co-op',
      location: { city: 'Calgary', region: 'AB', mode: 'remote' },
      dates: { start: '2025-05', end: '2025-08' },
      tense: 'past',
      bullets: [
        {
          text: 'Developed and optimized core user-facing features in React Native, including account management, chat, and password recovery with deep link integration.',
          print: true,
          priority: 1,
        },
        {
          text: 'Built and deployed a responsive landing page to improve product visibility and user acquisition.',
          print: true,
          priority: 3,
        },
        {
          text: 'Supported the App Store release with QA testing and bug fixes to improve performance and usability.',
          print: true,
          priority: 2,
        },
      ],
      exhibit: {
        title: 'The Deep Link',
        caption:
          'React Native features, from chat to password recovery through deep links, plus QA for the App Store release.',
        story: [
          {
            type: 'p',
            text: 'Wailo was my first developer co-op: from May to August 2025, I worked remotely as a Front End Developer for the Calgary company. I developed and optimized core user-facing features in React Native, including account management, chat, and password recovery with deep link integration, and I built and deployed a responsive landing page to improve product visibility and user acquisition.',
            draft: true,
          },
          {
            type: 'p',
            text: 'As the app headed for its Apple App Store release, I took on QA testing and bug fixes to improve performance and usability. It taught me what it takes to carry a feature all the way to a public release.',
            draft: true,
          },
        ],
        object: {
          text: 'A phone leans back on its stand while a glowing link arcs into it from an envelope, and the screen answers with a reset card: password recovery through a deep link. The blank brass tag marks the App Store release.',
          draft: true,
        },
        tags: ['React Native', 'Deep Linking', 'QA Testing', 'App Store Release', 'Landing Page'],
      },
    },
    {
      id: 'cfia',
      kind: 'work',
      role: 'IT Support Technician (Intern)',
      org: 'Canadian Food Inspection Agency',
      employment: 'internship',
      location: { city: 'Ottawa', region: 'ON', mode: 'remote' },
      dates: { start: '2022-12', end: '2024-08' },
      tense: 'past',
      bullets: [
        {
          text: 'Resolved high-volume hardware and software tickets for a distributed team in Assyst and ServiceNow.',
          print: true,
          priority: 1,
        },
      ],
      exhibit: {
        title: 'The Ticket Spindle',
        caption:
          'Technical support for a distributed team: hardware and software tickets resolved in Assyst and ServiceNow.',
        story: [
          {
            type: 'p',
            text: 'This is the oldest work in the collection, and where my career began. From December 2022 to August 2024, I worked remotely as an IT Support Technician intern for the Canadian Food Inspection Agency (Ottawa, ON). I provided technical support and troubleshooting for hardware and software issues across a distributed team, managing and resolving tickets in Assyst and ServiceNow in a high-volume support environment.',
            draft: true,
          },
          {
            type: 'p',
            text: 'Long before I wrote production code, this role taught me to diagnose problems methodically and to communicate clearly with the people who rely on technology to do their jobs.',
            draft: true,
          },
        ],
        object: {
          text: 'Paper tickets settle one by one onto a brass desk spindle, each stamped in its corner: steady, methodical support for a distributed team.',
          draft: true,
        },
        tags: ['ServiceNow', 'Assyst', 'Technical Support', 'Troubleshooting', 'Remote Support'],
        // R0 ruling (WP-03 brief): an exhibit is draft when its copy goes beyond the resume. Here
        // the object text ("methodical") and the "Remote Support" tag do.
        draft: true,
      },
    },
  ],
  projects: [
    {
      id: 'klarup',
      kind: 'project',
      name: 'KlarUp',
      tagline: 'Collaborative Productivity App',
      // role and dates are omitted until Emeka supplies them (CONTENT_DRAFT §7 item 6).
      stack: ['React Native', 'Python', 'Expo'],
      tense: 'past',
      bullets: [
        {
          text: 'Engineered a gamified, cross-platform task management application using React Native and a Python API, integrating collaborative features to drive user accountability and social motivation.',
          print: true,
          priority: 1,
        },
        {
          text: 'Architected the production release pipeline using Expo Application Services (EAS), securely injecting environment variables to generate untethered, standalone APKs for Android.',
          print: true,
          priority: 2,
        },
      ],
      exhibit: {
        title: 'The Climb',
        caption:
          'A gamified, cross-platform task app with collaborative accountability features and a production release pipeline on Expo EAS.',
        story: [
          {
            type: 'p',
            text: 'KlarUp is a gamified, cross-platform task management app that I engineered with React Native and a Python API. The idea is that tasks are easier to finish when people hold each other accountable, so I built collaborative features that add accountability and social motivation to everyday productivity.',
            draft: true,
          },
          {
            type: 'p',
            text: 'I also architected its production release pipeline on Expo Application Services (EAS), securely injecting environment variables to generate untethered, standalone Android APKs. KlarUp taught me that a release process deserves as much design as the features it ships.',
            draft: true,
          },
        ],
        object: {
          text: 'Five tiles climb like a staircase and tick themselves off one by one, while three brass beads wait together on the top step: accountability as a team sport. The small crate at the base is the standalone Android build.',
          draft: true,
        },
        tags: ['React Native', 'Python', 'Expo EAS', 'Android', 'Gamification'],
      },
    },
    {
      id: 'finance-tracker',
      kind: 'project',
      name: 'Personal Finance Tracker',
      // Required by the schema; the resume has none (G5 sign-off, CONTENT_DRAFT §7 item 7).
      tagline: 'Full-Stack Web App',
      // role and dates are omitted until Emeka supplies them (CONTENT_DRAFT §7 item 7).
      stack: ['MERN', 'ChatGPT API'],
      tense: 'past',
      // PLAN §1 trim 6: in the gallery only, so every bullet is print: false.
      bullets: [
        {
          text: 'Built a full-stack personal finance tracker using the MERN stack to manage income, expenses, and budgets, with ChatGPT API integration for real-time financial health analysis and personalized recommendations.',
          print: false,
          priority: 3,
        },
      ],
      exhibit: {
        title: 'The Balance',
        caption:
          'A full-stack MERN app for income, expenses, and budgets, with ChatGPT API analysis of financial health.',
        story: [
          {
            type: 'p',
            text: 'I built this full-stack personal finance tracker on the MERN stack (MongoDB, Express, React, and Node.js) to manage income, expenses, and budgets in one place. What makes it more than a ledger is the ChatGPT API integration, which analyzes financial health in real time and offers personalized recommendations.',
            draft: true,
          },
          {
            type: 'p',
            text: 'The project gave me end-to-end practice connecting a database, an API, and a React interface, and an early look at how language models can turn raw numbers into practical guidance.',
            draft: true,
          },
        ],
        object: {
          text: 'Three coin stacks, income in brass, expenses in graphite and the budget in frosted glass, rise and fall but always stay in balance.',
          draft: true,
        },
        tags: ['React', 'Node.js', 'MongoDB', 'ChatGPT API', 'Express'],
      },
    },
  ],
  volunteer: [
    {
      id: 'safe-sip',
      kind: 'volunteer',
      // "Right-To-Rise" capitalization is kept as on the resume until Emeka confirms (§7 item 11).
      role: 'Member (Right-To-Rise: Safe Sip)',
      org: 'Enactus Memorial',
      location: { city: "St. John's", region: 'NL' },
      dates: { start: '2025-09', end: 'present' },
      tense: 'present',
      bullets: [
        {
          text: 'Engineer a tamper-detecting smart lid MVP: a 3D-printed enclosure with a Raspberry Pi Pico W and I2C orientation sensor, using Euclidean distance and Euler angles to detect tampering in real time.',
          print: true,
          priority: 2,
        },
      ],
      exhibit: {
        title: 'Tamper Evident',
        caption:
          'A tamper-detecting smart lid MVP: a Raspberry Pi Pico W, an orientation sensor, and embedded spatial logic.',
        story: [
          {
            type: 'p',
            text: 'With Enactus Memorial, on Right-To-Rise: Safe Sip, I am engineering the hardware MVP for a smart lid that detects tampering. I am prototyping a 3D-printed enclosure around a Raspberry Pi Pico W and an I2C orientation sensor, and writing embedded spatial logic that uses Euclidean distance and Euler angles to recognize, in real time, when the lid has been disturbed.',
            draft: true,
          },
          {
            type: 'p',
            text: 'It is the exhibit where my software meets the physical world: every line of code has to make sense to a sensor, a microcontroller, and a printed shell.',
            draft: true,
          },
        ],
        object: {
          text: 'A cup rocks gently inside a brass gimbal. Its cut-away lid shows a Raspberry Pi Pico W and an orientation sensor, and the ring on the lid lights when the tilt crosses the tamper threshold.',
          draft: true,
        },
        tags: [
          'Raspberry Pi Pico W',
          'I2C Sensors',
          'Embedded Logic',
          '3D Printing',
          'Hardware Prototyping',
        ],
      },
    },
    {
      id: 'sdsj',
      kind: 'volunteer',
      role: 'President',
      org: "Software Developers of St. John's",
      location: { city: "St. John's", region: 'NL' },
      dates: { start: '2024-07', end: 'present' },
      tense: 'present',
      bullets: [
        {
          // WP-03 brief: the long SDSJ bullet is a tier-3 trim candidate (CONTENT_DRAFT §3.5 A5), so
          // priority 3 (the §3.3 register says 2; see the WP-03 report).
          text: 'Spearhead recurring monthly mini-hackathons, uniting developers, designers, and founders to collaborate on projects and foster an active, cross-functional tech community.',
          print: true,
          priority: 3,
        },
      ],
      exhibit: {
        title: 'The Round Table',
        caption:
          'Recurring monthly mini-hackathons that bring developers, designers, and founders together to collaborate on projects.',
        story: [
          {
            type: 'p',
            text: "Since July 2024, I have served as President of Software Developers of St. John's. The heart of the role is our recurring monthly mini-hackathons, which unite developers, designers, and founders to collaborate on projects and foster an active, cross-functional tech community.",
            draft: true,
          },
          {
            type: 'p',
            text: 'I love bringing those groups together, because each brings a perspective the others need. Leading the community has sharpened how I organize, how I communicate, and how I make room for other people to build.',
            draft: true,
          },
        ],
        object: {
          text: 'Six laptops face each other around a round table, their screens lighting in turn: monthly mini-hackathons where developers, designers and founders build together.',
          draft: true,
        },
        tags: [
          'Leadership',
          'Community Building',
          'Hackathons',
          'Event Organizing',
          'Cross-Functional Collaboration',
        ],
      },
    },
  ],
  education: [
    {
      id: 'mun',
      kind: 'education',
      institution: 'Memorial University of Newfoundland',
      degree: 'B.Eng in Computer Engineering',
      shortInstitution: 'MUN',
      shortDegree: 'B.Eng Computer Engineering',
      location: { city: "St. John's", region: 'NL' },
      // start is omitted until Emeka supplies it (CONTENT_DRAFT §7 item 9); no duration shows.
      graduation: '2027-05',
      exhibit: {
        title: 'Work in Progress',
        label: 'Memorial University',
        caption: 'The degree that every exhibit in this gallery is built on.',
        story: [
          {
            type: 'p',
            text: "Every exhibit in this gallery rests on the same foundation: my Bachelor of Engineering in Computer Engineering at Memorial University of Newfoundland in St. John's, where I expect to graduate in May 2027.",
            draft: true,
          },
          {
            type: 'p',
            text: 'My studies have grounded me in algorithms, data structures, and the basics of compilers and operating systems. My co-op terms at Wailo, Mysa, and Nasdaq Verafin let me test those ideas against real products, and I treat the degree and the work as one continuous education.',
            draft: true,
          },
        ],
        object: {
          text: 'A silicon die stands inside a brass scaffold. Each brass tier is a year of study still ahead; the tiers already taken down remain as glass outlines. The degree is expected in May 2027.',
          draft: true,
        },
        tags: [
          'Computer Engineering',
          'Algorithms',
          'Data Structures',
          'Operating Systems',
          'Compilers',
        ],
        // R0 ruling (WP-03 brief): an exhibit is draft when its copy goes beyond the resume. Here
        // the caption frames the degree and the tags attribute skills to coursework.
        draft: true,
      },
    },
  ],
  certifications: {
    id: 'certifications',
    kind: 'certifications',
    // Dates, the Tech Stewardship issuer and verification links are omitted until Emeka supplies
    // them (CONTENT_DRAFT §7 item 8).
    items: [
      { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services' },
      { name: 'Tech Stewardship Practice Program' },
      { name: 'Tech Stewardship for the Energy Transition' },
    ],
    exhibit: {
      title: 'The Medal Cabinet',
      label: 'Certifications',
      caption: 'Three credentials in cloud fundamentals and responsible technology.',
      story: [
        {
          type: 'p',
          text: 'This case holds three credentials. The AWS Certified Cloud Practitioner certification reflects my grounding in cloud fundamentals, knowledge I have put to work with services like AWS Cognito.',
          draft: true,
        },
        {
          type: 'p',
          text: 'The Tech Stewardship Practice Program and Tech Stewardship for the Energy Transition reflect a different commitment: thinking carefully about the impact of the technology I help create, including its role in a changing energy landscape.',
          draft: true,
        },
      ],
      object: {
        text: 'Three brass medallions hang in a wall cabinet: a cloud for AWS Certified Cloud Practitioner, a compass rose for the Tech Stewardship Practice Program, and a turbine for Tech Stewardship for the Energy Transition.',
        draft: true,
      },
      tags: ['AWS', 'Cloud', 'Tech Stewardship', 'Energy Transition', 'Responsible Technology'],
      // R0 ruling (WP-03 brief): an exhibit is draft when its copy goes beyond the resume. Here
      // "responsible technology" characterizes the Tech Stewardship programs.
      draft: true,
    },
  },
  skills: [
    {
      label: 'Languages',
      items: ['Python', 'C++', 'C#', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
    },
    {
      label: 'Frameworks',
      items: ['React', 'React Native', 'Next.js', 'Node.js', 'Express', 'FastAPI'],
    },
    {
      label: 'Data, Cloud & DevOps',
      items: ['MongoDB', 'SQLite', 'AWS', 'Firebase', 'Kubernetes', 'Detox', 'GitHub Actions'],
    },
    {
      label: 'Concepts',
      items: [
        'Algorithms',
        'Data Structures',
        'Agile',
        'CI/CD',
        'OAuth 2.0 / OIDC',
        'Compiler & OS Basics',
      ],
    },
  ],
  wings: [
    {
      id: 'projects',
      title: 'Projects',
      after: 'verafin',
      side: 'left',
      // Order kept until project dates are known (CONTENT_DRAFT §5.11).
      items: ['klarup', 'finance-tracker'],
    },
    {
      id: 'volunteer',
      title: 'Volunteer & Leadership',
      after: 'mysa',
      side: 'right',
      items: ['safe-sip', 'sdsj'],
    },
  ],
} satisfies ResumeInput;
