import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, FileText, Clock, Check, X } from "lucide-react";

interface Score {
  id: string;
  tool: string;
  subtest: string;
  standardScore: number;
  scaleType: 'Z' | 'S10' | 'S100';
  notes: string;
  domain?: 'cognitive' | 'didactic' | 'emotional';
  strength?: boolean;
}

interface Observation {
  id: string;
  content: string;
  timestamp: string;
}

interface Recommendation {
  id: string;
  title: string;
  selected: boolean;
}

interface CHCAbility {
  id: string;
  code: string;
  name: string;
  hebrewName: string;
  description: string;
}

interface XBATest {
  id: string;
  abilityId: string;
  testName: string;
  subtest: string;
  standardScore: number;
  notes: string;
  sourceScoreId?: string; // Reference to original score if selected from existing tests
}

interface CHCPassage {
  abilityId: string;
  selectedSentences: string[];
  customText?: string;
}

interface SentenceOption {
  id: string;
  text: string;
  category: 'strength' | 'weakness' | 'average' | 'observation';
}

const diagnosticTools = [
  "WISC-V",
  "WAIS-IV", 
  "מבחן וודקוק-ג'ונסון",
  "NEPSY-II",
  "מבחן אליה",
  "VMI",
  "TOVA",
  "CPT-3",
  "מבחן כתיבה",
  "מבחן חשבון",
  "מבחן קריאה",
  "אבחון מודעות פונולוגית",
  "Test of Variables of Attention",
  "Rey Complex Figure",
  "Tower of London",
  "Wisconsin Card Sorting Test"
];

const commonRecommendations = [
  { id: "1", title: "מתן זמן נוסף במבחנים", selected: false },
  { id: "2", title: "הגדלת גופן בחומרי למידה", selected: false },
  { id: "3", title: "חלוקת מטלות למקטעים קצרים", selected: false },
  { id: "4", title: "מתן הפסקות תכופות", selected: false },
  { id: "5", title: "שימוש בעזרים טכנולוגיים", selected: false },
  { id: "6", title: "ישיבה בקרבת המורה", selected: false },
  { id: "7", title: "מתן הוראות בכתב ובעל פה", selected: false },
  { id: "8", title: "פיתוח אסטרטגיות למידה", selected: false },
  { id: "9", title: "שיפור מיומנויות ארגון", selected: false },
  { id: "10", title: "טיפול באמצעות משחק", selected: false }
];

const chcAbilities: CHCAbility[] = [
  {
    id: "gf",
    code: "Gf",
    name: "Fluid Intelligence",
    hebrewName: "אינטליגנציה נוזלית",
    description: "יכולת להשתמש בהיגיון כדי לפתור בעיות חדשות ולהבין קשרים"
  },
  {
    id: "gc",
    code: "Gc",
    name: "Crystallized Intelligence",
    hebrewName: "אינטליגנציה גבישית",
    description: "ידע נרכש ומיומנויות מילוליות"
  },
  {
    id: "gv",
    code: "Gv",
    name: "Visual Processing",
    hebrewName: "עיבוד חזותי",
    description: "יכולת לתפוס, לנתח ולחשוב באמצעות דפוסים חזותיים"
  },
  {
    id: "ga",
    code: "Ga",
    name: "Auditory Processing",
    hebrewName: "עיבוד שמיעתי",
    description: "יכולת לנתח ולסנתז מידע שמיעתי"
  },
  {
    id: "gs",
    code: "Gs",
    name: "Processing Speed",
    hebrewName: "מהירות עיבוד",
    description: "יכולת לביצוע מהיר של משימות קוגניטיביות אוטומטיות"
  },
  {
    id: "gsm",
    code: "Gsm",
    name: "Short-term Memory",
    hebrewName: "זיכרון קצר מדי",
    description: "יכולת לשמור ולתפעל מידע בזיכרון לזמן קצר"
  },
  {
    id: "glr",
    code: "Glr",
    name: "Long-term Retrieval",
    hebrewName: "שליפה מזיכרון ארוך מדי",
    description: "יכולת לאחסן ולשלוף מידע מהזיכרון ארוך המדי"
  },
  {
    id: "gq",
    code: "Gq",
    name: "Quantitative Knowledge",
    hebrewName: "ידע כמותי",
    description: "ידע מתמטי ויכולת לפתור בעיות מתמטיות"
  },
  {
    id: "grw",
    code: "Grw",
    name: "Reading/Writing",
    hebrewName: "קריאה וכתיבה",
    description: "מיומנויות בסיסיות בקריאה וכתיבה"
  }
];

