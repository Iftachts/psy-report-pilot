import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon,
  FileText,
  Edit,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  notes?: string;
}

interface ChildWithCalculated extends Child {
  age: number;
  assessmentsCount: number;
  lastAssessment?: string;
  status: 'active' | 'completed' | 'pending';
}

const Children = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildWithCalculated[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newChild, setNewChild] = useState({
    name: "",
    dateOfBirth: undefined as Date | undefined
  });

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
      
      // Transform data to include calculated fields
      const transformedChildren: ChildWithCalculated[] = (data || []).map(child => ({
        ...child,
        age: calculateAge(new Date(child.date_of_birth)),
        assessmentsCount: 0, // TODO: Get actual count from assessments table
        status: 'pending' as const // TODO: Determine status based on assessments
      }));
      
      setChildren(transformedChildren);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת רשימת הילדים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: ChildWithCalculated['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">פעיל</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-success text-success-foreground">הושלם</Badge>;
      case 'pending':
        return <Badge variant="secondary">ממתין</Badge>;
    }
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const addChild = async () => {
    if (!newChild.name || !newChild.dateOfBirth || !user) return;

    try {
      const { data, error } = await supabase
        .from('children')
        .insert({
          name: newChild.name,
          date_of_birth: format(newChild.dateOfBirth, "yyyy-MM-dd"),
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new child to the local state
      const newChildWithCalculated: ChildWithCalculated = {
        ...data,
        age: calculateAge(newChild.dateOfBirth),
        assessmentsCount: 0,
        status: 'pending'
      };

      setChildren([newChildWithCalculated, ...children]);
      setNewChild({ name: "", dateOfBirth: undefined });
      setIsAddDialogOpen(false);
      
      toast({
        title: "הצלחה",
        description: "הילד נוסף בהצלחה למערכת",
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהוספת הילד",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">ניהול ילדים</h1>
            <p className="text-muted-foreground mt-1">רשימת כל הילדים במערכת ונתוני האבחונים שלהם</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary text-white">
                <Plus className="h-4 w-4 ml-2" />
                הוסף ילד חדש
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>הוספת ילד חדש</DialogTitle>
                <DialogDescription>
                  הזן את פרטי הילד כדי להוסיפו למערכת
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">שם מלא</Label>
                  <Input
                    id="name"
                    value={newChild.name}
                    onChange={(e) => setNewChild({...newChild, name: e.target.value})}
                    placeholder="שם פרטי ושם משפחה"
                  />
                </div>
                
                <div>
                  <Label>תאריך לידה</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !newChild.dateOfBirth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {newChild.dateOfBirth ? (
                          format(newChild.dateOfBirth, "dd/MM/yyyy", { locale: he })
                        ) : (
                          <span>בחר תאריך לידה</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newChild.dateOfBirth}
                        onSelect={(date) => setNewChild({...newChild, dateOfBirth: date})}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2000-01-01")
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button onClick={addChild} className="flex-1">
                    הוסף ילד
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    className="flex-1"
                  >
                    ביטול
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם ילד..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{children.length}</div>
                <div className="text-sm text-muted-foreground">סה"כ ילדים</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-info">
                  {children.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">אבחונים פעילים</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {children.filter(c => c.status === 'completed').length}
                </div>
                <div className="text-sm text-muted-foreground">אבחונים הושלמו</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {children.filter(c => c.status === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">ממתינים לאבחון</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Children List */}
        <Card>
          <CardHeader>
            <CardTitle>רשימת ילדים</CardTitle>
            <CardDescription>
              כל הילדים במערכת עם סטטוס האבחונים שלהם
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredChildren.map((child) => (
                <div key={child.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-foreground">{child.name}</h4>
                      {getStatusBadge(child.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <span>גיל: {child.age} שנים</span>
                      <span>תאריך לידה: {new Date(child.date_of_birth).toLocaleDateString('he-IL')}</span>
                      <span>מספר אבחונים: {child.assessmentsCount}</span>
                      {child.lastAssessment && (
                        <span>אבחון אחרון: {new Date(child.lastAssessment).toLocaleDateString('he-IL')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // TODO: Implement edit child functionality
                        toast({
                          title: "בפיתוח",
                          description: "עריכת פרטי ילד תהיה זמינה בקרוב",
                        });
                      }}
                    >
                      <Edit className="h-4 w-4 ml-1" />
                      עריכה
                    </Button>
                    <Link to="/assessment">
                      <Button variant="secondary" size="sm">
                        <FileText className="h-4 w-4 ml-1" />
                        אבחון חדש
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        // TODO: Implement more options
                        toast({
                          title: "בפיתוח",
                          description: "אפשרויות נוספות יהיו זמינות בקרוב",
                        });
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredChildren.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm ? "לא נמצאו תוצאות" : "אין ילדים במערכת"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "נסה לשנות את מילות החיפוש" : "התחל על ידי הוספת ילד חדש למערכת"}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-gradient-to-r from-primary to-secondary text-white"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף ילד חדש
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Children;