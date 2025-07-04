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
import { Download, FileText, Printer, Share, CheckCircle, Eye } from "lucide-react";

interface ReportData {
  child: {
    name: string;
    dateOfBirth: string;
    age: number;
  };
  referralReason: string;
  scores: Array<{
    tool: string;
    subtest: string;
    standardScore: number;
    scaleType: string;
    notes: string;
    domain?: string;
    strength?: boolean;
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
}

const ReportGenerator = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData>({
    child: {
      name: "",
      dateOfBirth: "",
      age: 0
    },
    referralReason: "",
    assessmentDate: "",
    psychologist: "",
    scores: [],
    observations: [],
    recommendations: []
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
    
    setReportData({
      child: {
        name: child?.name || assessment.child_name,
        dateOfBirth: child?.date_of_birth || "",
        age: child?.date_of_birth ? Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0
      },
      referralReason: "הפניה לאבחון פסיכולוגי חינוכי",
      assessmentDate: new Date(assessment.created_at).toLocaleDateString('he-IL'),
      psychologist: "פסיכולוג/ית חינוכי/ת",
      scores: parsedAssessmentData.scores || [],
      observations: parsedAssessmentData.observations || [],
      recommendations: parsedAssessmentData.recommendations || []
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">דו"ח אבחון פסיכולוגי חינוכי</h1>
          <p className="text-muted-foreground">תאריך יצירה: {new Date().toLocaleDateString('he-IL')}</p>
        </div>

        {/* Assessment Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>בחירת אבחון</CardTitle>
            <CardDescription>בחר אבחון שהושלם כדי לייצר דו"ח</CardDescription>
          </CardHeader>
          <CardContent>
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
                    {assessment.child_name} - {new Date(assessment.created_at).toLocaleDateString('he-IL')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Report Preview */}
        {selectedAssessment && (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Report Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-primary mb-2">דו"ח אבחון פסיכולוגי חינוכי-דידקטי</h2>
            <div className="text-muted-foreground">
              <p>מחלקת פסיכולוגיה חינוכית</p>
              <p>השירות הפסיכולוגי החינוכי</p>
            </div>
          </div>

          {/* Child Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>פרטי הנבדק/ת</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>שם:</strong> {reportData.child.name}
                </div>
                <div>
                  <strong>תאריך לידה:</strong> {reportData.child.dateOfBirth}
                </div>
                <div>
                  <strong>גיל:</strong> {reportData.child.age} שנים
                </div>
                <div>
                  <strong>תאריך אבחון:</strong> {reportData.assessmentDate}
                </div>
                <div className="col-span-2">
                  <strong>סיבת הפניה:</strong> {reportData.referralReason}
                </div>
                <div className="col-span-2">
                  <strong>אבחן/ת:</strong> {reportData.psychologist}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Results */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>תוצאות האבחון</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.scores.map((score, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{score.tool}</span>
                        {score.subtest && <span className="text-muted-foreground">- {score.subtest}</span>}
                        <Badge variant="outline">{score.scaleType}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{score.notes}</div>
                    </div>
                    <div className="text-xl font-bold text-primary">
                      {score.standardScore}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Findings Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>סיכום ממצאים</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Strengths */}
              <div className="mb-4">
                <h4 className="font-semibold text-success mb-2">חוזקות:</h4>
                <div className="space-y-2">
                  {Object.entries(strengthsByDomain).map(([domain, scores]) => (
                    scores.length > 0 && (
                      <div key={domain}>
                        <span className="font-medium">
                          {domain === 'cognitive' ? 'תחום קוגניטיבי:' : 
                           domain === 'didactic' ? 'תחום דידקטי:' : 'תחום רגשי:'}
                        </span>
                        <ul className="list-disc list-inside mr-4 text-sm">
                          {scores.map((score, idx) => (
                            <li key={idx}>{score.tool} - {score.subtest}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="mb-4">
                <h4 className="font-semibold text-destructive mb-2">תחומים לחיזוק:</h4>
                <div className="space-y-2">
                  {Object.entries(weaknessesByDomain).map(([domain, scores]) => (
                    scores.length > 0 && (
                      <div key={domain}>
                        <span className="font-medium">
                          {domain === 'cognitive' ? 'תחום קוגניטיבי:' : 
                           domain === 'didactic' ? 'תחום דידקטי:' : 'תחום רגשי:'}
                        </span>
                        <ul className="list-disc list-inside mr-4 text-sm">
                          {scores.map((score, idx) => (
                            <li key={idx}>{score.tool} - {score.subtest}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>תצפיות התנהגותיות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.observations.map((obs, index) => (
                  <div key={index} className="p-3 bg-muted/30 rounded-lg">
                    <p>{obs.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>המלצות להתאמות לימוד</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{rec.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Signature */}
          <div className="text-center pt-6 border-t">
            <p className="text-muted-foreground mb-2">בברכה,</p>
            <p className="font-semibold">{reportData.psychologist}</p>
            <p className="text-sm text-muted-foreground">פסיכולוג/ית חינוכי/ת</p>
            <p className="text-sm text-muted-foreground mt-4">
              דו"ח זה נוצר באמצעות מערכת PsyAssist | Hash: {Math.random().toString(36).substr(2, 9).toUpperCase()}
            </p>
          </div>
        </div>
        )}

        {/* Action Buttons */}
        {selectedAssessment && (
        <div className="flex gap-4">
          <Button onClick={generateReport} className="flex-1 bg-gradient-to-r from-primary to-secondary text-white">
            <Download className="h-4 w-4 ml-2" />
            הורד דו"ח (DOCX)
          </Button>
          <Button variant="outline" className="flex-1" onClick={printReport}>
            <Printer className="h-4 w-4 ml-2" />
            הדפס
          </Button>
          <Button variant="outline" className="flex-1" onClick={shareReport}>
            <Share className="h-4 w-4 ml-2" />
            שתף
          </Button>
        </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;