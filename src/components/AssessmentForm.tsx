import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Save, FileText, Clock, Check } from "lucide-react";

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

const AssessmentForm = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
  }, [user]);

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scores">ציוני אבחון</TabsTrigger>
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