// Sentence bank for CHC ability passages
const chcSentenceBanks: Record<string, SentenceOption[]> = {
  gf: [ // Fluid Intelligence
    { id: "gf_s1", text: "הילד מפגין יכולת מעולה בפתרון בעיות חדשות ולא מוכרות", category: "strength" },
    { id: "gf_s2", text: "מפגין גמישות קוגניטיביות בגישה לבעיות מורכבות", category: "strength" },
    { id: "gf_s3", text: "מסוגל לזהות דפוסים והקבלות בצורה מהירה ויעילה", category: "strength" },
    { id: "gf_s4", text: "מפגין יכולת חשיבה אבסטרקטית ברמה גבוהה", category: "strength" },
    { id: "gf_w1", text: "מתקשה בפתרון בעיות הדורשות חשיבה מופשטת", category: "weakness" },
    { id: "gf_w2", text: "נדרש זמן רב לזיהוי דפוסים והקבלות", category: "weakness" },
    { id: "gf_w3", text: "מתקשה בהכללה ויישום עקרונות על מצבים חדשים", category: "weakness" },
    { id: "gf_w4", text: "מפגין קשיחות קוגניטיבית בגישה לבעיות", category: "weakness" },
    { id: "gf_a1", text: "מפגין יכולות חשיבה נוזלית ברמה ממוצעת לגילו", category: "average" },
    { id: "gf_a2", text: "מסוגל לפתור בעיות בסיסיות הדורשות הנמקה לוגית", category: "average" },
    { id: "gf_o1", text: "נמצא מרוכז ומתמיד במהלך ביצוע משימות הדורשות חשיבה", category: "observation" },
    { id: "gf_o2", text: "מפגין סקרנות ומעוניין לחקור פתרונות חלופיים", category: "observation" }
  ],
  gc: [ // Crystallized Intelligence
    { id: "gc_s1", text: "הילד מפגין אוצר מילים עשיר ומגוון", category: "strength" },
    { id: "gc_s2", text: "מפגין ידע כללי רחב ומעמיק בתחומים שונים", category: "strength" },
    { id: "gc_s3", text: "מסוגל להסביר מושגים מורכבים בבהירות", category: "strength" },
    { id: "gc_s4", text: "מפגין הבנה מעמיקה של קשרים סיבתיים", category: "strength" },
    { id: "gc_w1", text: "מפגין אוצר מילים מוגבל לגילו", category: "weakness" },
    { id: "gc_w2", text: "מתקשה בהבנת מושגים מופשטים", category: "weakness" },
    { id: "gc_w3", text: "מפגין חוסר בידע כללי בתחומים שונים", category: "weakness" },
    { id: "gc_w4", text: "מתקשה בהסבר והבעה מילולית של רעיונות", category: "weakness" },
    { id: "gc_a1", text: "מפגין ידע מילולי ברמה ממוצעת לגילו", category: "average" },
    { id: "gc_a2", text: "מסוגל להבין ולהשתמש במילים בהקשר מתאים", category: "average" },
    { id: "gc_o1", text: "מפגין עניין בלמידה ורכישת ידע חדש", category: "observation" },
    { id: "gc_o2", text: "משתמש בשפה בצורה מדויקת ומתאימה", category: "observation" }
  ],
  gv: [ // Visual Processing
    { id: "gv_s1", text: "הילד מפגין יכולות עיבוד חזותי מעולות", category: "strength" },
    { id: "gv_s2", text: "מסוגל לזהות פרטים חזותיים דקים במהירות", category: "strength" },
    { id: "gv_s3", text: "מפגין יכולת מרחבית מפותחת", category: "strength" },
    { id: "gv_s4", text: "מצליח במשימות הדורשות ויזואליזציה מנטלית", category: "strength" },
    { id: "gv_w1", text: "מתקשה בעיבוד מידע חזותי מורכב", category: "weakness" },
    { id: "gv_w2", text: "מפגין קשיים באוריינטציה מרחבית", category: "weakness" },
    { id: "gv_w3", text: "מתקשה בזיהוי קשרים חזותיים", category: "weakness" },
    { id: "gv_w4", text: "נדרש זמן רב לעיבוד מידע ויזואלי", category: "weakness" },
    { id: "gv_a1", text: "מפגין יכולות עיבוד חזותי ברמה ממוצעת", category: "average" },
    { id: "gv_a2", text: "מסוגל לבצע משימות חזותיות בסיסיות", category: "average" },
    { id: "gv_o1", text: "מתרכז היטב במשימות חזותיות", category: "observation" },
    { id: "gv_o2", text: "מפגין דיוק בביצוע משימות הדורשות תשומת לב לפרטים", category: "observation" }
  ],
  ga: [ // Auditory Processing
    { id: "ga_s1", text: "הילד מפגין יכולות עיבוד שמיעתי מעולות", category: "strength" },
    { id: "ga_s2", text: "מסוגל להבחין בין צלילים דומים בקלות", category: "strength" },
    { id: "ga_s3", text: "מפגין זיכרון שמיעתי חזק", category: "strength" },
    { id: "ga_s4", text: "מצליח בעיבוד מידע שמיעתי מורכב", category: "strength" },
    { id: "ga_w1", text: "מתקשה בעיבוד מידע שמיעתי", category: "weakness" },
    { id: "ga_w2", text: "מפגין קשיים בהבחנה בין צלילים", category: "weakness" },
    { id: "ga_w3", text: "נדרש חזרה על הוראות שמיעתיות", category: "weakness" },
    { id: "ga_w4", text: "מתקשה בסביבה רועשת", category: "weakness" },
    { id: "ga_a1", text: "מפגין יכולות עיבוד שמיעתי ברמה ממוצעת", category: "average" },
    { id: "ga_a2", text: "מסוגל לעבד מידע שמיעתי פשוט", category: "average" },
    { id: "ga_o1", text: "מקשיב בתשומת לב להוראות", category: "observation" },
    { id: "ga_o2", text: "מגיב בצורה מתאימה לגירויים שמיעתיים", category: "observation" }
  ],
  gs: [ // Processing Speed
    { id: "gs_s1", text: "הילד מפגין מהירות עיבוד מעולה", category: "strength" },
    { id: "gs_s2", text: "מבצע משימות אוטומטיות במהירות רבה", category: "strength" },
    { id: "gs_s3", text: "מפגין יעילות גבוהה במשימות זמן", category: "strength" },
    { id: "gs_s4", text: "מסוגל לעבד מידע בקצב מהיר", category: "strength" },
    { id: "gs_w1", text: "מפגין מהירות עיבוד איטית", category: "weakness" },
    { id: "gs_w2", text: "נדרש זמן רב להשלמת משימות", category: "weakness" },
    { id: "gs_w3", text: "מתקשה במשימות הדורשות מהירות", category: "weakness" },
    { id: "gs_w4", text: "מפגין איטיות בעיבוד מידע אוטומטי", category: "weakness" },
    { id: "gs_a1", text: "מפגין מהירות עיבוד ברמה ממוצעת", category: "average" },
    { id: "gs_a2", text: "מסוגל לבצע משימות בקצב סביר", category: "average" },
    { id: "gs_o1", text: "עובד בקצב יציב ועקבי", category: "observation" },
    { id: "gs_o2", text: "מפגין סבלנות במשימות ארוכות", category: "observation" }
  ],
  gsm: [ // Short-term Memory
    { id: "gsm_s1", text: "הילד מפגין זיכרון עבודה מעולה", category: "strength" },
    { id: "gsm_s2", text: "מסוגל לזכור רצפים ארוכים של מידע", category: "strength" },
    { id: "gsm_s3", text: "מפגין יכולת לתפעל מידע בזיכרון", category: "strength" },
    { id: "gsm_s4", text: "מצליח במשימות הדורשות זיכרון קצר מדי", category: "strength" },
    { id: "gsm_w1", text: "מפגין קשיים בזיכרון קצר מדי", category: "weakness" },
    { id: "gsm_w2", text: "מתקשה לזכור הוראות מורכבות", category: "weakness" },
    { id: "gsm_w3", text: "נדרש חזרות לזכירת מידע", category: "weakness" },
    { id: "gsm_w4", text: "מתקשה לתפעל מידע בזיכרון", category: "weakness" },
    { id: "gsm_a1", text: "מפגין יכולות זיכרון עבודה ברמה ממוצעת", category: "average" },
    { id: "gsm_a2", text: "מסוגל לזכור מידע פשוט לזמן קצר", category: "average" },
    { id: "gsm_o1", text: "מתרכז במשימות הדורשות זיכרון", category: "observation" },
    { id: "gsm_o2", text: "משתמש באסטרטגיות זכירה", category: "observation" }
  ],
  glr: [ // Long-term Retrieval
    { id: "glr_s1", text: "הילד מפגין יכולת שליפה מעולה מהזיכרון", category: "strength" },
    { id: "glr_s2", text: "מסוגל לזכור מידע שנלמד בעבר", category: "strength" },
    { id: "glr_s3", text: "מפגין זיכרון אסוציאטיבי חזק", category: "strength" },
    { id: "glr_s4", text: "מצליח בלמידה ושמירה לטווח ארוך", category: "strength" },
    { id: "glr_w1", text: "מתקשה בשליפת מידע מהזיכרון", category: "weakness" },
    { id: "glr_w2", text: "מפגין קשיים בזכירת מידע שנלמד", category: "weakness" },
    { id: "glr_w3", text: "נדרש תזכורות לשליפת מידע", category: "weakness" },
    { id: "glr_w4", text: "מתקשה ביצירת קשרים בזיכרון", category: "weakness" },
    { id: "glr_a1", text: "מפגין יכולות שליפה ברמה ממוצעת", category: "average" },
    { id: "glr_a2", text: "מסוגל לזכור מידע בסיסי", category: "average" },
    { id: "glr_o1", text: "מפגין מאמץ בשליפת מידע", category: "observation" },
    { id: "glr_o2", text: "משתמש ברמזים לעזרה בזכירה", category: "observation" }
  ],
  gq: [ // Quantitative Knowledge
    { id: "gq_s1", text: "הילד מפגין יכולות מתמטיות מעולות", category: "strength" },
    { id: "gq_s2", text: "מסוגל לפתור בעיות מתמטיות מורכבות", category: "strength" },
    { id: "gq_s3", text: "מפגין הבנה מעמיקה של מושגים מתמטיים", category: "strength" },
    { id: "gq_s4", text: "מצליח בחשיבה כמותית ולוגית", category: "strength" },
    { id: "gq_w1", text: "מתקשה בפתרון בעיות מתמטיות", category: "weakness" },
    { id: "gq_w2", text: "מפגין קשיים בהבנת מושגים כמותיים", category: "weakness" },
    { id: "gq_w3", text: "נדרש עזרה בחישובים בסיסיים", category: "weakness" },
    { id: "gq_w4", text: "מתקשה ביישום כללים מתמטיים", category: "weakness" },
    { id: "gq_a1", text: "מפגין יכולות מתמטיות ברמה ממוצעת", category: "average" },
    { id: "gq_a2", text: "מסוגל לבצע חישובים בסיסיים", category: "average" },
    { id: "gq_o1", text: "מפגין מתמדה במשימות מתמטיות", category: "observation" },
    { id: "gq_o2", text: "מנסה גישות שונות לפתרון בעיות", category: "observation" }
  ],
  grw: [ // Reading/Writing
    { id: "grw_s1", text: "הילד מפגין כישורי קריאה וכתיבה מעולים", category: "strength" },
    { id: "grw_s2", text: "מסוגל לקרוא טקסטים מורכבים בהבנה", category: "strength" },
    { id: "grw_s3", text: "מפגין כישורי כתיבה מפותחים", category: "strength" },
    { id: "grw_s4", text: "מצליח במשימות הדורשות הבנת הנקרא", category: "strength" },
    { id: "grw_w1", text: "מתקשה בקריאה שוטפת", category: "weakness" },
    { id: "grw_w2", text: "מפגין קשיים בהבנת הנקרא", category: "weakness" },
    { id: "grw_w3", text: "נדרש עזרה בכתיבה", category: "weakness" },
    { id: "grw_w4", text: "מתקשה בפענוח מילים", category: "weakness" },
    { id: "grw_a1", text: "מפגין כישורי קריאה וכתיבה ברמה ממוצעת", category: "average" },
    { id: "grw_a2", text: "מסוגל לקרוא טקסטים פשוטים", category: "average" },
    { id: "grw_o1", text: "מפגין עניין בקריאה", category: "observation" },
    { id: "grw_o2", text: "עובד בהתמדה על שיפור הכתיבה", category: "observation" }
  ]
};

