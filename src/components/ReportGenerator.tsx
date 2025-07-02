import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Printer, Share } from "lucide-react";

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
  const [reportData] = useState<ReportData>({
    child: {
      name: "שרה כהן",
      dateOfBirth: "15/03/2015",
      age: 9
    },
    referralReason: "קשיים בלמידה ובריכוז",
    assessmentDate: "20/01/2024",
    psychologist: "ד\"ר רחל לוי",
    scores: [
      {
        tool: "WISC-V",
        subtest: "הבנה מילולית",
        standardScore: 95,
        scaleType: "S100",
        notes: "ביצוע ברמה ממוצעת",
        domain: "cognitive",
        strength: true
      },
      {
        tool: "WISC-V", 
        subtest: "זיכרון עבודה",
        standardScore: 78,
        scaleType: "S100",
        notes: "ביצוע מתחת לממוצע",
        domain: "cognitive",
        strength: false
      },
      {
        tool: "מבחן קריאה",
        subtest: "זיהוי מילים",
        standardScore: 82,
        scaleType: "S100",
        notes: "קושי בזיהוי מילים מורכבות",
        domain: "didactic",
        strength: false
      }
    ],
    observations: [
      {
        content: "הילדה הגיעה בזמן והראתה מוטיבציה טובה לשיתוף פעולה.",
        timestamp: "20/01/2024 09:00"
      },
      {
        content: "קושי בריכוז לאורך זמן, נדרשו הפסקות תכופות.",
        timestamp: "20/01/2024 10:30"
      },
      {
        content: "ביטחון עצמי נמוך במטלות אקדמיות.",
        timestamp: "20/01/2024 11:15"
      }
    ],
    recommendations: [
      { title: "מתן זמן נוסף במבחנים" },
      { title: "חלוקת מטלות למקטעים קצרים" },
      { title: "מתן הפסקות תכופות" },
      { title: "פיתוח אסטרטגיות למידה" },
      { title: "חיזוק ביטחון עצמי אקדמי" }
    ]
  });

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

  const generateReport = () => {
    // Here would be the actual report generation logic
    alert("דו\"ח נוצר בהצלחה! יתחיל הורדה...");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">דו"ח אבחון פסיכולוגי חינוכי</h1>
          <p className="text-muted-foreground">תאריך יצירה: {new Date().toLocaleDateString('he-IL')}</p>
        </div>

        {/* Report Preview */}
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

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={generateReport} className="flex-1 bg-gradient-to-r from-primary to-secondary text-white">
            <Download className="h-4 w-4 ml-2" />
            הורד דו"ח (DOCX)
          </Button>
          <Button variant="outline" className="flex-1">
            <Printer className="h-4 w-4 ml-2" />
            הדפס
          </Button>
          <Button variant="outline" className="flex-1">
            <Share className="h-4 w-4 ml-2" />
            שתף
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;