import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Users, BarChart3, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  created_at: string;
}

interface Assessment {
  id: string;
  child_id: string;
  child_name: string;
  status: 'draft' | 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
}

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [childrenResponse, assessmentsResponse] = await Promise.all([
        supabase.from('children').select('*').order('created_at', { ascending: false }),
        supabase.from('assessments').select('*').order('created_at', { ascending: false })
      ]);

      if (childrenResponse.error) throw childrenResponse.error;
      if (assessmentsResponse.error) throw assessmentsResponse.error;

      setChildren(childrenResponse.data || []);
      setAssessments(assessmentsResponse.data || []);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הנתונים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inProgressCount = assessments.filter(a => a.status === 'in-progress').length;
  const completedCount = assessments.filter(a => a.status === 'completed').length;

  const getStatusBadge = (status: Assessment['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">טיוטה</Badge>;
      case 'in-progress':
        return <Badge variant="default">בעבודה</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-success text-success-foreground">הושלם</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">PsyAssist</h1>
              <p className="text-muted-foreground mt-1">מערכת ניהול אבחונים פסיכולוגיים חינוכיים-דידקטיים</p>
            </div>
            <div className="flex gap-3">
              <Link to="/children">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 ml-2" />
                  ילד חדש
                </Button>
              </Link>
              <Link to="/assessment">
                <Button size="sm" className="bg-gradient-to-r from-primary to-secondary text-white">
                  <Plus className="h-4 w-4 ml-2" />
                  אבחון חדש
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">סה"כ ילדים</p>
                  <p className="text-2xl font-bold text-primary">{children.length}</p>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">אבחונים בעבודה</p>
                  <p className="text-2xl font-bold text-info">{inProgressCount}</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">אבחונים הושלמו</p>
                  <p className="text-2xl font-bold text-success">{completedCount}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">דוחות השבוע</p>
                  <p className="text-2xl font-bold text-accent">0</p>
                </div>
                <FileText className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Assessments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 ml-2" />
              אבחונים אחרונים
            </CardTitle>
            <CardDescription>
              רשימת האבחונים הפעילים במערכת
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-foreground">{assessment.child_name}</h4>
                      {getStatusBadge(assessment.status)}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                      <span>נוצר: {new Date(assessment.created_at).toLocaleDateString('he-IL')}</span>
                      <span>עודכן לאחרונה: {new Date(assessment.updated_at).toLocaleDateString('he-IL')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/assessment">
                      <Button variant="outline" size="sm">
                        עריכה
                      </Button>
                    </Link>
                    {assessment.status === 'completed' && (
                      <Link to="/reports">
                        <Button variant="secondary" size="sm">
                          <FileText className="h-4 w-4 ml-1" />
                          דו"ח
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {assessments.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">אין אבחונים עדיין</h3>
                <p className="text-muted-foreground mb-4">התחל על ידי יצירת אבחון חדש</p>
                <Link to="/assessment">
                  <Button className="bg-gradient-to-r from-primary to-secondary text-white">
                    <Plus className="h-4 w-4 ml-2" />
                    צור אבחון חדש
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;