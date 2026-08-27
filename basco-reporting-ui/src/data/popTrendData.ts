// src/data/popTrendData.ts
// Structured POP Input Data Trend from dbo.BASCO_POP_Input_Data_Trend.
// Covers APJ, EMEA, LATAM, and Canada from 2020 through 2025.

export interface PopTrendRow {
  region: "APJ" | "EMEA" | "LATAM" | "CANADA" | "US" | "PRC";
  country: string;
  account: string;
  parentAccount?: string;
  childAccount?: string;
  logo: number | null;
  badge: number | null;
  textMention: number | null;
  keyVisuals: number | null;
  score: number; // 0 to 100
  quarter: string; // "Q1", "Q2", "Q3", "Q4"
  year: number; // 2020 to 2025
  period: string; // "Q1 2025", "Q3 2024", etc.
  artwork: number;
  fmv: number | null;
  attributionLoss: number | null;
  attributionGain: number | null;
  topAccount: "YES" | "NO";
}

export const POP_TREND_DATA: PopTrendRow[] = [
  // ── 2025 Q1 ─────────────────────────────────────────────────────────────
  { region: "APJ", country: "Australia", account: "Harvey Norman", quarter: "Q1", year: 2025, period: "Q1 2025", score: 100, artwork: 13, fmv: 386500, attributionLoss: 0, attributionGain: 386500, topAccount: "YES", logo: 1, badge: 1, textMention: 1, keyVisuals: 1 },
  { region: "APJ", country: "Australia", account: "JB HiFi", quarter: "Q1", year: 2025, period: "Q1 2025", score: 82, artwork: 7, fmv: 501000, attributionLoss: 90180, attributionGain: 410820, topAccount: "YES", logo: 0.8, badge: 0.685, textMention: 0.8, keyVisuals: 1 },
  { region: "APJ", country: "Australia", account: "OfficeWorks", quarter: "Q1", year: 2025, period: "Q1 2025", score: 75, artwork: 5, fmv: 210000, attributionLoss: 52500, attributionGain: 157500, topAccount: "YES", logo: null, badge: 0.519, textMention: 0.759, keyVisuals: 1 },
  { region: "APJ", country: "Australia", account: "The Good Guys", quarter: "Q1", year: 2025, period: "Q1 2025", score: 84, artwork: 3, fmv: 101300, attributionLoss: 16208, attributionGain: 85092, topAccount: "NO", logo: null, badge: 0.666, textMention: 0.866, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Amazon", quarter: "Q1", year: 2025, period: "Q1 2025", score: 84, artwork: 15, fmv: 250000, attributionLoss: 40000, attributionGain: 210000, topAccount: "YES", logo: 1, badge: 0.573, textMention: 0.813, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Clicktech", quarter: "Q1", year: 2025, period: "Q1 2025", score: 59, artwork: 8, fmv: 369000, attributionLoss: 151290, attributionGain: 217710, topAccount: "NO", logo: null, badge: 0.699, textMention: 0.075, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Croma", quarter: "Q1", year: 2025, period: "Q1 2025", score: 96, artwork: 8, fmv: 215000, attributionLoss: 8600, attributionGain: 206400, topAccount: "NO", logo: 0.971, badge: 0.875, textMention: 1, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Flipkart", quarter: "Q1", year: 2025, period: "Q1 2025", score: 90, artwork: 12, fmv: 1828930, attributionLoss: 182893, attributionGain: 1646037, topAccount: "YES", logo: null, badge: 0.783, textMention: 0.933, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Shopclues", quarter: "Q1", year: 2025, period: "Q1 2025", score: 95, artwork: 7, fmv: 70000, attributionLoss: 3500, attributionGain: 66500, topAccount: "NO", logo: 1, badge: 0.857, textMention: 0.971, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Vijay Sales", quarter: "Q1", year: 2025, period: "Q1 2025", score: 84, artwork: 10, fmv: 33500, attributionLoss: 5360, attributionGain: 28140, topAccount: "NO", logo: 0.6, badge: 0.98, textMention: 0.8, keyVisuals: 1 },
  { region: "APJ", country: "Indonesia", account: "Agres", quarter: "Q1", year: 2025, period: "Q1 2025", score: 95, artwork: 17, fmv: 316000, attributionLoss: 15800, attributionGain: 300200, topAccount: "YES", logo: 0.966, badge: 0.975, textMention: 0.887, keyVisuals: 1 },
  { region: "APJ", country: "Indonesia", account: "Blibli", quarter: "Q1", year: 2025, period: "Q1 2025", score: 97, artwork: 13, fmv: 76500, attributionLoss: 2295, attributionGain: 74205, topAccount: "NO", logo: 1, badge: 0.969, textMention: 0.933, keyVisuals: 1 },
  { region: "APJ", country: "Japan", account: "Amazon", quarter: "Q1", year: 2025, period: "Q1 2025", score: 78, artwork: 4, fmv: 68000, attributionLoss: 14960, attributionGain: 53040, topAccount: "NO", logo: 1, badge: 0.55, textMention: 0.6, keyVisuals: 1 },
  { region: "APJ", country: "Japan", account: "BIC3", quarter: "Q1", year: 2025, period: "Q1 2025", score: 91, artwork: 8, fmv: 372000, attributionLoss: 33480, attributionGain: 338520, topAccount: "YES", logo: 1, badge: 0.828, textMention: 0.828, keyVisuals: 1 },
  { region: "APJ", country: "Japan", account: "K's Denki", quarter: "Q1", year: 2025, period: "Q1 2025", score: 91, artwork: 4, fmv: 232000, attributionLoss: 20880, attributionGain: 211120, topAccount: "NO", logo: 0.8, badge: 1, textMention: 0.866, keyVisuals: 1 },
  { region: "APJ", country: "Japan", account: "Yamada Denki", quarter: "Q1", year: 2025, period: "Q1 2025", score: 84, artwork: 10, fmv: 475000, attributionLoss: 76000, attributionGain: 399000, topAccount: "NO", logo: 0.949, badge: 0.8, textMention: 0.639, keyVisuals: 1 },
  { region: "APJ", country: "Japan", account: "Yodobashi", quarter: "Q1", year: 2025, period: "Q1 2025", score: 73, artwork: 10, fmv: 320132, attributionLoss: 86435.6, attributionGain: 233696.36, topAccount: "YES", logo: 0.8, badge: 0.777, textMention: 0.355, keyVisuals: 1 },
  { region: "APJ", country: "Malaysia", account: "PCImage", quarter: "Q1", year: 2025, period: "Q1 2025", score: 97, artwork: 14, fmv: 45000, attributionLoss: 1350, attributionGain: 43650, topAccount: "NO", logo: 1, badge: 0.942, textMention: 0.957, keyVisuals: 1 },
  { region: "APJ", country: "Malaysia", account: "SNS", quarter: "Q1", year: 2025, period: "Q1 2025", score: 96, artwork: 25, fmv: 138000, attributionLoss: 5520, attributionGain: 132480, topAccount: "NO", logo: 0.949, badge: 0.933, textMention: 0.973, keyVisuals: 0.989 },
  { region: "APJ", country: "New Zealand", account: "Harvey Norman", quarter: "Q1", year: 2025, period: "Q1 2025", score: 94, artwork: 7, fmv: 37000, attributionLoss: 2220, attributionGain: 34780, topAccount: "YES", logo: 1, badge: 0.971, textMention: 0.828, keyVisuals: 1 },
  { region: "APJ", country: "South Korea", account: "Coupang", quarter: "Q1", year: 2025, period: "Q1 2025", score: 98, artwork: 14, fmv: 437000, attributionLoss: 8740, attributionGain: 428260, topAccount: "YES", logo: 1, badge: 1, textMention: 0.971, keyVisuals: 0.981 },
  { region: "APJ", country: "South Korea", account: "G-Market", quarter: "Q1", year: 2025, period: "Q1 2025", score: 98, artwork: 18, fmv: 515000, attributionLoss: 10300, attributionGain: 504700, topAccount: "YES", logo: 0.988, badge: 0.966, textMention: 1, keyVisuals: 1 },
  { region: "APJ", country: "Taiwan", account: "Momo", quarter: "Q1", year: 2025, period: "Q1 2025", score: 93, artwork: 13, fmv: 75000, attributionLoss: 5250, attributionGain: 69750, topAccount: "NO", logo: 0.854, badge: 0.953, textMention: 0.953, keyVisuals: 1 },
  { region: "APJ", country: "Taiwan", account: "PC Home", quarter: "Q1", year: 2025, period: "Q1 2025", score: 98, artwork: 10, fmv: 62000, attributionLoss: 1240, attributionGain: 60760, topAccount: "NO", logo: 1, badge: 1, textMention: 0.939, keyVisuals: 1 },
  { region: "APJ", country: "Thailand", account: "Advice", quarter: "Q1", year: 2025, period: "Q1 2025", score: 94, artwork: 12, fmv: 207000, attributionLoss: 12420, attributionGain: 194580, topAccount: "NO", logo: 0.966, badge: 0.833, textMention: 0.966, keyVisuals: 1 },
  { region: "APJ", country: "Thailand", account: "Com7", quarter: "Q1", year: 2025, period: "Q1 2025", score: 93, artwork: 24, fmv: 291550, attributionLoss: 20408.5, attributionGain: 271141.5, topAccount: "NO", logo: 0.939, badge: 0.927, textMention: 0.875, keyVisuals: 0.988 },
  { region: "APJ", country: "Thailand", account: "JIB", quarter: "Q1", year: 2025, period: "Q1 2025", score: 97, artwork: 15, fmv: 218150, attributionLoss: 6544.5, attributionGain: 211605.5, topAccount: "NO", logo: 0.927, badge: 1, textMention: 0.959, keyVisuals: 1 },
  { region: "APJ", country: "Vietnam", account: "Mobile World", quarter: "Q1", year: 2025, period: "Q1 2025", score: 90, artwork: 6, fmv: 201000, attributionLoss: 20100, attributionGain: 180900, topAccount: "YES", logo: 1, badge: 0.8, textMention: 0.833, keyVisuals: 1 },
  { region: "EMEA", country: "France", account: "FNAC", quarter: "Q1", year: 2025, period: "Q1 2025", score: 92, artwork: 12, fmv: 290000, attributionLoss: 23200, attributionGain: 266800, topAccount: "YES", logo: 1, badge: 0.983, textMention: 0.699, keyVisuals: 1 },
  { region: "EMEA", country: "Germany", account: "Cyberport", quarter: "Q1", year: 2025, period: "Q1 2025", score: 91, artwork: 5, fmv: 235000, attributionLoss: 21150, attributionGain: 213850, topAccount: "NO", logo: 1, badge: 0.959, textMention: 0.72, keyVisuals: 1 },
  { region: "EMEA", country: "Germany", account: "Notebooksbillger", quarter: "Q1", year: 2025, period: "Q1 2025", score: 88, artwork: 5, fmv: 485400, attributionLoss: 58248, attributionGain: 427152, topAccount: "YES", logo: 1, badge: 0.92, textMention: 0.6, keyVisuals: 1 },
  { region: "EMEA", country: "Italy", account: "Unieuro", quarter: "Q1", year: 2025, period: "Q1 2025", score: 94, artwork: 9, fmv: 187092, attributionLoss: 11225.5, attributionGain: 175866.48, topAccount: "NO", logo: 1, badge: 0.955, textMention: 0.824, keyVisuals: 1 },
  { region: "EMEA", country: "Nordics", account: "Elkjop", quarter: "Q1", year: 2025, period: "Q1 2025", score: 91, artwork: 3, fmv: 268912, attributionLoss: 24202.1, attributionGain: 244709.92, topAccount: "YES", logo: 1, badge: 1, textMention: 0.666, keyVisuals: 1 },
  { region: "EMEA", country: "UK", account: "Currys Group", quarter: "Q1", year: 2025, period: "Q1 2025", score: 88, artwork: 7, fmv: 801250, attributionLoss: 96150, attributionGain: 705100, topAccount: "YES", logo: null, badge: 0.942, textMention: 0.699, keyVisuals: 1 },
  { region: "LATAM", country: "Brazil", account: "Magazine Luiza", quarter: "Q1", year: 2025, period: "Q1 2025", score: 93, artwork: 24, fmv: 639005, attributionLoss: 44730.4, attributionGain: 594274.65, topAccount: "YES", logo: 0.949, badge: 0.858, textMention: 0.949, keyVisuals: 1 },
  { region: "LATAM", country: "Brazil", account: "Mercado Livre", quarter: "Q1", year: 2025, period: "Q1 2025", score: 88, artwork: 11, fmv: 766367, attributionLoss: 91964, attributionGain: 674402.96, topAccount: "YES", logo: 0.909, badge: 0.872, textMention: 0.745, keyVisuals: 1 },
  { region: "LATAM", country: "Colombia", account: "Alkosto", quarter: "Q1", year: 2025, period: "Q1 2025", score: 96, artwork: 12, fmv: 768989, attributionLoss: 30759.6, attributionGain: 738229.44, topAccount: "NO", logo: 0.966, badge: 0.983, textMention: 0.916, keyVisuals: 1 },
  { region: "LATAM", country: "Mexico", account: "Liverpool", quarter: "Q1", year: 2025, period: "Q1 2025", score: 86, artwork: 2, fmv: 120000, attributionLoss: 16800, attributionGain: 103200, topAccount: "NO", logo: 0.8, badge: 0.8, textMention: null, keyVisuals: 1 },
  { region: "LATAM", country: "Peru", account: "Falabella", quarter: "Q1", year: 2025, period: "Q1 2025", score: 94, artwork: 9, fmv: 29898, attributionLoss: 1793.9, attributionGain: 28104.12, topAccount: "NO", logo: 0.899, badge: 1, textMention: 0.899, keyVisuals: 1 },

  // ── 2024 Q3 ─────────────────────────────────────────────────────────────
  { region: "APJ", country: "Australia", account: "Harvey Norman", quarter: "Q3", year: 2024, period: "Q3 2024", score: 97, artwork: 13, fmv: 395300, attributionLoss: 11859, attributionGain: 383441, topAccount: "YES", logo: 1, badge: 0.938, textMention: 0.949, keyVisuals: 1 },
  { region: "APJ", country: "Australia", account: "JB HiFi", quarter: "Q3", year: 2024, period: "Q3 2024", score: 97, artwork: 5, fmv: 548700, attributionLoss: 16461, attributionGain: 532239, topAccount: "YES", logo: 1, badge: 1, textMention: 0.92, keyVisuals: 1 },
  { region: "APJ", country: "Australia", account: "OfficeWorks", quarter: "Q3", year: 2024, period: "Q3 2024", score: 97, artwork: 5, fmv: 237000, attributionLoss: 7110, attributionGain: 229890, topAccount: "YES", logo: null, badge: 0.959, textMention: 0.959, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Amazon", quarter: "Q3", year: 2024, period: "Q3 2024", score: 89, artwork: 13, fmv: 2165800, attributionLoss: 238238, attributionGain: 1927562, topAccount: "YES", logo: 1, badge: 0.983, textMention: 0.583, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Clicktech", quarter: "Q3", year: 2024, period: "Q3 2024", score: 88, artwork: 13, fmv: 464700, attributionLoss: 55764, attributionGain: 408936, topAccount: "NO", logo: null, badge: 0.984, textMention: 0.661, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Croma", quarter: "Q3", year: 2024, period: "Q3 2024", score: 91, artwork: 9, fmv: 237000, attributionLoss: 21330, attributionGain: 215670, topAccount: "NO", logo: 0.875, badge: 0.911, textMention: 0.888, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Flipkart", quarter: "Q3", year: 2024, period: "Q3 2024", score: 89, artwork: 19, fmv: 4893676, attributionLoss: 538304.4, attributionGain: 4355371.64, topAccount: "YES", logo: 0.939, badge: 0.978, textMention: 0.663, keyVisuals: 0.984 },
  { region: "APJ", country: "India", account: "Reliance Digital", quarter: "Q3", year: 2024, period: "Q3 2024", score: 87, artwork: 13, fmv: 295000, attributionLoss: 38350, attributionGain: 256650, topAccount: "NO", logo: 0.779, badge: 0.923, textMention: 0.846, keyVisuals: 0.943 },
  { region: "APJ", country: "Indonesia", account: "Agres", quarter: "Q3", year: 2024, period: "Q3 2024", score: 82, artwork: 19, fmv: 354000, attributionLoss: 63720, attributionGain: 290280, topAccount: "YES", logo: 1, badge: 0.694, textMention: 0.6, keyVisuals: 1 },
  { region: "APJ", country: "Japan", account: "Yodobashi", quarter: "Q3", year: 2024, period: "Q3 2024", score: 77, artwork: 7, fmv: 1815400, attributionLoss: 417542, attributionGain: 1397858, topAccount: "YES", logo: 1, badge: 0.857, textMention: 0.228, keyVisuals: 1 },
  { region: "APJ", country: "South Korea", account: "Coupang", quarter: "Q3", year: 2024, period: "Q3 2024", score: 93, artwork: 13, fmv: 449800, attributionLoss: 31486, attributionGain: 418314, topAccount: "YES", logo: 1, badge: 0.953, textMention: 0.769, keyVisuals: 1 },
  { region: "APJ", country: "South Korea", account: "G-Market", quarter: "Q3", year: 2024, period: "Q3 2024", score: 92, artwork: 19, fmv: 455400, attributionLoss: 36432, attributionGain: 418968, topAccount: "YES", logo: 0.952, badge: 0.947, textMention: 0.821, keyVisuals: 1 },
  { region: "APJ", country: "Thailand", account: "Advice", quarter: "Q3", year: 2024, period: "Q3 2024", score: 91, artwork: 13, fmv: 159000, attributionLoss: 14310, attributionGain: 144690, topAccount: "NO", logo: 0.981, badge: 0.861, textMention: 0.8, keyVisuals: 1 },
  { region: "APJ", country: "Vietnam", account: "Mobile World", quarter: "Q3", year: 2024, period: "Q3 2024", score: 98, artwork: 7, fmv: 560000, attributionLoss: 11200, attributionGain: 548800, topAccount: "YES", logo: 1, badge: 1, textMention: 0.942, keyVisuals: 1 },
  { region: "EMEA", country: "France", account: "Boulanger", quarter: "Q3", year: 2024, period: "Q3 2024", score: 83, artwork: 3, fmv: 202399, attributionLoss: 34407.8, attributionGain: 167991.17, topAccount: "YES", logo: 1, badge: 1, textMention: 0.333, keyVisuals: 1 },
  { region: "EMEA", country: "Germany", account: "Notebooksbillger", quarter: "Q3", year: 2024, period: "Q3 2024", score: 87, artwork: 2, fmv: 447000, attributionLoss: 58110, attributionGain: 388890, topAccount: "YES", logo: 1, badge: 1, textMention: 0.5, keyVisuals: 1 },
  { region: "EMEA", country: "UK", account: "Currys Group", quarter: "Q3", year: 2024, period: "Q3 2024", score: 98, artwork: 5, fmv: 1185000, attributionLoss: 23700, attributionGain: 1161300, topAccount: "YES", logo: 1, badge: 1, textMention: 0.949, keyVisuals: 1 },
  { region: "LATAM", country: "Brazil", account: "Magazine Luiza", quarter: "Q3", year: 2024, period: "Q3 2024", score: 85, artwork: 15, fmv: 1013928, attributionLoss: 152089.2, attributionGain: 861838.8, topAccount: "YES", logo: 0.883, badge: 0.769, textMention: 0.879, keyVisuals: 0.891 },
  { region: "LATAM", country: "Brazil", account: "Mercado Livre", quarter: "Q3", year: 2024, period: "Q3 2024", score: 94, artwork: 14, fmv: 802414, attributionLoss: 48144.8, attributionGain: 754269.16, topAccount: "YES", logo: 0.966, badge: 0.909, textMention: 0.899, keyVisuals: 1 },
  { region: "LATAM", country: "Colombia", account: "Alkosto", quarter: "Q3", year: 2024, period: "Q3 2024", score: 86, artwork: 15, fmv: 913500, attributionLoss: 127890, attributionGain: 785610, topAccount: "NO", logo: 0.8, badge: 0.8, textMention: 0.861, keyVisuals: 1 },

  // ── 2024 Q2 ─────────────────────────────────────────────────────────────
  { region: "APJ", country: "Australia", account: "Harvey Norman", quarter: "Q2", year: 2024, period: "Q2 2024", score: 93, artwork: 13, fmv: 400900, attributionLoss: 28063, attributionGain: 372837, topAccount: "YES", logo: 0.899, badge: 0.923, textMention: 0.938, keyVisuals: 1 },
  { region: "APJ", country: "Australia", account: "JB HiFi", quarter: "Q2", year: 2024, period: "Q2 2024", score: 91, artwork: 6, fmv: 520600, attributionLoss: 46854, attributionGain: 473746, topAccount: "YES", logo: 1, badge: 0.833, textMention: 0.833, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Amazon", quarter: "Q2", year: 2024, period: "Q2 2024", score: 96, artwork: 15, fmv: 436000, attributionLoss: 17440, attributionGain: 418560, topAccount: "YES", logo: 1, badge: 0.928, textMention: 0.946, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Flipkart", quarter: "Q2", year: 2024, period: "Q2 2024", score: 99, artwork: 16, fmv: 1563446, attributionLoss: 15634.5, attributionGain: 1547811.54, topAccount: "YES", logo: null, badge: 1, textMention: 0.987, keyVisuals: 1 },
  { region: "APJ", country: "Indonesia", account: "Agres", quarter: "Q2", year: 2024, period: "Q2 2024", score: 86, artwork: 19, fmv: 223700, attributionLoss: 31318, attributionGain: 192382, topAccount: "YES", logo: 0.952, badge: 0.777, textMention: 0.736, keyVisuals: 0.986 },
  { region: "EMEA", country: "France", account: "FNAC", quarter: "Q2", year: 2024, period: "Q2 2024", score: 82, artwork: 5, fmv: 90000, attributionLoss: 16200, attributionGain: 73800, topAccount: "YES", logo: null, badge: 1, textMention: 0.479, keyVisuals: 1 },
  { region: "EMEA", country: "Germany", account: "Cyberport", quarter: "Q2", year: 2024, period: "Q2 2024", score: 87, artwork: 5, fmv: 197000, attributionLoss: 25610, attributionGain: 171390, topAccount: "NO", logo: 1, badge: 0.759, textMention: 0.759, keyVisuals: 1 },
  { region: "LATAM", country: "Brazil", account: "Magazine Luiza", quarter: "Q2", year: 2024, period: "Q2 2024", score: 99, artwork: 17, fmv: 616894, attributionLoss: 6168.9, attributionGain: 610725.06, topAccount: "YES", logo: 1, badge: 1, textMention: 1, keyVisuals: 0.982 },
  { region: "LATAM", country: "Brazil", account: "Mercado Livre", quarter: "Q2", year: 2024, period: "Q2 2024", score: 84, artwork: 19, fmv: 686721, attributionLoss: 109875.4, attributionGain: 576845.64, topAccount: "YES", logo: 0.687, badge: 0.964, textMention: 0.726, keyVisuals: 0.986 },
  { region: "LATAM", country: "Colombia", account: "Alkosto", quarter: "Q2", year: 2024, period: "Q2 2024", score: 90, artwork: 5, fmv: 650219, attributionLoss: 65021.9, attributionGain: 585197.1, topAccount: "NO", logo: 1, badge: 1, textMention: 0.6, keyVisuals: 1 },

  // ── 2024 Q1 ─────────────────────────────────────────────────────────────
  { region: "APJ", country: "Australia", account: "Harvey Norman", quarter: "Q1", year: 2024, period: "Q1 2024", score: 97, artwork: 13, fmv: 212700, attributionLoss: 6381, attributionGain: 206319, topAccount: "YES", logo: 1, badge: 0.984, textMention: 0.923, keyVisuals: 1 },
  { region: "APJ", country: "Australia", account: "JB HiFi", quarter: "Q1", year: 2024, period: "Q1 2024", score: 93, artwork: 9, fmv: 420400, attributionLoss: 29428, attributionGain: 390972, topAccount: "YES", logo: 1, badge: 1, textMention: 0.755, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Amazon", quarter: "Q1", year: 2024, period: "Q1 2024", score: 99, artwork: 24, fmv: 256000, attributionLoss: 2560, attributionGain: 253440, topAccount: "YES", logo: 1, badge: 1, textMention: 0.973, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Flipkart", quarter: "Q1", year: 2024, period: "Q1 2024", score: 99, artwork: 14, fmv: 730578, attributionLoss: 7305.8, attributionGain: 723272.22, topAccount: "YES", logo: 1, badge: 1, textMention: 0.971, keyVisuals: 1 },
  { region: "EMEA", country: "Germany", account: "Cyberport", quarter: "Q1", year: 2024, period: "Q1 2024", score: 70, artwork: 4, fmv: 222500, attributionLoss: 66750, attributionGain: 155750, topAccount: "NO", logo: 1, badge: 0.333, textMention: 0.5, keyVisuals: 1 },
  { region: "EMEA", country: "UK", account: "Currys Group", quarter: "Q1", year: 2024, period: "Q1 2024", score: 96, artwork: 6, fmv: 935000, attributionLoss: 37400, attributionGain: 897600, topAccount: "YES", logo: 1, badge: 1, textMention: 0.866, keyVisuals: 1 },
  { region: "LATAM", country: "Brazil", account: "Mercado Livre", quarter: "Q1", year: 2024, period: "Q1 2024", score: 97, artwork: 26, fmv: 665140, attributionLoss: 19954.2, attributionGain: 645185.8, topAccount: "YES", logo: 0.971, badge: 0.961, textMention: 0.969, keyVisuals: 1 },
  { region: "LATAM", country: "Colombia", account: "Alkosto", quarter: "Q1", year: 2024, period: "Q1 2024", score: 100, artwork: 21, fmv: 699377, attributionLoss: 0, attributionGain: 699377, topAccount: "NO", logo: 1, badge: 1, textMention: 1, keyVisuals: 1 },

  // ── 2023 Q4 ─────────────────────────────────────────────────────────────
  { region: "APJ", country: "Australia", account: "Harvey Norman", quarter: "Q4", year: 2023, period: "Q4 2023", score: 99, artwork: 11, fmv: 492500, attributionLoss: 4925, attributionGain: 487575, topAccount: "YES", logo: 1, badge: 0.98, textMention: 0.96, keyVisuals: 1.01 },
  { region: "APJ", country: "Australia", account: "JB HiFi", quarter: "Q4", year: 2023, period: "Q4 2023", score: 92, artwork: 9, fmv: 800000, attributionLoss: 64000, attributionGain: 736000, topAccount: "YES", logo: 0.97, badge: 0.86, textMention: 0.84, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Flipkart", quarter: "Q4", year: 2023, period: "Q4 2023", score: 94, artwork: 22, fmv: 6735143, attributionLoss: 404108.6, attributionGain: 6331034.42, topAccount: "YES", logo: 1, badge: 0.91, textMention: 0.87, keyVisuals: 1 },
  { region: "APJ", country: "India", account: "Amazon", quarter: "Q4", year: 2023, period: "Q4 2023", score: 93, artwork: 14, fmv: 1153650, attributionLoss: 80755.5, attributionGain: 1072894.5, topAccount: "YES", logo: 1, badge: 0.87, textMention: 0.87, keyVisuals: 1 },
  { region: "EMEA", country: "France", account: "Boulanger", quarter: "Q4", year: 2023, period: "Q4 2023", score: 41, artwork: 4, fmv: 632000, attributionLoss: 372880, attributionGain: 259120, topAccount: "YES", logo: null, badge: 0.46, textMention: 0.44, keyVisuals: 0.33 },
  { region: "EMEA", country: "UK", account: "Currys Group", quarter: "Q4", year: 2023, period: "Q4 2023", score: 96, artwork: 6, fmv: 1484686, attributionLoss: 59387.4, attributionGain: 1425298.56, topAccount: "YES", logo: 1, badge: 0.95, textMention: 0.89, keyVisuals: 1 },
  { region: "LATAM", country: "Brazil", account: "Mercado Livre", quarter: "Q4", year: 2023, period: "Q4 2023", score: 97, artwork: 17, fmv: 969988, attributionLoss: 29099.6, attributionGain: 940888.36, topAccount: "YES", logo: 1, badge: 0.98, textMention: 0.9, keyVisuals: 1 },

  // ── 2023 Q3 ─────────────────────────────────────────────────────────────
  { region: "APJ", country: "Australia", account: "Harvey Norman", quarter: "Q3", year: 2023, period: "Q3 2023", score: 100, artwork: 9, fmv: 3847000, attributionLoss: 0, attributionGain: 3847000, topAccount: "YES", logo: 1, badge: 0.98, textMention: 1, keyVisuals: 1.09 },
  { region: "APJ", country: "India", account: "Clicktech", quarter: "Q3", year: 2023, period: "Q3 2023", score: 91, artwork: 6, fmv: 1800000, attributionLoss: 162000, attributionGain: 1638000, topAccount: "NO", logo: null, badge: 0.73, textMention: 1, keyVisuals: 1 },
  { region: "EMEA", country: "France", account: "Boulanger", quarter: "Q3", year: 2023, period: "Q3 2023", score: 93, artwork: 3, fmv: 235545, attributionLoss: 16488.2, attributionGain: 219056.9, topAccount: "YES", logo: null, badge: 1, textMention: 0.87, keyVisuals: 0.92 },
  { region: "LATAM", country: "Brazil", account: "Magazine Luiza", quarter: "Q3", year: 2023, period: "Q3 2023", score: 97, artwork: 36, fmv: 726472, attributionLoss: 21794.2, attributionGain: 704677.8, topAccount: "YES", logo: 0.98, badge: 0.959, textMention: 0.98, keyVisuals: 0.99 },
];

export const AVAILABLE_PERIODS = [
  "All Quarters",
  "Q4 2026",
  "Q3 2026",
  "Q2 2026",
  "Q1 2026",
  "Q4 2025",
  "Q3 2025",
  "Q2 2025",
  "Q1 2025",
  "Q4 2024",
  "Q3 2024",
  "Q2 2024",
  "Q1 2024",
  "Q4 2023",
  "Q3 2023",
  "Q2 2023",
  "Q1 2023",
  "Q4 2022",
  "Q3 2022",
  "Q2 2022",
  "Q1 2022",
];

export const ALL_COUNTRIES = [
  "All Countries",
  "Australia",
  "Brazil",
  "Canada",
  "Chile",
  "Colombia",
  "Egypt",
  "France",
  "Germany",
  "India",
  "Indonesia",
  "Italy",
  "Japan",
  "Malaysia",
  "Mexico",
  "Netherlands",
  "New Zealand",
  "Nordics",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Saudi Arabia",
  "South Korea",
  "Spain",
  "Taiwan",
  "Thailand",
  "Turkey",
  "UAE",
  "UK",
  "Vietnam",
];
