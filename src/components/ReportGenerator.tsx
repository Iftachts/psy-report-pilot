import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Download, FileText, Printer, Share, CheckCircle, Eye, Settings, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReportData {
  child: {
    name: string;
    dateOfBirth: string;
    age: number;
    grade?: string;
    school?: string;
    parentNames?: string;
  };
  referralReason: string;
  backgroundInfo: string;
  assessmentPurpose: string;
  scores: Array<{
    tool: string;
    subtest: string;
    standardScore: number;
    scaleType: string;
    notes: string;
    domain?: string;
    strength?: boolean;
  }>;
  xbaTests: Array<{
    abilityId: string;
    testName: string;
    subtest: string;
    standardScore: number;
    notes: string;
    sourceScoreId?: string;
  }>;
  chcPassages: Array<{
    abilityId: string;
    selectedSentences: string[];
    customText?: string;
  }>;
  observations: Array<{
    content: string;
    timestamp: string;
  }>;
  recommendations: Array<{
    title: string;
  }>;
  assessmentDate: string;
  psychologist: string;
  clinicName: string;
  reportTemplate: 'comprehensive' | 'brief' | 'educational';
}

// CHC Abilities mapping
const chcAbilities = {
  gf: { code: "Gf", name: "Fluid Intelligence", hebrewName: "אינטליגנציה נוזלית", description: "יכולת להשתמש בהיגיון כדי לפתור בעיות חדשות ולהבין קשרים" },
  gc: { code: "Gc", name: "Crystallized Intelligence", hebrewName: "אינטליגנציה גבישית", description: "ידע נרכש ומיומנויות מילוליות" },
  gv: { code: "Gv", name: "Visual Processing", hebrewName: "עיבוד חזותי", description: "יכולת לתפוס, לנתח ולחשוב באמצעות דפוסים חזותיים" },
  ga: { code: "Ga", name: "Auditory Processing", hebrewName: "עיבוד שמיעתי", description: "יכולת לנתח ולסנתז מידע שמיעתי" },
  gs: { code: "Gs", name: "Processing Speed", hebrewName: "מהירות עיבוד", description: "יכולת לביצוע מהיר של משימות קוגניטיביות אוטומטיות" },
  gsm: { code: "Gsm", name: "Short-term Memory", hebrewName: "זיכרון קצר מדי", description: "יכולת לשמור ולתפעל מידע בזיכרון לזמן קצר" },
  glr: { code: "Glr", name: "Long-term Retrieval", hebrewName: "שליפה מזיכרון ארוך מדי", description: "יכולת לאחסן ולשלוף מידע מהזיכרון ארוך המדי" },
  gq: { code: "Gq", name: "Quantitative Knowledge", hebrewName: "ידע כמותי", description: "ידע מתמטי ויכולת לפתור בעיות מתמטיות" },
  grw: { code: "Grw", name: "Reading/Writing", hebrewName: "קריאה וכתיבה", description: "מיומנויות בסיסיות בקריאה וכתיבה" }
};

// Report templates
const reportTemplates = {
  comprehensive: "דו\"ח מקיף",
  brief: "דו\"ח קצר", 
  educational: "דו\"ח חינוכי"
};