// Example passages for each CHC ability
const examplePassages: Record<string, string> = {
  gf: "הילד מפגין יכולת מעולה בפתרון בעיות חדשות ולא מוכרות. מפגין גמישות קוגניטיביות בגישה לבעיות מורכבות ומסוגל לזהות דפוסים והקבלות בצורה מהירה ויעילה. נמצא מרוכז ומתמיד במהלך ביצוע משימות הדורשות חשיבה.",
  gc: "הילד מפגין אוצר מילים עשיר ומגוון ומסוגל להסביר מושגים מורכבים בבהירות. מפגין ידע כללי רחב ומעמיק בתחומים שונים ומפגין עניין בלמידה ורכישת ידע חדש.",
  gv: "הילד מפגין יכולות עיבוד חזותי מעולות ומסוגל לזהות פרטים חזותיים דקים במהירות. מפגין יכולת מרחבית מפותחת ומתרכז היטב במשימות חזותיות.",
  ga: "הילד מפגין יכולות עיבוד שמיעתי מעולות ומסוגל להבחין בין צלילים דומים בקלות. מקשיב בתשומת לב להוראות ומגיב בצורה מתאימה לגירויים שמיעתיים.",
  gs: "הילד מפגין מהירות עיבוד מעולה ומבצע משימות אוטומטיות במהירות רבה. עובד בקצב יציב ועקבי ומפגין יעילות גבוהה במשימות זמן.",
  gsm: "הילד מפגין זיכרון עבודה מעולה ומסוגל לזכור רצפים ארוכים של מידע. מתרכז במשימות הדורשות זיכרון ומשתמש באסטרטגיות זכירה.",
  glr: "הילד מפגין יכולת שליפה מעולה מהזיכרון ומסוגל לזכור מידע שנלמד בעבר. מפגין זיכרון אסוציאטיבי חזק ומפגין מאמץ בשליפת מידע.",
  gq: "הילד מפגין יכולות מתמטיות מעולות ומסוגל לפתור בעיות מתמטיות מורכבות. מפגין הבנה מעמיקה של מושגים מתמטיים ומפגין מתמדה במשימות מתמטיות.",
  grw: "הילד מפגין כישורי קריאה וכתיבה מעולים ומסוגל לקרוא טקסטים מורכבים בהבנה. מפגין כישורי כתיבה מפותחים ומפגין עניין בקריאה."
};


const AssessmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [scores, setScores] = useState<Score[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(commonRecommendations);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [newScore, setNewScore] = useState<{
    tool: string;
    subtest: string;
    standardScore: string;
    scaleType: 'Z' | 'S10' | 'S100';
    notes: string;
  }>({
    tool: "",
    subtest: "",
    standardScore: "",
    scaleType: "S100",
    notes: ""
  });
  const [newObservation, setNewObservation] = useState("");
  const [customRecommendation, setCustomRecommendation] = useState("");
  const [xbaTests, setXbaTests] = useState<XBATest[]>([]);
  const [newXbaTest, setNewXbaTest] = useState<{
    abilityId: string;
    testName: string;
    subtest: string;
    standardScore: string;
    notes: string;
  }>({
    abilityId: "",
    testName: "",
    subtest: "",
    standardScore: "",
    notes: ""
  });
  const [xbaMode, setXbaMode] = useState<'new' | 'existing'>('existing'); // Default to existing tests
  const [selectedExistingScore, setSelectedExistingScore] = useState<string>("");
  const [chcPassages, setChcPassages] = useState<CHCPassage[]>([]);
  const [activePassageAbility, setActivePassageAbility] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchChildren();
      if (id) {
        loadAssessment(id);
      }
    }
  }, [user, id]);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת רשימת הילדים",
        variant: "destructive",
      });
    }
  };

  const loadAssessment = async (assessmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) throw error;

      if (data) {
        setAssessmentId(data.id);
        setSelectedChild(data.child_id);
        
        if (data.assessment_data && typeof data.assessment_data === 'string') {
          const assessmentData = JSON.parse(data.assessment_data);
          setScores(assessmentData.scores || []);
          setObservations(assessmentData.observations || []);
          setXbaTests(assessmentData.xbaTests || []);
          setChcPassages(assessmentData.chcPassages || []);
          
          if (assessmentData.recommendations) {
            setRecommendations(prev => 
              prev.map(rec => ({
                ...rec,
                selected: assessmentData.recommendations.some((r: any) => r.id === rec.id)
              }))
            );
          }
        }
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת האבחון",
        variant: "destructive",
      });
    }
  };

  const saveAssessment = async () => {
    if (!selectedChild || !user) {
      toast({
        title: "שגיאה",
        description: "אנא בחר ילד לפני שמירת האבחון",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedChildData = children.find(c => c.id === selectedChild);
      const assessmentData = JSON.stringify({
        scores,
        observations,
        recommendations: recommendations.filter(r => r.selected),
        xbaTests,
        chcPassages,
        savedAt: new Date().toISOString()
      });

      if (assessmentId) {
        // Update existing assessment
        const { error } = await supabase
          .from('assessments')
          .update({
            assessment_data: assessmentData,
            status: 'in-progress'
          })
          .eq('id', assessmentId);

        if (error) throw error;
      } else {
        // Create new assessment
        const { data, error } = await supabase
          .from('assessments')
          .insert({
            child_id: selectedChild,
            child_name: selectedChildData?.name || '',
            user_id: user.id,
            assessment_data: assessmentData,
            status: 'in-progress'
          })
          .select()
          .single();

        if (error) throw error;
        setAssessmentId(data.id);
      }

      toast({
        title: "נשמר בהצלחה",
        description: "האבחון נשמר במערכת",
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת האבחון",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const completeAssessment = async () => {
    if (!assessmentId) {
      await saveAssessment();
    }

    if (assessmentId) {
      try {
        const { error } = await supabase
          .from('assessments')
          .update({ status: 'completed' })
          .eq('id', assessmentId);

        if (error) throw error;

        toast({
          title: "האבחון הושלם",
          description: "האבחון הועבר לסטטוס 'הושלם' ועכשיו ניתן לייצר דוח",
        });
        
        navigate('/reports');
      } catch (error) {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בסיום האבחון",
          variant: "destructive",
        });
      }
    }
  };

  const validateScore = (score: number, scale: string): boolean => {
    switch (scale) {
      case 'Z':
        return score >= -4 && score <= 4;
      case 'S10':
        return score >= 1 && score <= 19;
      case 'S100':
        return score >= 40 && score <= 160;
      default:
        return false;
    }
  };

  const addScore = () => {
    if (!newScore.tool || !newScore.standardScore) return;
    
    const scoreValue = parseFloat(newScore.standardScore);
    if (!validateScore(scoreValue, newScore.scaleType)) {
      toast({
        title: "ציון לא תקין",
        description: `הציון לא תקין עבור סולם ${newScore.scaleType}`,
        variant: "destructive",
      });
      return;
    }

    const score: Score = {
      id: Date.now().toString(),
      tool: newScore.tool,
      subtest: newScore.subtest,
      standardScore: scoreValue,
      scaleType: newScore.scaleType,
      notes: newScore.notes
    };

    setScores([...scores, score]);
    setNewScore({
      tool: "",
      subtest: "",
      standardScore: "",
      scaleType: "S100",
      notes: ""
    });
  };

  const addObservation = () => {
    if (!newObservation.trim()) return;

    const observation: Observation = {
      id: Date.now().toString(),
      content: newObservation,
      timestamp: new Date().toLocaleString('he-IL')
    };

    setObservations([...observations, observation]);
    setNewObservation("");
  };

  const toggleRecommendation = (id: string) => {
    setRecommendations(recommendations.map(rec => 
      rec.id === id ? { ...rec, selected: !rec.selected } : rec
    ));
  };

  const addCustomRecommendation = () => {
    if (!customRecommendation.trim()) return;

    const newRec: Recommendation = {
      id: Date.now().toString(),
      title: customRecommendation,
      selected: true
    };

    setRecommendations([...recommendations, newRec]);
    setCustomRecommendation("");
  };

  const markDomainStrength = (scoreId: string, domain: 'cognitive' | 'didactic' | 'emotional', isStrength: boolean) => {
    setScores(scores.map(score => 
      score.id === scoreId 
        ? { ...score, domain, strength: isStrength }
        : score
    ));
  };

  const addXbaTest = () => {
    if (xbaMode === 'existing') {
      addExistingTestToXBA();
    } else {
      addNewTestToXBA();
    }
  };

  const addExistingTestToXBA = () => {
    if (!newXbaTest.abilityId || !selectedExistingScore) return;
    
    const selectedScore = scores.find(score => score.id === selectedExistingScore);
    if (!selectedScore) return;

    // Check if this test is already assigned to this CHC ability
    const existingAssignment = xbaTests.find(test => 
      test.sourceScoreId === selectedScore.id && test.abilityId === newXbaTest.abilityId
    );
    
    if (existingAssignment) {
      toast({
        title: "מבחן כבר קיים",
        description: "המבחן כבר מוקצה ליכולת CHC זו",
        variant: "destructive",
      });
      return;
    }

    const xbaTest: XBATest = {
      id: Date.now().toString(),
      abilityId: newXbaTest.abilityId,
      testName: selectedScore.tool,
      subtest: selectedScore.subtest,
      standardScore: selectedScore.standardScore,
      notes: selectedScore.notes || newXbaTest.notes,
      sourceScoreId: selectedScore.id
    };

    setXbaTests([...xbaTests, xbaTest]);
    setNewXbaTest({
      abilityId: "",
      testName: "",
      subtest: "",
      standardScore: "",
      notes: ""
    });
    setSelectedExistingScore("");
  };

  const addNewTestToXBA = () => {
    if (!newXbaTest.abilityId || !newXbaTest.testName || !newXbaTest.standardScore) return;
    
    const scoreValue = parseFloat(newXbaTest.standardScore);
    if (scoreValue < 40 || scoreValue > 160) {
      toast({
        title: "ציון לא תקין",
        description: "הציון חייב להיות בין 40 ל-160",
        variant: "destructive",
      });
      return;
    }

    const xbaTest: XBATest = {
      id: Date.now().toString(),
      abilityId: newXbaTest.abilityId,
      testName: newXbaTest.testName,
      subtest: newXbaTest.subtest,
      standardScore: scoreValue,
      notes: newXbaTest.notes
    };

    setXbaTests([...xbaTests, xbaTest]);
    setNewXbaTest({
      abilityId: "",
      testName: "",
      subtest: "",
      standardScore: "",
      notes: ""
    });
  };

  const getAbilityById = (id: string) => chcAbilities.find(ability => ability.id === id);

  const getTestsByAbility = (abilityId: string) => 
    xbaTests.filter(test => test.abilityId === abilityId);

  const getAvailableScores = () => {
    // Return all scores - allow tests to be assigned to multiple CHC abilities
    return scores;
  };

  const removeXbaTest = (testId: string) => {
    setXbaTests(xbaTests.filter(test => test.id !== testId));
  };

  const getTestAssignmentCount = (scoreId: string) => {
    return xbaTests.filter(test => test.sourceScoreId === scoreId).length;
  };

  const getPassageForAbility = (abilityId: string): CHCPassage => {
    return chcPassages.find(p => p.abilityId === abilityId) || {
      abilityId,
      selectedSentences: [],
      customText: ""
    };
  };

  const updatePassage = (abilityId: string, updatedPassage: Partial<CHCPassage>) => {
    setChcPassages(prev => {
      const existingIndex = prev.findIndex(p => p.abilityId === abilityId);
      const newPassage = { abilityId, ...getPassageForAbility(abilityId), ...updatedPassage };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newPassage;
        return updated;
      } else {
        return [...prev, newPassage];
      }
    });
  };

  const toggleSentence = (abilityId: string, sentenceId: string) => {
    const passage = getPassageForAbility(abilityId);
    const isSelected = passage.selectedSentences.includes(sentenceId);
    
    const newSelectedSentences = isSelected
      ? passage.selectedSentences.filter(id => id !== sentenceId)
      : [...passage.selectedSentences, sentenceId];
    
    updatePassage(abilityId, { selectedSentences: newSelectedSentences });
  };

  const generatePassageText = (abilityId: string): string => {
    const passage = getPassageForAbility(abilityId);
    const sentences = passage.selectedSentences
      .map(id => chcSentenceBanks[abilityId]?.find(s => s.id === id)?.text)
      .filter(Boolean);
    
    let text = sentences.join('. ');
    if (text && !text.endsWith('.')) text += '.';
    if (passage.customText) {
      text = text ? `${text} ${passage.customText}` : passage.customText;
    }
    return text;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">טופס אבחון חדש</h1>
          <p className="text-muted-foreground">בחר ילד מהרשימה או הוסף ילד חדש כדי להתחיל אבחון</p>
        </div>

        {/* Child Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>בחירת ילד</CardTitle>
            <CardDescription>בחר ילד מהרשימה כדי להתחיל אבחון</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="בחר ילד..." />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name} (גיל {Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs defaultValue="scores" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="scores">ציוני אבחון</TabsTrigger>
            <TabsTrigger value="xba">ניתוח XBA</TabsTrigger>
            <TabsTrigger value="observations">יומן תצפיות</TabsTrigger>
            <TabsTrigger value="domains">תיוג תחומים</TabsTrigger>
            <TabsTrigger value="recommendations">המלצות</TabsTrigger>
          </TabsList>

          {/* Scores Tab */}
          <TabsContent value="scores" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-5 w-5 ml-2" />
                  הוספת ציון חדש
                </CardTitle>
                <CardDescription>
                  הזן ציוני אבחון סטנדרטיים עבור כלי האבחון השונים
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="tool">כלי אבחון</Label>
                    <Select value={newScore.tool} onValueChange={(value) => setNewScore({...newScore, tool: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר כלי אבחון" />
                      </SelectTrigger>
                      <SelectContent>
                        {diagnosticTools.map((tool) => (
                          <SelectItem key={tool} value={tool}>{tool}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subtest">תת-מבחן</Label>
                    <Input
                      id="subtest"
                      value={newScore.subtest}
                      onChange={(e) => setNewScore({...newScore, subtest: e.target.value})}
                      placeholder="שם התת-מבחן"
                    />
                  </div>

                  <div>
                    <Label htmlFor="score">ציון סטנדרטי</Label>
                    <Input
                      id="score"
                      type="number"
                      value={newScore.standardScore}
                      onChange={(e) => setNewScore({...newScore, standardScore: e.target.value})}
                      placeholder="ציון"
                    />
                  </div>

                  <div>
                    <Label htmlFor="scale">סולם</Label>
                    <Select value={newScore.scaleType} onValueChange={(value) => setNewScore({...newScore, scaleType: value as 'Z' | 'S10' | 'S100'})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Z">Z (-4 עד +4)</SelectItem>
                        <SelectItem value="S10">S10 (1-19)</SelectItem>
                        <SelectItem value="S100">S100 (40-160)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">הערות</Label>
                  <Textarea
                    id="notes"
                    value={newScore.notes}
                    onChange={(e) => setNewScore({...newScore, notes: e.target.value})}
                    placeholder="הערות נוספות על הביצוע..."
                    rows={2}
                  />
                </div>

                <Button onClick={addScore} className="w-full">
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף ציון
                </Button>
              </CardContent>
            </Card>

            {/* Scores List */}
            {scores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>ציונים שנרשמו</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scores.map((score) => (
                      <div key={score.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{score.tool}</span>
                            {score.subtest && <span className="text-muted-foreground">- {score.subtest}</span>}
                            <Badge variant="outline">{score.scaleType}</Badge>
                          </div>
                          <div className="text-lg font-bold text-primary mt-1">
                            ציון: {score.standardScore}
                          </div>
                          {score.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{score.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* XBA Analysis Tab */}
          <TabsContent value="xba" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ניתוח XBA - יכולות CHC</CardTitle>
                <CardDescription>
                  בחר יכולת CHC והוסף מבחנים הרלוונטיים אליה - ניתן לבחור מבחנים קיימים או להוסיף חדשים
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode Selection */}
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={xbaMode === 'existing' ? 'default' : 'outline'}
                    onClick={() => setXbaMode('existing')}
                    className="flex-1"
                  >
                    בחר מבחן קיים
                  </Button>
                  <Button
                    variant={xbaMode === 'new' ? 'default' : 'outline'}
                    onClick={() => setXbaMode('new')}
                    className="flex-1"
                  >
                    הוסף מבחן חדש
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="chc-ability">יכולת CHC</Label>
                    <Select value={newXbaTest.abilityId} onValueChange={(value) => setNewXbaTest({...newXbaTest, abilityId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר יכולת CHC" />
                      </SelectTrigger>
                      <SelectContent>
                        {chcAbilities.map((ability) => (
                          <SelectItem key={ability.id} value={ability.id}>
                            {ability.code} - {ability.hebrewName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {xbaMode === 'existing' ? (
                    <div>
                      <Label htmlFor="existing-test">בחר מבחן קיים</Label>
                      <Select value={selectedExistingScore} onValueChange={setSelectedExistingScore}>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מבחן מהרשימה" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableScores().map((score) => {
                            const assignmentCount = getTestAssignmentCount(score.id);
                            return (
                              <SelectItem key={score.id} value={score.id}>
                                {score.tool} - {score.subtest} (ציון: {score.standardScore})
                                {assignmentCount > 0 && ` - מוקצה ל-${assignmentCount} יכולות`}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="test-name">שם המבחן</Label>
                        <Input
                          id="test-name"
                          value={newXbaTest.testName}
                          onChange={(e) => setNewXbaTest({...newXbaTest, testName: e.target.value})}
                          placeholder="שם המבחן"
                        />
                      </div>

                      <div>
                        <Label htmlFor="xba-score">ציון סטנדרטי</Label>
                        <Input
                          id="xba-score"
                          type="number"
                          value={newXbaTest.standardScore}
                          onChange={(e) => setNewXbaTest({...newXbaTest, standardScore: e.target.value})}
                          placeholder="40-160"
                        />
                      </div>
                    </>
                  )}
                </div>

                {xbaMode === 'new' && (
                  <div>
                    <Label htmlFor="xba-subtest">תת-מבחן</Label>
                    <Input
                      id="xba-subtest"
                      value={newXbaTest.subtest}
                      onChange={(e) => setNewXbaTest({...newXbaTest, subtest: e.target.value})}
                      placeholder="שם התת-מבחן (אופציונלי)"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="xba-notes">הערות</Label>
                  <Textarea
                    id="xba-notes"
                    value={newXbaTest.notes}
                    onChange={(e) => setNewXbaTest({...newXbaTest, notes: e.target.value})}
                    placeholder="הערות על הביצוע..."
                    rows={2}
                  />
                </div>

                <Button onClick={addXbaTest} className="w-full">
                  <Plus className="h-4 w-4 ml-2" />
                  {xbaMode === 'existing' ? 'הוסף מבחן קיים ליכולת CHC' : 'הוסף מבחן חדש ליכולת CHC'}
                </Button>
              </CardContent>
            </Card>

            {/* Show available tests count */}
            {xbaMode === 'existing' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">מבחנים זמינים</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    יש לך {getAvailableScores().length} מבחנים זמינים. מבחנים יכולים להיות מוקצים למספר יכולות CHC.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* CHC Abilities Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chcAbilities.map((ability) => {
                const abilityTests = getTestsByAbility(ability.id);
                const passage = getPassageForAbility(ability.id);
                const passageText = generatePassageText(ability.id);
                
                return (
                  <Card key={ability.id} className={abilityTests.length > 0 ? "border-primary" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{ability.code} - {ability.hebrewName}</span>
                        <div className="flex items-center gap-2">
                          {abilityTests.length > 0 && (
                            <Badge variant="secondary">{abilityTests.length}</Badge>
                          )}
                          {passage.selectedSentences.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              פסקה: {passage.selectedSentences.length}
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActivePassageAbility(ability.id)}
                            className="h-6 px-2 text-xs"
                          >
                            יצור פסקה
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {ability.description}
                      </CardDescription>
                    </CardHeader>
                    
                    {/* Show generated passage if exists */}
                    {passageText && (
                      <CardContent className="pt-0">
                        <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                          <p className="text-sm font-medium text-blue-900 mb-1">פסקה שנוצרה:</p>
                          <p className="text-sm text-blue-800">{passageText}</p>
                        </div>
                      </CardContent>
                    )}
                    
                    {/* Show tests if any */}
                    {abilityTests.length > 0 && (
                      <CardContent className={passageText ? "pt-0" : ""}>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">מבחנים מוקצים:</p>
                          {abilityTests.map((test) => (
                            <div key={test.id} className="p-2 bg-muted/50 rounded text-sm">
                              <div className="font-medium flex items-center justify-between">
                                <span>{test.testName}</span>
                                <div className="flex items-center gap-2">
                                  {test.sourceScoreId && (
                                    <Badge variant="outline" className="text-xs">
                                      קיים
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeXbaTest(test.id)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {test.subtest && <div className="text-muted-foreground">{test.subtest}</div>}
                              <div className="text-primary font-bold">ציון: {test.standardScore}</div>
                              {test.notes && <div className="text-xs text-muted-foreground mt-1">{test.notes}</div>}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Passage Builder Modal/Dialog */}
            {activePassageAbility && (
              <Card className="mt-6 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      יצירת פסקה עבור {chcAbilities.find(a => a.id === activePassageAbility)?.hebrewName}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivePassageAbility("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    בחר משפטים מוכנים או הוסף טקסט מותאם אישית ליצירת פסקה מקצועית
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Example Passage */}
                  <div>
                    <Label className="text-sm font-medium">דוגמה לפסקה:</Label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm">{examplePassages[activePassageAbility]}</p>
                    </div>
                  </div>

                  {/* Sentence Categories */}
                  {['strength', 'weakness', 'average', 'observation'].map((category) => {
                    const categoryName = {
                      strength: 'נקודות חוזק',
                      weakness: 'נקודות חולשה', 
                      average: 'ביצוע ממוצע',
                      observation: 'תצפיות כלליות'
                    }[category];

                    const sentences = chcSentenceBanks[activePassageAbility]?.filter(s => s.category === category) || [];
                    const passage = getPassageForAbility(activePassageAbility);

                    return (
                      <div key={category}>
                        <Label className="text-sm font-medium">{categoryName}</Label>
                        <div className="mt-2 space-y-2">
                          {sentences.map((sentence) => {
                            const isSelected = passage.selectedSentences.includes(sentence.id);
                            return (
                              <div
                                key={sentence.id}
                                className={`p-3 rounded-md border cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 border-primary text-primary' 
                                    : 'bg-background border-border hover:bg-muted'
                                }`}
                                onClick={() => toggleSentence(activePassageAbility, sentence.id)}
                              >
                                <p className="text-sm">{sentence.text}</p>
                                {isSelected && (
                                  <Check className="h-4 w-4 mt-2 text-primary" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Custom Text */}
                  <div>
                    <Label htmlFor="custom-text">טקסט מותאם אישית</Label>
                    <Textarea
                      id="custom-text"
                      placeholder="הוסף טקסט נוסף או מותאם אישית..."
                      value={getPassageForAbility(activePassageAbility).customText || ""}
                      onChange={(e) => updatePassage(activePassageAbility, { customText: e.target.value })}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  {/* Generated Passage Preview */}
                  <div>
                    <Label className="text-sm font-medium">תצוגה מקדימה של הפסקה:</Label>
                    <div className="mt-2 p-4 bg-blue-50 rounded-md border border-blue-200">
                      <p className="text-sm">
                        {generatePassageText(activePassageAbility) || "בחר משפטים ליצירת הפסקה"}
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setActivePassageAbility("")}
                    className="w-full"
                  >
                    סיים עריכת פסקה
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Observations Tab */}
          <TabsContent value="observations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 ml-2" />
                  יומן תצפיות
                </CardTitle>
                <CardDescription>
                  רשום תצפיות והתנהגויות במהלך האבחון
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="observation">תצפית חדשה</Label>
                  <Textarea
                    id="observation"
                    value={newObservation}
                    onChange={(e) => setNewObservation(e.target.value)}
                    placeholder="תאר את התנהגות הילד, רמת שיתוף הפעולה, קשב..."
                    rows={4}
                  />
                </div>
                <Button onClick={addObservation} className="w-full">
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף תצפית
                </Button>
              </CardContent>
            </Card>

            {observations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>תצפיות שנרשמו</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {observations.map((obs) => (
                      <div key={obs.id} className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">{obs.timestamp}</div>
                        <p className="text-foreground">{obs.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Domains Tab */}
          <TabsContent value="domains" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>תיוג תחומים</CardTitle>
                <CardDescription>
                  סמן כל ציון כחוזקה או חולשה בתחומים השונים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scores.map((score) => (
                    <div key={score.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium">{score.tool}</span>
                          {score.subtest && <span className="text-muted-foreground"> - {score.subtest}</span>}
                          <span className="text-primary font-bold"> (ציון: {score.standardScore})</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {['cognitive', 'didactic', 'emotional'].map((domain) => (
                          <div key={domain} className="space-y-2">
                            <Label className="text-sm font-medium">
                              {domain === 'cognitive' ? 'קוגניטיבי' : 
                               domain === 'didactic' ? 'דידקטי' : 'רגשי'}
                            </Label>
                            <div className="flex gap-2">
                              <Button
                                variant={score.domain === domain && score.strength ? "default" : "outline"}
                                size="sm"
                                onClick={() => markDomainStrength(score.id, domain as any, true)}
                              >
                                חוזקה
                              </Button>
                              <Button
                                variant={score.domain === domain && !score.strength ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => markDomainStrength(score.id, domain as any, false)}
                              >
                                חולשה
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>בחירת המלצות</CardTitle>
                <CardDescription>
                  בחר המלצות מתוך הרשימה או הוסף המלצה מותאמת אישית
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        rec.selected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleRecommendation(rec.id)}
                    >
                      <div className="flex items-center gap-2">
                        {rec.selected && <Check className="h-4 w-4 text-primary" />}
                        <span className={rec.selected ? 'text-primary font-medium' : ''}>{rec.title}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Label htmlFor="custom-rec">המלצה מותאמת אישית</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="custom-rec"
                      value={customRecommendation}
                      onChange={(e) => setCustomRecommendation(e.target.value)}
                      placeholder="הזן המלצה חדשה..."
                    />
                    <Button onClick={addCustomRecommendation}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {recommendations.filter(r => r.selected).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>המלצות נבחרות</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recommendations.filter(r => r.selected).map((rec) => (
                      <li key={rec.id} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span>{rec.title}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <Button
            onClick={() => navigate('/children')}
            variant="outline"
            className="flex-1"
          >
            חזור לרשימת ילדים
          </Button>
          <Button
            onClick={saveAssessment}
            disabled={loading || !selectedChild}
            className="flex-1 bg-gradient-to-r from-primary to-secondary text-white"
          >
            <Save className="h-4 w-4 ml-2" />
            {loading ? "שומר..." : "שמור אבחון"}
          </Button>
          <Button
            onClick={completeAssessment}
            disabled={loading || !selectedChild}
            className="flex-1 bg-gradient-to-r from-success to-info text-white"
          >
            <FileText className="h-4 w-4 ml-2" />
            סיים ויצור דו"ח
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentForm;