
export interface Article {
  id: string;
  rowNumber?: number;
  title: string;
  slug: string; 
  chineseTitle?: string; 
  chineseLink?: string; 
  publishedDate: string;
  mainCategory: string; 
  subCategory: string;
  link: string;
  author: string;
  description?: string;
  notes?: string; 
  isLinkedInPosted: string; 
  hashtags: string[];
  createdAt: number;
  views?: number; 
}

export interface ArticleStats {
  category: string;
  count: number;
}

export const CATEGORY_STRUCTURE = {
  "RELEASE NOTES": [],
  "FUNDAMENTALS": [
    "Hardware & System Setup",
    "Communication protocol"
  ],
  "TM AI VISION": [
    "Positioning Guideline",
    "Inspection Guideline"
  ],
  "ADVANCED FEATURES": [
    "TM Welding Solution",
    "TM palletizing",
    "TM Plug&Play",
    "Tips & Technique"
  ],
  "SECONDARY DEVELOPMENT": [],
  "GENERAL TROUBLESHOOTING": [],
  "DISTRIBUTOR AREA ONLY": [
    "Updates & Installations",
    "Troubleshooting Guide",
    "TMvision",
    "Service Manual - Maintenance & Repair"
  ]
};

// Define default hashtags in a shared location
export const DEFAULT_HASHTAGS = ['#vision', '#tutorial', '#application', '#troubleshooting', '#TM AI+', '#Auto TCP', '#welding', '#palletizing'];