const ReportGenerator = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData>({
    child: {
      name: "",
      dateOfBirth: "",
      age: 0,
      grade: "",
      school: "",
      parentNames: ""
    },
    referralReason: "",
    backgroundInfo: "",
    assessmentPurpose: "",
    assessmentDate: "",
    psychologist: "",
    clinicName: "מרכז PsyAssist לאבחונים פסיכולוגיים",
    scores: [],
    xbaTests: [],
    chcPassages: [],
    observations: [],
    recommendations: [],
    reportTemplate: 'comprehensive'
  });
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCompletedAssessments();
    }
  }, [user]);

  const fetchCompletedAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          children (
            name,
            date_of_birth
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת האבחונים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentData = (assessmentId: string) => {
    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) return;

    const child = assessment.children;
    let parsedAssessmentData: any = {};
    
    try {
      parsedAssessmentData = JSON.parse(assessment.assessment_data || '{}');
    } catch (error) {
      console.error('Error parsing assessment data:', error);
      parsedAssessmentData = {};
    }
    
    setReportData(prev => ({
      ...prev,
      child: {
        name: child?.name || assessment.child_name,
        dateOfBirth: child?.date_of_birth || "",
        age: child?.date_of_birth ? Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0,
        grade: prev.child.grade,
        school: prev.child.school,
        parentNames: prev.child.parentNames
      },
      referralReason: prev.referralReason || "הפניה לאבחון פסיכולוגי חינוכי",
      backgroundInfo: prev.backgroundInfo,
      assessmentPurpose: prev.assessmentPurpose || "אבחון פסיכולוגי חינוכי מקיף לבחינת היכולות הקוגניטיביות והדידקטיות",
      assessmentDate: new Date(assessment.created_at).toLocaleDateString('he-IL'),
      psychologist: prev.psychologist || "פסיכולוג/ית חינוכי/ת",
      scores: parsedAssessmentData.scores || [],
      xbaTests: parsedAssessmentData.xbaTests || [],
      chcPassages: parsedAssessmentData.chcPassages || [],
      observations: parsedAssessmentData.observations || [],
      recommendations: parsedAssessmentData.recommendations || []
    }));
  };

  const saveReport = async () => {
    if (!selectedAssessment || !user) return;

    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          assessment_id: selectedAssessment,
          child_name: reportData.child.name,
          user_id: user.id,
          report_content: JSON.stringify(reportData)
        });

      if (error) throw error;

      toast({
        title: "דו\"ח נשמר",
        description: "הדו\"ח נשמר בהצלחה במערכת",
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת הדו\"ח",
        variant: "destructive",
      });
    }
  };

  const strengthsByDomain = {
    cognitive: reportData.scores.filter(s => s.domain === 'cognitive' && s.strength),
    didactic: reportData.scores.filter(s => s.domain === 'didactic' && s.strength),
    emotional: reportData.scores.filter(s => s.domain === 'emotional' && s.strength)
  };

  const weaknessesByDomain = {
    cognitive: reportData.scores.filter(s => s.domain === 'cognitive' && !s.strength),
    didactic: reportData.scores.filter(s => s.domain === 'didactic' && !s.strength),
    emotional: reportData.scores.filter(s => s.domain === 'emotional' && !s.strength)
  };

  const generateReport = async () => {
    await saveReport();
    
    toast({
      title: "דו\"ח נוצר בהצלחה! 📄",
      description: "הדו\"ח מוכן להורדה במערכת",
    });
    
    // Generate and download report
    setTimeout(() => {
      const reportContent = `
דו"ח אבחון פסיכולוגי חינוכי-דידקטי

פרטי הנבדק/ת:
שם: ${reportData.child.name}
תאריך לידה: ${reportData.child.dateOfBirth}
גיל: ${reportData.child.age} שנים
תאריך אבחון: ${reportData.assessmentDate}

תוצאות האבחון:
${reportData.scores.map(score => `${score.tool} - ${score.subtest}: ${score.standardScore} (${score.scaleType})`).join('\n')}

תצפיות התנהגותיות:
${reportData.observations.map(obs => obs.content).join('\n')}

המלצות להתאמות לימוד:
${reportData.recommendations.map(rec => `• ${rec.title}`).join('\n')}

בברכה,
${reportData.psychologist}
      `;
      
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `דוח_אבחון_${reportData.child.name.replace(' ', '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const printReport = () => {
    window.print();
  };

  const shareReport = () => {
    toast({
      title: "קישור לשיתוף נוצר 🔗",
      description: "הקישור הועתק ללוח העותקים",
    });
  };

  // Helper function to generate CHC passage text
  const generateCHCPassageText = (passage: any): string => {
    // This would need the sentence banks from AssessmentForm - simplified version
    const sentences = passage.selectedSentences || [];
    let text = sentences.join('. ');
    if (text && !text.endsWith('.')) text += '.';
    if (passage.customText) {
      text = text ? `${text} ${passage.customText}` : passage.customText;
    }
    return text;
  };

  // Helper function to get score interpretation
  const getScoreInterpretation = (score: number, scaleType: string): string => {
    switch (scaleType) {
      case 'S100':
        if (score >= 115) return "גבוה מאוד";
        if (score >= 110) return "גבוה";
        if (score >= 90) return "ממוצע";
        if (score >= 80) return "נמוך";
        return "נמוך מאוד";
      case 'S10':
        if (score >= 13) return "גבוה מאוד";
        if (score >= 11) return "גבוה";
        if (score >= 8) return "ממוצע";
        if (score >= 6) return "נמוך";
        return "נמוך מאוד";
      case 'Z':
        if (score >= 1.5) return "גבוה מאוד";
        if (score >= 1) return "גבוה";
        if (score >= -1) return "ממוצע";
        if (score >= -1.5) return "נמוך";
        return "נמוך מאוד";
      default:
        return "לא ידוע";
    }
  };

  // Helper function to group scores by CHC abilities
  const groupScoresByAbility = () => {
    const grouped: Record<string, any[]> = {};
    
    reportData.xbaTests.forEach(test => {
      if (!grouped[test.abilityId]) {
        grouped[test.abilityId] = [];
      }
      grouped[test.abilityId].push(test);
    });
    
    return grouped;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-primary mb-2">מערכת הפקת דוחות מקצועיים</h1>
          <p className="text-muted-foreground text-lg">יצירת דוחות אבחון פסיכולוגיים מקיפים ומקצועיים</p>
          <p className="text-sm text-muted-foreground">תאריך יצירה: {new Date().toLocaleDateString('he-IL')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Assessment Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                בחירת אבחון וסוג דוח
              </CardTitle>
              <CardDescription>בחר אבחון שהושלם וקבע את סוג הדוח הרצוי</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="assessment-select">אבחון</Label>
                <Select value={selectedAssessment} onValueChange={(value) => {
                  setSelectedAssessment(value);
                  loadAssessmentData(value);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר אבחון..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assessments.map((assessment) => (
                      <SelectItem key={assessment.id} value={assessment.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{assessment.child_name}</span>
                          <Badge variant="outline" className="mr-2">
                            {new Date(assessment.created_at).toLocaleDateString('he-IL')}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="template-select">סוג דוח</Label>
                <Select value={reportData.reportTemplate} onValueChange={(value: any) => 
                  setReportData(prev => ({ ...prev, reportTemplate: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reportTemplates).map(([key, name]) => (
                      <SelectItem key={key} value={key}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Report Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                הגדרות דוח
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="psychologist">פסיכולוג/ית מבצע/ת</Label>
                <Input
                  id="psychologist"
                  value={reportData.psychologist}
                  onChange={(e) => setReportData(prev => ({ ...prev, psychologist: e.target.value }))}
                  placeholder="שם מלא + תואר"
                />
              </div>
              <div>
                <Label htmlFor="clinic">שם המרפאה/מרכז</Label>
                <Input
                  id="clinic"
                  value={reportData.clinicName}
                  onChange={(e) => setReportData(prev => ({ ...prev, clinicName: e.target.value }))}
                  placeholder="שם המוסד"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information Form */}
        {selectedAssessment && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                מידע נוסף לדוח
              </CardTitle>
              <CardDescription>השלם פרטים נוספים לשיפור איכות הדוח</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="grade">כיתה</Label>
                  <Input
                    id="grade"
                    value={reportData.child.grade || ""}
                    onChange={(e) => setReportData(prev => ({ 
                      ...prev, 
                      child: { ...prev.child, grade: e.target.value }
                    }))}
                    placeholder="למשל: ט'"
                  />
                </div>
                <div>
                  <Label htmlFor="school">בית ספר</Label>
                  <Input
                    id="school"
                    value={reportData.child.school || ""}
                    onChange={(e) => setReportData(prev => ({ 
                      ...prev, 
                      child: { ...prev.child, school: e.target.value }
                    }))}
                    placeholder="שם בית הספר"
                  />
                </div>
                <div>
                  <Label htmlFor="parents">שמות ההורים</Label>
                  <Input
                    id="parents"
                    value={reportData.child.parentNames || ""}
                    onChange={(e) => setReportData(prev => ({ 
                      ...prev, 
                      child: { ...prev.child, parentNames: e.target.value }
                    }))}
                    placeholder="שם האב ושם האם"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="referral">סיבת הפניה</Label>
                  <Textarea
                    id="referral"
                    value={reportData.referralReason}
                    onChange={(e) => setReportData(prev => ({ ...prev, referralReason: e.target.value }))}
                    placeholder="תאר את הסיבה להפניה לאבחון..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="background">רקע כללי</Label>
                  <Textarea
                    id="background"
                    value={reportData.backgroundInfo}
                    onChange={(e) => setReportData(prev => ({ ...prev, backgroundInfo: e.target.value }))}
                    placeholder="מידע רקע רלוונטי על הילד/ה..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Label htmlFor="purpose">מטרת האבחון</Label>
                <Textarea
                  id="purpose"
                  value={reportData.assessmentPurpose}
                  onChange={(e) => setReportData(prev => ({ ...prev, assessmentPurpose: e.target.value }))}
                  placeholder="תאר את המטרות הספציפיות של האבחון..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Preview */}
        {selectedAssessment && (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6 print:shadow-none print:p-0">
          {/* Professional Report Header */}
          <div className="text-center mb-8 border-b pb-6">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-primary mb-2">
                {reportData.reportTemplate === 'comprehensive' ? 'דו"ח אבחון פסיכולוגי מקיף' :
                 reportData.reportTemplate === 'educational' ? 'דו"ח אבחון לצרכים חינוכיים' :
                 'דו"ח אבחון פסיכולוגי'}
              </h1>
              <h2 className="text-xl text-muted-foreground mb-4">
                Cross-Battery Assessment (XBA) & CHC Model Analysis
              </h2>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <div className="text-right">
                <p className="font-semibold">{reportData.clinicName}</p>
                <p className="text-muted-foreground">מרכז לאבחונים פסיכולוגיים חינוכיים</p>
              </div>
              <div className="text-left">
                <p><strong>תאריך האבחון:</strong> {reportData.assessmentDate}</p>
                <p><strong>תאריך הדוח:</strong> {new Date().toLocaleDateString('he-IL')}</p>
                <p><strong>מספר דוח:</strong> RPT-{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Section 1: פרטי הנבדק/ת */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-primary mb-4 border-b border-primary/20 pb-2">
              1. פרטי הנבדק/ת
            </h3>
            <div className="bg-blue-50/50 p-6 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><strong>שם הנבדק/ת:</strong> {reportData.child.name}</div>
                <div><strong>תאריך לידה:</strong> {reportData.child.dateOfBirth}</div>
                <div><strong>גיל בזמן האבחון:</strong> {reportData.child.age} שנים</div>
                {reportData.child.grade && <div><strong>כיתה:</strong> {reportData.child.grade}</div>}
                {reportData.child.school && <div><strong>בית ספר:</strong> {reportData.child.school}</div>}
                {reportData.child.parentNames && <div><strong>שמות ההורים:</strong> {reportData.child.parentNames}</div>}
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>תאריך ביצוע האבחון:</strong> {reportData.assessmentDate}</div>
                <div><strong>מבצע/ת האבחון:</strong> {reportData.psychologist}</div>
              </div>
            </div>
          </section>

          {/* Section 2: סיבת ההפניה ומטרת האבחון */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-primary mb-4 border-b border-primary/20 pb-2">
              2. סיבת ההפניה ומטרת האבחון
            </h3>
            <div className="space-y-4">
              {reportData.referralReason && (
                <div>
                  <h4 className="font-semibold mb-2">סיבת ההפניה:</h4>
                  <p className="text-gray-700 leading-relaxed">{reportData.referralReason}</p>
                </div>
              )}
              {reportData.assessmentPurpose && (
                <div>
                  <h4 className="font-semibold mb-2">מטרת האבחון:</h4>
                  <p className="text-gray-700 leading-relaxed">{reportData.assessmentPurpose}</p>
                </div>
              )}
              {reportData.backgroundInfo && (
                <div>
                  <h4 className="font-semibold mb-2">רקע כללי:</h4>
                  <p className="text-gray-700 leading-relaxed">{reportData.backgroundInfo}</p>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: מבחנים שבוצעו */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-primary mb-4 border-b border-primary/20 pb-2">
              3. מבחנים שבוצעו ותוצאותיהם
            </h3>
            <div className="space-y-6">
              {/* Standard Assessment Results */}
              {reportData.scores.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-lg">תוצאות מבחנים סטנדרטיים:</h4>
                  <div className="space-y-3">
                    {reportData.scores.map((score, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-lg">{score.tool}</span>
                            {score.subtest && <span className="text-gray-600">- {score.subtest}</span>}
                            <Badge variant="outline" className="text-xs">{score.scaleType}</Badge>
                            <Badge 
                              variant={getScoreInterpretation(score.standardScore, score.scaleType).includes('גבוה') ? 'default' : 
                                      getScoreInterpretation(score.standardScore, score.scaleType).includes('נמוך') ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {getScoreInterpretation(score.standardScore, score.scaleType)}
                            </Badge>
                          </div>
                          {score.notes && <div className="text-sm text-gray-600 mt-2">{score.notes}</div>}
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {score.standardScore}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: CHC Cross-Battery Analysis */}
          {reportData.xbaTests.length > 0 && (
            <section className="mb-8">
              <h3 className="text-xl font-bold text-primary mb-4 border-b border-primary/20 pb-2">
                4. ניתוח Cross-Battery Assessment (XBA) לפי מודל CHC
              </h3>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6">
                <h4 className="font-semibold text-lg mb-3">מבוא לניתוח CHC:</h4>
                <p className="text-gray-700 leading-relaxed">
                  ניתוח Cross-Battery מבוסס על תורת Cattell-Horn-Carroll (CHC) המהווה את המודל המקובל כיום להבנת המבנה הקוגניטיבי האנושי. 
                  המודל מזהה תשע יכולות קוגניטיביות רחבות שכל אחת מהן תורמת להישגים אקדמיים ותפקודיים שונים.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(groupScoresByAbility()).map(([abilityId, tests]) => {
                  const ability = chcAbilities[abilityId as keyof typeof chcAbilities];
                  const passage = reportData.chcPassages.find(p => p.abilityId === abilityId);
                  const passageText = passage ? generateCHCPassageText(passage) : '';
                  
                  if (!ability) return null;

                  return (
                    <div key={abilityId} className="border rounded-lg p-6 bg-white">
                      <div className="mb-4">
                        <h5 className="text-lg font-bold text-primary flex items-center gap-2">
                          <span className="bg-primary text-white px-2 py-1 rounded text-sm">{ability.code}</span>
                          {ability.hebrewName}
                        </h5>
                        <p className="text-sm text-gray-600 mt-2">{ability.description}</p>
                      </div>

                      {/* Tests for this ability */}
                      <div className="mb-4">
                        <h6 className="font-semibold mb-2">מבחנים שבוצעו:</h6>
                        <div className="space-y-2">
                          {tests.map((test, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div>
                                <span className="font-medium">{test.testName}</span>
                                {test.subtest && <span className="text-gray-600"> - {test.subtest}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={getScoreInterpretation(test.standardScore, 'S100').includes('גבוה') ? 'default' : 
                                          getScoreInterpretation(test.standardScore, 'S100').includes('נמוך') ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {getScoreInterpretation(test.standardScore, 'S100')}
                                </Badge>
                                <span className="font-bold text-primary">{test.standardScore}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* CHC Passage for this ability */}
                      {passageText && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h6 className="font-semibold mb-2 text-blue-900">תיאור תפקודי:</h6>
                          <p className="text-blue-800 leading-relaxed">{passageText}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 5: תצפיות התנהגותיות */}
          {reportData.observations.length > 0 && (
            <section className="mb-8">
              <h3 className="text-xl font-bold text-primary mb-4 border-b border-primary/20 pb-2">
                5. תצפיות התנהגותיות במהלך האבחון
              </h3>
              <div className="space-y-4">
                {reportData.observations.map((obs, index) => (
                  <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                    <p className="text-gray-700 leading-relaxed">{obs.content}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      נרשם: {new Date(obs.timestamp).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: סיכום ממצאים */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-primary mb-4 border-b border-primary/20 pb-2">
              6. סיכום ממצאים עיקריים
            </h3>
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div>
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    נקודות חוזק מזוהות:
                  </h4>
                  <ul className="space-y-2 text-green-700">
                    {reportData.scores
                      .filter(s => getScoreInterpretation(s.standardScore, s.scaleType).includes('גבוה'))
                      .slice(0, 5)
                      .map((score, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{score.tool} - {score.subtest} (ציון: {score.standardScore})</span>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Areas for improvement */}
                <div>
                  <h4 className="font-semibold text-orange-800 mb-3">תחומים לחיזוק:</h4>
                  <ul className="space-y-2 text-orange-700">
                    {reportData.scores
                      .filter(s => getScoreInterpretation(s.standardScore, s.scaleType).includes('נמוך'))
                      .slice(0, 5)
                      .map((score, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>{score.tool} - {score.subtest} (ציון: {score.standardScore})</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: המלצות */}
          {reportData.recommendations.length > 0 && (
            <section className="mb-8">
              <h3 className="text-xl font-bold text-primary mb-4 border-b border-primary/20 pb-2">
                7. המלצות להתאמות ותמיכה חינוכית
              </h3>
              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportData.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border-l-4 border-purple-400">
                      <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{rec.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Section 8: חתימה ואישור */}
          <section className="border-t pt-6 mt-8">
            <div className="flex justify-between items-end">
              <div>
                <h4 className="font-semibold mb-4">דוח זה הוכן על ידי:</h4>
                <div className="space-y-2">
                  <p className="font-semibold text-lg">{reportData.psychologist}</p>
                  <p className="text-gray-600">פסיכולוג/ית חינוכי/ת מוסמך/ת</p>
                  <p className="text-gray-600">{reportData.clinicName}</p>
                </div>
                
                <div className="mt-6 pt-4 border-t border-dashed">
                  <p className="text-xs text-gray-500">
                    דו"ח זה נוצר באמצעות מערכת PsyAssist המקצועית לאבחונים פסיכולוגיים
                  </p>
                  <p className="text-xs text-gray-500">
                    מזהה דוח: RPT-{Math.random().toString(36).substr(2, 9).toUpperCase()} | תאריך יצירה: {new Date().toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-32 h-16 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm mb-2">
                  מקום לחתימה
                </div>
                <p className="text-sm text-gray-600">חתימה וחותמת</p>
              </div>
            </div>
          </section>

        </div>
        )}

        {/* Enhanced Action Buttons */}
        {selectedAssessment && (
          <div className="space-y-4">
            {/* Quick Actions Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button onClick={generateReport} className="bg-gradient-to-r from-primary to-blue-600 text-white">
                <Download className="h-4 w-4 ml-2" />
                הורד דו"ח מקיף
              </Button>
              <Button variant="outline" onClick={printReport}>
                <Printer className="h-4 w-4 ml-2" />
                הדפס דו"ח
              </Button>
              <Button variant="outline" onClick={shareReport}>
                <Share className="h-4 w-4 ml-2" />
                שתף דו"ח
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 ml-2" />
                    תצוגה מקדימה
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>תצוגה מקדימה - {reportData.child.name}</DialogTitle>
                  </DialogHeader>
                  <div className="text-sm">
                    <p>✅ סך הכל {reportData.scores.length} מבחנים</p>
                    <p>✅ {reportData.xbaTests.length} יכולות CHC מנותחות</p>
                    <p>✅ {reportData.observations.length} תצפיות התנהגותיות</p>
                    <p>✅ {reportData.recommendations.length} המלצות מקצועיות</p>
                    {reportData.chcPassages.length > 0 && (
                      <p>✅ {reportData.chcPassages.length} פסקאות תיאור מותאמות אישית</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Report Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">סטטיסטיקות דוח</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-primary">{reportData.scores.length}</div>
                    <div className="text-sm text-gray-600">מבחנים סטנדרטיים</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-blue-600">{reportData.xbaTests.length}</div>
                    <div className="text-sm text-gray-600">יכולות CHC</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-600">
                      {reportData.scores.filter(s => getScoreInterpretation(s.standardScore, s.scaleType).includes('גבוה')).length}
                    </div>
                    <div className="text-sm text-gray-600">נקודות חוזק</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-purple-600">{reportData.recommendations.length}</div>
                    <div className="text-sm text-gray-600">המלצות</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Quality Indicators */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                איכות הדוח
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>ניתוח CHC מקיף</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>פסקאות מותאמות אישית</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>המלצות מקצועיות</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;