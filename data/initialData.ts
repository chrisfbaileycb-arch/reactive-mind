/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MindCategory,
  MindFileNode,
  FileKind,
  MaterialFinish,
  RealFileMetadata,
} from '../types';

export interface ParsedDirectoryEntry {
  name: string;
  relativePath: string;
  topFolderName: string;
  mimeType: string;
  sizeBytes: number;
  lastModified: number;
  textPreview?: string;
}

export function inferFileKindFromMimeOrName(filename: string, mimeType = ''): FileKind {
  const lower = filename.toLowerCase();
  const mime = mimeType.toLowerCase();
  if (
    mime.startsWith('image/') ||
    /\.(png|jpg|jpeg|webp|gif|svg|heic|avif)$/i.test(lower)
  ) {
    return 'photo';
  }
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(lower)) {
    return 'video';
  }
  if (
    mime.includes('spreadsheet') ||
    mime.includes('csv') ||
    /\.(csv|xlsx|xls|numbers|tsv)$/i.test(lower)
  ) {
    return 'sheet';
  }
  if (mime.includes('message/rfc822') || /\.(eml|mbox|msg)$/i.test(lower)) {
    return 'email';
  }
  if (/\.(md|txt|rtf|org|todo)$/i.test(lower)) {
    return 'note';
  }
  return 'document';
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Dynamically maps real parsed directory entries from File System Access API
 * or HTML5 webkitdirectory input into the 3D scene data schema (MindCategory + MindFileNode[]).
 */
export function mapDirectoryEntriesToSceneNodes(
  rootFolderName: string,
  entries: ParsedDirectoryEntry[],
  existingCategories: MindCategory[],
  options?: {
    customColor?: string;
    customFinish?: MaterialFinish;
    customSymbol?: string;
    targetCategoryId?: string;
  }
): {
  category: MindCategory;
  nodes: MindFileNode[];
} {
  const categoryId =
    options?.targetCategoryId ||
    `dir-${rootFolderName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const existing = existingCategories.find((c) => c.id === categoryId);
  const count = existingCategories.length;
  const symbol = (
    options?.customSymbol ||
    rootFolderName.trim().charAt(0) ||
    'F'
  ).toUpperCase();

  const category: MindCategory = existing
    ? {
        ...existing,
        color: options?.customColor || existing.color,
        finish: options?.customFinish || existing.finish,
        symbol,
        description: `Imported local directory: ${rootFolderName} (${entries.length} files)`,
      }
    : {
        id: categoryId,
        name: rootFolderName,
        symbol,
        color: options?.customColor || '#06B6D4',
        description: `Imported local directory: ${rootFolderName} (${entries.length} files)`,
        finish: options?.customFinish || 'pearl',
        orbitRadius: 5.0,
        orbitAngle: (count * (Math.PI * 2)) / Math.max(count + 1, 1),
        elevation: count % 2 === 0 ? 0.65 : -0.65,
        isConnectorGroup: true,
        connectorType: 'local-folder',
      };

  const nodes: MindFileNode[] = entries.map((entry, idx) => {
    const metadata: RealFileMetadata = {
      name: entry.name,
      relativePath: entry.relativePath,
      mimeType: entry.mimeType || 'application/octet-stream',
      sizeBytes: entry.sizeBytes,
      lastModified: entry.lastModified,
      lastModifiedISO: new Date(entry.lastModified || Date.now()).toISOString(),
    };

    const kind = inferFileKindFromMimeOrName(entry.name, entry.mimeType);
    const sizeLabel = formatFileSize(entry.sizeBytes);
    const modifiedDate = new Date(entry.lastModified || Date.now()).toLocaleDateString(
      undefined,
      { month: 'short', day: 'numeric', year: 'numeric' }
    );

    const subFolder = entry.relativePath.includes('/')
      ? entry.relativePath.split('/').slice(0, -1).join(' / ')
      : rootFolderName;

    return {
      id: `fs-${categoryId}-${entry.relativePath.replace(/[^a-zA-Z0-9_-]/g, '_')}-${idx}`,
      title: entry.name,
      categoryId: category.id,
      appSymbol: symbol,
      appName: `Directory (${rootFolderName})`,
      locationPath: `${subFolder} · ${entry.name}`,
      storageDrive: rootFolderName,
      fileKind: kind,
      sizeLabel,
      updatedAt: modifiedDate,
      summary: `${entry.mimeType || kind.toUpperCase()} · ${sizeLabel} · Modified ${modifiedDate} in ${entry.relativePath}`,
      content:
        entry.textPreview && entry.textPreview.trim().length > 0
          ? `File: ${entry.name}\nRelative Path: ${entry.relativePath}\nMIME Type: ${metadata.mimeType}\nSize: ${sizeLabel} (${entry.sizeBytes} bytes)\nLast Modified: ${metadata.lastModifiedISO}\n\n--- File Preview ---\n${entry.textPreview}`
          : `File: ${entry.name}\nRelative Path: ${entry.relativePath}\nMIME Type: ${metadata.mimeType}\nSize: ${sizeLabel} (${entry.sizeBytes} bytes)\nLast Modified: ${metadata.lastModifiedISO}`,
      importance: Math.min(1.3, Math.max(0.9, 0.95 + Math.log10(Math.max(entry.sizeBytes, 100)) * 0.05)),
      workloadPriority: idx < 3 ? 'urgent' : idx < 8 ? 'today' : 'caught-up',
      metadata,
    };
  });

  return { category, nodes };
}

export const INITIAL_CATEGORIES: MindCategory[] = [
  {
    id: 'work',
    name: 'Work',
    symbol: 'W',
    color: '#2563EB', // Bright Royal Blue
    description: 'Emails, team docs, client presentations, and schedules',
    finish: 'pearl',
    orbitRadius: 4.6,
    orbitAngle: 0.4,
    elevation: 0.55,
  },
  {
    id: 'personal',
    name: 'Personal',
    symbol: 'P',
    color: '#F97316', // Warm Coral Orange
    description: 'Family photos, travel bookings, shopping lists, and home plans',
    finish: 'pearl',
    orbitRadius: 4.6,
    orbitAngle: 1.97,
    elevation: -0.45,
  },
  {
    id: 'skills',
    name: 'Skills',
    symbol: 'S',
    color: '#10B981', // Fresh Mint Emerald
    description: 'Cooking recipes, language lessons, guitar tabs, and fitness routines',
    finish: 'glass',
    orbitRadius: 4.6,
    orbitAngle: 3.54,
    elevation: 0.5,
  },
  {
    id: 'storage',
    name: 'Storage',
    symbol: 'V',
    color: '#8B5CF6', // Clean Amethyst Violet
    description: 'Tax returns, signed leases, receipts, and ID scans',
    finish: 'glass',
    orbitRadius: 4.6,
    orbitAngle: 5.11,
    elevation: -0.5,
  },
];

export const INITIAL_FILES: MindFileNode[] = [
  // WORK (Blue)
  {
    id: 'work-gmail-proposal',
    title: 'Client Proposal Email',
    categoryId: 'work',
    appSymbol: 'G',
    appName: 'Gmail',
    locationPath: 'Gmail · Starred Inbox',
    storageDrive: 'Google Workspace',
    fileKind: 'email',
    sizeLabel: '24.5 KB',
    updatedAt: 'Today, 10:30 AM',
    summary: 'Email thread from Sarah with the updated spring project budget and timeline approval.',
    content: `From: Sarah Jenkins <sarah@brightstudio.co>\nSubject: Approved Spring Project Proposal\nDescriptive Location: Gmail → Starred Inbox\n\nHi there!\nWe reviewed the updated timeline and everything looks great to kick off next Monday. I attached the signed estimate and kickoff checklist.`,
    importance: 1.25,
    workloadPriority: 'urgent',
    metadata: {
      name: 'Client Proposal Email.eml',
      relativePath: 'Gmail/Starred/Client Proposal Email.eml',
      mimeType: 'message/rfc822',
      sizeBytes: 25088,
      lastModified: 1760549400000,
      lastModifiedISO: '2026-10-15T17:30:00.000Z',
    },
  },
  {
    id: 'work-docs-meeting',
    title: 'Monday Team Notes',
    categoryId: 'work',
    appSymbol: 'D',
    appName: 'Google Docs',
    locationPath: 'Google Docs · Weekly Notes Folder',
    storageDrive: 'Google Drive',
    fileKind: 'document',
    sizeLabel: '18.2 KB',
    updatedAt: 'Yesterday',
    summary: 'Action items from Monday morning standup, launch checklist, and design feedback.',
    content: `Monday Team Check-In\nDescriptive Location: Google Docs → Weekly Notes Folder\n\n• Finalize slides for Thursday's client call\n• Send updated invoice to accounting\n• Confirm catering for Friday team lunch`,
    importance: 1.1,
    workloadPriority: 'today',
    metadata: {
      name: 'Monday Team Notes.md',
      relativePath: 'Work/Weekly Notes/Monday Team Notes.md',
      mimeType: 'text/markdown',
      sizeBytes: 18636,
      lastModified: 1760463000000,
      lastModifiedISO: '2026-10-14T17:30:00.000Z',
    },
  },
  {
    id: 'work-sheets-budget',
    title: 'Q4 Expense Tracker',
    categoryId: 'work',
    appSymbol: '$',
    appName: 'Google Sheets',
    locationPath: 'Google Sheets · Finance Folder',
    storageDrive: 'Google Drive',
    fileKind: 'sheet',
    sizeLabel: '42.0 KB',
    updatedAt: '2 days ago',
    summary: 'Monthly breakdown of software subscriptions, travel reimbursements, and team budget.',
    content: `Q4 Expense Tracker\nDescriptive Location: Google Sheets → Finance Folder\n\n• Design & Cloud Subscriptions: $140/mo\n• Client Travel & Meals: $480\n• Remaining Quarterly Balance: $3,820`,
    importance: 1.05,
    workloadPriority: 'today',
    metadata: {
      name: 'Q4 Expense Tracker.csv',
      relativePath: 'Work/Finance/Q4 Expense Tracker.csv',
      mimeType: 'text/csv',
      sizeBytes: 43008,
      lastModified: 1760376600000,
      lastModifiedISO: '2026-10-13T17:30:00.000Z',
    },
  },
  {
    id: 'work-slides-deck',
    title: 'Spring Launch Pitch Deck',
    categoryId: 'work',
    appSymbol: 'S',
    appName: 'Slides',
    locationPath: 'Google Slides · Presentations',
    storageDrive: 'Google Drive',
    fileKind: 'document',
    sizeLabel: '3.4 MB',
    updatedAt: '3 days ago',
    summary: 'Visual slide deck showing customer stories, product mockups, and 2026 goals.',
    content: `Spring Launch Pitch Deck\nDescriptive Location: Google Slides → Presentations\n\nSlide 1: Welcome & Vision\nSlide 2: What Everyday Users Love\nSlide 3: Simple Color-Coordinated Organization`,
    importance: 1.0,
    workloadPriority: 'urgent',
  },
  {
    id: 'work-calendar-schedule',
    title: 'Product Launch Calendar',
    categoryId: 'work',
    appSymbol: 'C',
    appName: 'Calendar',
    locationPath: 'Google Calendar · Work Events',
    storageDrive: 'Google Calendar',
    fileKind: 'note',
    sizeLabel: '5 Events',
    updatedAt: 'This week',
    summary: 'Key dates for the product review, marketing shoot, and team celebration.',
    content: `Upcoming Work Milestones:\n• Thu 2:00 PM — Design Walkthrough\n• Next Tue 11:00 AM — Final Launch Review\n• Next Fri 4:00 PM — Team Celebration Dinner`,
    importance: 0.95,
    workloadPriority: 'caught-up',
  },

  // PERSONAL (Coral Orange)
  {
    id: 'personal-gmail-flights',
    title: 'Hawaii Flight Confirmation',
    categoryId: 'personal',
    appSymbol: 'G',
    appName: 'Gmail',
    locationPath: 'Gmail · Travel Folder',
    storageDrive: 'Personal Gmail',
    fileKind: 'email',
    sizeLabel: '32.1 KB',
    updatedAt: 'Yesterday',
    summary: 'Round-trip confirmation code (HNL-849) and window seat assignments for Honolulu.',
    content: `Airline Confirmation: #HNL849\nDescriptive Location: Gmail → Travel Folder\n\nDeparture: Friday, Nov 14 at 8:45 AM (Seat 12A)\nHotel: Royal Hawaiian Oceanfront — Check-in 3:00 PM`,
    importance: 1.25,
    workloadPriority: 'today',
  },
  {
    id: 'personal-photos-vacation',
    title: 'Family Summer Album',
    categoryId: 'personal',
    appSymbol: 'P',
    appName: 'Photos',
    locationPath: 'Apple Photos · Favorites Album',
    storageDrive: 'iCloud Photos',
    fileKind: 'photo',
    sizeLabel: '68 Photos',
    updatedAt: '4 days ago',
    summary: 'High-resolution beach sunset portraits, kids birthday party, and backyard barbecue.',
    content: `Album: Family Summer Memories\nDescriptive Location: Apple Photos → Favorites Album\n\nIncludes 68 favorite photos and 4 short videos ready to print for the living room frame.`,
    importance: 1.15,
    workloadPriority: 'caught-up',
  },
  {
    id: 'personal-notes-grocery',
    title: 'Weekend Grocery & Errands',
    categoryId: 'personal',
    appSymbol: 'N',
    appName: 'Notes',
    locationPath: 'Apple Notes · Pinned Lists',
    storageDrive: 'iCloud Notes',
    fileKind: 'note',
    sizeLabel: '4.2 KB',
    updatedAt: '2 hours ago',
    summary: 'Farmers market shopping list, dry cleaning pickup, and birthday gift ideas.',
    content: `Weekend Checklist\nDescriptive Location: Apple Notes → Pinned Lists\n\n[x] Fresh sourdough & honeycrisp apples\n[ ] Espresso beans & oat milk\n[ ] Pick up blue jacket from dry cleaners\n[ ] Order Mom's birthday flowers`,
    importance: 1.0,
    workloadPriority: 'urgent',
  },
  {
    id: 'personal-home-remodel',
    title: 'Kitchen Remodel Ideas',
    categoryId: 'personal',
    appSymbol: 'H',
    appName: 'Home Board',
    locationPath: 'Pinterest & Notes · Home Folder',
    storageDrive: 'Personal iCloud',
    fileKind: 'photo',
    sizeLabel: '12 Ideas',
    updatedAt: 'Last week',
    summary: 'Paint swatches (Warm Alabaster), brass cabinet handles, and oak island dimensions.',
    content: `Kitchen Refresh Inspiration\nDescriptive Location: Notes → Home Folder\n\n• Cabinet Paint: Benjamin Moore Swiss Coffee\n• Countertop: Honed Quartz\n• Contractor quote saved in Storage sphere`,
    importance: 0.95,
    workloadPriority: 'caught-up',
  },

  // SKILLS & HOBBIES (Mint Emerald)
  {
    id: 'skills-youtube-spanish',
    title: 'Conversational Spanish Lessons',
    categoryId: 'skills',
    appSymbol: 'Y',
    appName: 'YouTube',
    locationPath: 'YouTube · Saved Learning Playlist',
    storageDrive: 'YouTube Library',
    fileKind: 'video',
    sizeLabel: '8 Videos',
    updatedAt: 'Yesterday',
    summary: 'Everyday travel phrases, restaurant ordering, and 15-minute daily listening practice.',
    content: `Spanish Daily Practice\nDescriptive Location: YouTube → Saved Learning Playlist\n\nLesson 4: Ordering coffee & asking for directions\nKey Phrase: "¿Me puede recomendar un buen café por aquí?"`,
    importance: 1.2,
    workloadPriority: 'today',
  },
  {
    id: 'skills-cooking-sourdough',
    title: 'Sunday Sourdough Recipe',
    categoryId: 'skills',
    appSymbol: 'R',
    appName: 'Recipes',
    locationPath: 'Notes · Cooking & Baking Folder',
    storageDrive: 'iCloud Notes',
    fileKind: 'note',
    sizeLabel: '6.8 KB',
    updatedAt: '3 days ago',
    summary: 'Step-by-step hydration ratios, overnight cold proof timing, and Dutch oven bake temp.',
    content: `Country Sourdough Loaf\nDescriptive Location: Notes → Cooking & Baking Folder\n\n• 450g Bread Flour + 50g Whole Wheat\n• 375g Warm Water (75% Hydration)\n• 100g Active Starter + 10g Sea Salt\n• Bake in Dutch Oven at 475°F for 20 mins covered, 22 mins uncovered.`,
    importance: 1.1,
    workloadPriority: 'caught-up',
  },
  {
    id: 'skills-music-guitar',
    title: 'Acoustic Guitar Songbook',
    categoryId: 'skills',
    appSymbol: 'M',
    appName: 'Music Tabs',
    locationPath: 'Google Drive · Music & Chords',
    storageDrive: 'Google Drive',
    fileKind: 'document',
    sizeLabel: '12 Songs',
    updatedAt: '5 days ago',
    summary: 'Fingerpicking patterns and chord progressions for favorite acoustic songs.',
    content: `Acoustic Guitar Favorites\nDescriptive Location: Google Drive → Music & Chords\n\n• Blackbird — Fingerpicking in G Major\n• Landslide — Capo 3rd Fret\n• Fast Car — Capo 2nd Fret`,
    importance: 1.0,
    workloadPriority: 'caught-up',
  },
  {
    id: 'skills-fitness-plan',
    title: '30-Min Morning Mobility & Run',
    categoryId: 'skills',
    appSymbol: 'F',
    appName: 'Fitness',
    locationPath: 'Apple Health · Workout Notes',
    storageDrive: 'iCloud Health',
    fileKind: 'note',
    sizeLabel: 'Weekly Plan',
    updatedAt: 'This week',
    summary: 'Weekly stretching routine, 5K running pace goals, and recovery stretches.',
    content: `Weekly Routine\nDescriptive Location: Apple Health → Workout Notes\n\n• Mon / Wed / Fri: 25-min easy outdoor run + 10-min hip mobility\n• Tue / Thu: Core & upper body strength\n• Weekend: Long walk or bike ride`,
    importance: 0.95,
    workloadPriority: 'today',
  },

  // STORAGE & KEEPSAKES (Violet)
  {
    id: 'storage-drive-taxes',
    title: '2025 Tax Return PDF',
    categoryId: 'storage',
    appSymbol: 'D',
    appName: 'Google Drive',
    locationPath: 'Google Drive · Taxes & Important',
    storageDrive: 'Google Drive Vault',
    fileKind: 'document',
    sizeLabel: '4.2 MB',
    updatedAt: 'Sep 2026',
    summary: 'Complete federal and state tax filing PDF, W-2s, and accountant confirmation receipt.',
    content: `2025 Federal & State Tax Return\nDescriptive Location: Google Drive → Taxes & Important\n\nStatus: E-Filed & Accepted\nIncludes: Form 1040, Schedule C receipts, and CPA summary letter.`,
    importance: 1.25,
    workloadPriority: 'caught-up',
  },
  {
    id: 'storage-dropbox-lease',
    title: 'Home Insurance & Deed PDF',
    categoryId: 'storage',
    appSymbol: 'B',
    appName: 'Dropbox',
    locationPath: 'Dropbox · Home Documents',
    storageDrive: 'Dropbox Personal',
    fileKind: 'document',
    sizeLabel: '2.8 MB',
    updatedAt: 'Aug 2026',
    summary: 'Annual homeowners insurance policy declaration page and warranty manuals.',
    content: `Home Insurance Policy #HO-99281\nDescriptive Location: Dropbox → Home Documents\n\nCoverage Period: 2026–2027\nAgent Contact: 1-800-555-0199`,
    importance: 1.1,
    workloadPriority: 'caught-up',
  },
  {
    id: 'storage-icloud-ids',
    title: 'Passport & Driver License Scans',
    categoryId: 'storage',
    appSymbol: 'I',
    appName: 'iCloud Drive',
    locationPath: 'iCloud Drive · Family IDs',
    storageDrive: 'iCloud Secure Folder',
    fileKind: 'photo',
    sizeLabel: '1.9 MB',
    updatedAt: 'Jul 2026',
    summary: 'High-clarity backup scans of passports, Global Entry cards, and pet vaccination records.',
    content: `Family Travel & ID Backups\nDescriptive Location: iCloud Drive → Family IDs\n\n• Passport Expiration: May 2031\n• Known Traveler Number (TSA PreCheck) on file`,
    importance: 1.05,
    workloadPriority: 'caught-up',
  },
  {
    id: 'storage-wallet-receipts',
    title: 'AppleCare & Appliance Warranties',
    categoryId: 'storage',
    appSymbol: 'W',
    appName: 'Wallet & Receipts',
    locationPath: 'Gmail · Receipts & Warranties',
    storageDrive: 'Gmail Archive',
    fileKind: 'email',
    sizeLabel: '6 Receipts',
    updatedAt: 'Oct 2026',
    summary: 'Purchase receipts and serial numbers for laptop, refrigerator, and camera gear.',
    content: `Saved Warranties & Serial Numbers\nDescriptive Location: Gmail → Receipts & Warranties\n\n• MacBook Air 15" — Covered through Nov 2027\n• Espresso Machine — 2-Year Manufacturer Warranty`,
    importance: 0.95,
    workloadPriority: 'caught-up',
  },
];
