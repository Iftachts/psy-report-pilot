import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowRight } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-6" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 bg-muted rounded-full flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground">404</span>
          </div>
          <CardTitle className="text-2xl">העמוד לא נמצא</CardTitle>
          <CardDescription>
            העמוד שחיפשת אינו קיים במערכת
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            ייתכן שהקישור שגוי או שהעמוד הוסר מהמערכת
          </p>
          <div className="flex gap-3">
            <Link to="/" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-primary to-secondary text-white">
                <Home className="h-4 w-4 ml-2" />
                חזור לדף הבית
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              חזור אחורה
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
